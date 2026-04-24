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

    const { event } = await req.json();
    const { entity_name, entity_id, type } = event;

    if (!entity_id || !entity_name || entity_name !== 'Report') {
      return Response.json({ error: 'Invalid automation payload' }, { status: 400 });
    }

    const report = await base44.asServiceRole.entities.Report.get(entity_id);
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    const staffPhones = await base44.asServiceRole.entities.StaffPhone.list();
    const phoneMap = {};
    staffPhones.forEach(sp => {
      phoneMap[sp.email] = sp.phone;
    });

    const reportLink = `${Deno.env.get('APP_URL') || 'https://assetwolf.rentalworld.com'}/report/${entity_id}`;
    let messages = [];

    if (type === 'create' && report.action === 'Need Quote for Customer') {
      // New quote request → notify staff
      const staffEmails = ['awolf@rentalworld.com', 'ealfaro@rentalworld.com', 'dfulcher@rentalworld.com', 'brucewolf@rentalworld.com', 'bwolf@rentalworld.com'];
      const subject = `New Quote Request: ${report.itemName}`;
      const emailBody = `A new quote request has been submitted:\n\nItem: ${report.itemName}\nType: ${report.itemType}\nModel: ${report.model}\n\nView report: ${reportLink}`;

      for (const email of staffEmails) {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject,
          body: emailBody,
          from_name: 'Asset Wolf'
        });

        const phone = phoneMap[email];
        if (phone) {
          messages.push(
            twilioClient.messages.create({
              from: TWILIO_PHONE,
              to: phone,
              body: `New quote request: ${report.itemName}. View: ${reportLink}`
            })
          );
        }
      }
    } else if (type === 'update' && report.askingPrice) {
      // Price entered → notify original sender (if known)
      if (report.sentBy) {
        const subject = `Quote Ready: ${report.itemName}`;
        const emailBody = `The asking price for ${report.itemName} is: $${report.askingPrice}\n\nView report: ${reportLink}`;

        await base44.integrations.Core.SendEmail({
          to: report.sentBy,
          subject,
          body: emailBody,
          from_name: 'Asset Wolf'
        });

        const phone = phoneMap[report.sentBy];
        if (phone) {
          messages.push(
            twilioClient.messages.create({
              from: TWILIO_PHONE,
              to: phone,
              body: `Quote ready for ${report.itemName}: $${report.askingPrice}. View: ${reportLink}`
            })
          );
        }
      }
    }

    await Promise.all(messages);
    return Response.json({ success: true, type, smsCount: messages.length });
  } catch (error) {
    console.error('sendNotifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});