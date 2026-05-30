import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sends an SMS with the clock-in link to temp/event/hourly workers.
// Called manually or by automation when a Timesheet record is created.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { phone, staffName, branch, workDate } = await req.json();

    if (!phone) {
      return Response.json({ error: 'Phone number required' }, { status: 400 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      return Response.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    // Normalize phone number
    let to = phone.replace(/\D/g, '');
    if (to.length === 10) to = '+1' + to;
    else if (!to.startsWith('+')) to = '+' + to;

    const dateLabel = workDate || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const branchLabel = branch ? ` — ${branch}` : '';

    const body = `Hi ${staffName || 'there'}! Tap to clock in for your shift${branchLabel} on ${dateLabel}: https://rentalworld.base44.app/clockin\n\nReply STOP to opt out.`;

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: twilioPhone, To: to, Body: body }).toString(),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('[sendClockInLink] Twilio error:', result);
      return Response.json({ error: result.message || 'SMS failed' }, { status: 502 });
    }

    console.log('[sendClockInLink] SMS sent to', to, '— SID:', result.sid);
    return Response.json({ success: true, sid: result.sid });

  } catch (error) {
    console.error('[sendClockInLink]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});