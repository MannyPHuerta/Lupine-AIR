import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

async function sendSMS(to, body) {
  const cleaned = to.replace(/\D/g, '');
  const formatted = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: formatted, From: TWILIO_PHONE_NUMBER, Body: body }),
    }
  );
  return res.json();
}

function toETDate(offsetDays = 0) {
  // Eastern Time: UTC-4 (EDT) or UTC-5 (EST)
  // Use UTC-4 (EDT) as primary since TX spring/summer is EDT
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - 4);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function toLocalDate(offsetDays = 0) {
  const d = new Date();
  // Central Time offset: UTC-5 (CDT) or UTC-6 (CST) — use UTC-6 as safe default
  d.setUTCHours(d.getUTCHours() - 6);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (no auth) and manual admin invocation
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch (_) {
      // Called from scheduler — no user token, use service role
    }

    const today = toETDate(0);
    const tomorrow = toETDate(1);

    // Skip Sundays — some organizations are closed
    const dayOfWeek = new Date(today + 'T12:00:00').getDay(); // 0 = Sunday
    if (dayOfWeek === 0) {
      return Response.json({ skipped: true, reason: 'Sunday — no reminders sent', date: today });
    }

    // Check if SMS reminders are enabled in company settings
    const companySettingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const companySettings = companySettingsList[0];
    if (companySettings && companySettings.smsRemindersEnabled === false) {
      return Response.json({ skipped: true, reason: 'SMS reminders disabled in company settings', date: today });
    }

    // Fetch all active rentals due today or tomorrow
    const allRentals = await base44.asServiceRole.entities.Rental.list('-endDate', 2000);

    const dueTodayOrTomorrow = allRentals.filter(r =>
      (r.endDate === today || r.endDate === tomorrow) &&
      ['out', 'contract'].includes(r.status) &&
      r.customerPhone
    );

    const results = [];
    for (const rental of dueTodayOrTomorrow) {
      const isDueToday = rental.endDate === today;
      const equipmentName = rental.equipmentName || 'your equipment';
      const invoiceRef = rental.invoiceNumber ? ` (Invoice ${rental.invoiceNumber})` : '';

      const message = isDueToday
        ? `Hi ${rental.customerName?.split(' ')[0] || 'there'}, this is a reminder that your rental of ${equipmentName}${invoiceRef} is due back TODAY. Please contact us if you need an extension. Thank you!`
        : `Hi ${rental.customerName?.split(' ')[0] || 'there'}, friendly reminder that your rental of ${equipmentName}${invoiceRef} is due back TOMORROW. Please contact us if you need an extension. Thank you!`;

      // Check if we already sent a reminder for this rental today (stored in notes or a flag)
      // Simple approach: check statusHistory for a reminder sent today
      const alreadySent = (rental.statusHistory || []).some(h =>
        h.note?.startsWith('SMS reminder sent') && h.changedAt?.startsWith(today)
      );

      if (alreadySent) {
        results.push({ rentalId: rental.id, customer: rental.customerName, status: 'already_sent' });
        continue;
      }

      const smsResult = await sendSMS(rental.customerPhone, message);

      // Log the reminder in statusHistory
      const history = rental.statusHistory || [];
      history.push({
        status: rental.status,
        changedAt: new Date().toISOString(),
        changedBy: 'system',
        note: `SMS reminder sent: due ${isDueToday ? 'today' : 'tomorrow'}`,
      });
      await base44.asServiceRole.entities.Rental.update(rental.id, { statusHistory: history });

      results.push({
        rentalId: rental.id,
        customer: rental.customerName,
        phone: rental.customerPhone,
        dueDate: rental.endDate,
        dueWhen: isDueToday ? 'today' : 'tomorrow',
        smsStatus: smsResult.status || smsResult.error_code || 'sent',
      });
    }

    return Response.json({
      date: today,
      checked: dueTodayOrTomorrow.length,
      sent: results.filter(r => r.smsStatus).length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});