import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import twilio from 'npm:twilio@4.20.0';

const twilioClient = twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID'),
  Deno.env.get('TWILIO_AUTH_TOKEN')
);

const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId, notificationType, recipients } = await req.json();

    if (!reportId || !notificationType || !recipients) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const report = await base44.entities.Report.get(reportId);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Get staff phone numbers
    const staffPhones = await base44.entities.StaffPhone.list();
    const phoneMap = {};
    staffPhones.forEach(sp => {
      phoneMap[sp.email] = sp.phone;
    });

    let messages = [];

    if (notificationType === 'quote_request') {
      // Sender created quote request → notify Staff
      const subject = `New Quote Request: ${report.itemName}`;
      const body = `A new quote request has been submitted:\n\nItem: ${report.itemName}\nType: ${report.itemType}\nModel: ${report.model}\n\nPlease log in to provide pricing.`;

      for (const email of recipients) {
        // Email
        await base44.integrations.Core.SendEmail({
          to: email,
          subject,
          body,
          from_name: 'Asset Wolf'
        });

        // SMS
        const phone = phoneMap[email];
        if (phone) {
          messages.push(
            twilioClient.messages.create({
              from: TWILIO_PHONE,
              to: phone,
              body: `New quote request: ${report.itemName}. Log in to provide pricing.`
            })
          );
        }
      }
    } else if (notificationType === 'price_entered') {
      // Staff entered price → notify Sender
      const subject = `Quote Ready: ${report.itemName}`;
      const body = `The asking price for ${report.itemName} is: $${report.askingPrice}`;

      for (const email of recipients) {
        // Email
        await base44.integrations.Core.SendEmail({
          to: email,
          subject,
          body,
          from_name: 'Asset Wolf'
        });

        // SMS
        const phone = phoneMap[email];
        if (phone) {
          messages.push(
            twilioClient.messages.create({
              from: TWILIO_PHONE,
              to: phone,
              body: `Quote ready for ${report.itemName}: $${report.askingPrice}`
            })
          );
        }
      }
    } else if (notificationType === 'customer_share') {
      // Sender shares with Customer → notify Customer
      const subject = `Equipment Quote: ${report.itemName}`;
      const body = `Asking price: $${report.askingPrice}\n\n${report.comments || ''}`;

      for (const email of recipients) {
        // Email only (customer doesn't have phone on file yet)
        await base44.integrations.Core.SendEmail({
          to: email,
          subject,
          body,
          from_name: 'Asset Wolf'
        });
      }
    }

    // Send all SMS messages in parallel
    await Promise.all(messages);

    return Response.json({ success: true, notificationType, recipientCount: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});