// Initiate a Twilio outbound verification call to a customer phone number
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { phoneNumber, customerId, customerName } = await req.json();
    if (!phoneNumber) return Response.json({ error: 'phoneNumber is required' }, { status: 400 });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    // TwiML: customer hears message and presses 1 to confirm
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="https://demo.twilio.com/welcome/voice/" method="POST" timeout="10">
    <Say voice="alice">Hello, this is A I R Equipment Rental calling to verify your phone number for a rental. Please press 1 to confirm your identity.</Say>
  </Gather>
  <Say voice="alice">We did not receive your input. Goodbye.</Say>
</Response>`;

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const e164Phone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;

    const formData = new URLSearchParams({
      To: e164Phone,
      From: fromNumber,
      Twiml: twiml,
    });

    console.log(`Initiating verification call to ${e164Phone} for customer ${customerName} (${customerId})`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    );

    const data = await response.json();
    console.log('Twilio call response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Twilio error:', data.message);
      return Response.json({ error: data.message || 'Failed to initiate call' }, { status: 500 });
    }

    // Log the call attempt to AuditLog
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'phone_verification_call_initiated',
      entityName: 'Customer',
      entityId: customerId || '',
      entityLabel: customerName || '',
      performedBy: user.email,
      performedAt: new Date().toISOString(),
      changes: { callSid: data.sid, phone: phoneNumber, status: 'initiated' },
    });

    return Response.json({ success: true, callSid: data.sid, status: data.status });
  } catch (error) {
    console.error('verifyCustomerPhone error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});