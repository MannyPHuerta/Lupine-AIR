import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    console.log('[sendRentalConfirmation] START');
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      console.log('[sendRentalConfirmation] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rentalIds, customerEmail, customerPhone, invoiceNumber, autoSendCommunications } = await req.json();
    console.log('[sendRentalConfirmation] Payload:', { rentalIds, customerEmail, autoSendCommunications });

    if (!autoSendCommunications || !customerEmail) {
      console.log('[sendRentalConfirmation] Skipped (no auto-send or email)');
      return Response.json({ success: true, skipped: true });
    }

    if (!rentalIds || rentalIds.length === 0) {
      console.log('[sendRentalConfirmation] No rental IDs');
      return Response.json({ error: 'No rental IDs provided' }, { status: 400 });
    }

    // Fetch rental details using service role
    console.log('[sendRentalConfirmation] Fetching rentals:', rentalIds);
    const rentals = await base44.asServiceRole.entities.Rental.filter(
      { id: { $in: rentalIds } }
    );
    console.log('[sendRentalConfirmation] Fetched rentals:', rentals.length);

    if (!rentals || rentals.length === 0) {
      console.log('[sendRentalConfirmation] No rentals found');
      return Response.json({ error: 'Rentals not found' }, { status: 404 });
    }

    const rental = rentals[0];

    // Build email body
    const equipmentList = rentals.map(r => `${r.equipmentName} (${r.startDate} to ${r.endDate})`).join('\n  • ');
    const total = rentals.reduce((sum, r) => sum + (r.baseAmount || 0) + (r.taxAmount || 0) + (r.deposit || 0), 0);

    const emailBody = `Hello ${rental.customerName},

Your rental invoice has been confirmed.

Invoice: ${invoiceNumber}
Date: ${new Date().toLocaleDateString('en-US')}

Equipment:
  • ${equipmentList}

Total Due: $${total.toFixed(2)}

Thank you for your business!

Rental World Equipment`;

    // Send email
    console.log('[sendRentalConfirmation] Sending email to:', customerEmail);
    await base44.integrations.Core.SendEmail({
      to: customerEmail,
      subject: `Rental Confirmation - Invoice ${invoiceNumber}`,
      body: emailBody,
      from_name: 'Rental World Equipment',
    });
    console.log('[sendRentalConfirmation] Email sent');

    // Try to send SMS if phone number and Twilio credentials exist
    if (customerPhone) {
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

        if (accountSid && authToken && twilioPhone) {
          const smsBody = `Rental confirmed! Invoice ${invoiceNumber}. Equipment rentals for ${rental.customerName}. Total: $${total.toFixed(2)}. Thank you!`;

          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: twilioPhone,
              To: customerPhone,
              Body: smsBody,
            }).toString(),
          });
        }
      } catch (smsErr) {
        console.log('SMS send skipped (Twilio not configured):', smsErr.message);
      }
    }

    return Response.json({ success: true, emailSent: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});