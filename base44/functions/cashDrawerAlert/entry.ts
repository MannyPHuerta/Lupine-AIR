/**
 * cashDrawerAlert — fires on CashDrawer update.
 * When a drawer closes with a variance exceeding the threshold,
 * sends SMS + email to fraud alert contacts and writes an AuditLog entry.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@4.20.0';

const VARIANCE_THRESHOLD = 10; // dollars — alert if short more than this

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const drawer = body.data;
    const oldDrawer = body.old_data;

    if (!drawer) return Response.json({ skipped: true, reason: 'no drawer data' });

    // Only fire when status just changed to 'closed'
    const justClosed = drawer.status === 'closed' && oldDrawer?.status === 'open';
    if (!justClosed) return Response.json({ skipped: true, reason: 'not a close event' });

    const variance = drawer.variance ?? 0;

    // Only alert if meaningfully short (negative variance beyond threshold)
    if (variance >= -VARIANCE_THRESHOLD) {
      return Response.json({ skipped: true, reason: `variance ${variance} within threshold` });
    }

    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0] || {};
    const alertPhones = settings.fraudAlertPhones || settings.geofenceAlertPhones || [];
    const alertEmails = settings.fraudAlertEmails || settings.geofenceAlertEmails || [];

    if (alertPhones.length === 0 && alertEmails.length === 0) {
      return Response.json({ skipped: true, reason: 'no alert contacts' });
    }

    const branch = drawer.branch || '?';
    const openedBy = drawer.openedBy || 'Unknown';
    const closedBy = drawer.closedBy || 'Unknown';
    const absVariance = Math.abs(variance).toFixed(2);
    const attendants = (drawer.attendantLog || []).map(a => a.email).join(', ') || 'None logged';

    const smsBody = `⚠️ CASH SHORTAGE [${branch}] Drawer closed $${absVariance} SHORT. Opened: ${openedBy} | Closed: ${closedBy} | Attendants: ${attendants}. Review required.`;

    const htmlBody = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1e293b;border:2px solid #ef4444;border-radius:12px;padding:24px;">
    <div style="color:#ef4444;font-size:20px;font-weight:800;margin-bottom:6px;">⚠️ Cash Drawer Short — ${branch}</div>
    <div style="color:#64748b;font-size:12px;margin-bottom:20px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</div>
    <table style="width:100%;color:#e2e8f0;font-size:14px;line-height:2;">
      <tr><td style="color:#94a3b8;">Branch</td><td><b>${branch}</b></td></tr>
      <tr><td style="color:#94a3b8;">Shift</td><td>${drawer.shiftLabel} · ${drawer.shiftDate}</td></tr>
      <tr><td style="color:#94a3b8;">Opened By</td><td>${openedBy}</td></tr>
      <tr><td style="color:#94a3b8;">Closed By</td><td>${closedBy}</td></tr>
      <tr><td style="color:#94a3b8;">Attendants</td><td>${attendants}</td></tr>
      <tr><td style="color:#94a3b8;">Expected Cash</td><td>$${(drawer.expectedCash || 0).toFixed(2)}</td></tr>
      <tr><td style="color:#94a3b8;">Counted Cash</td><td>$${(drawer.countedCash || 0).toFixed(2)}</td></tr>
      <tr><td style="color:#ef4444;font-weight:bold;">Variance</td><td style="color:#ef4444;font-weight:bold;">−$${absVariance}</td></tr>
      ${drawer.closingNotes ? `<tr><td style="color:#94a3b8;">Notes</td><td><i>${drawer.closingNotes}</i></td></tr>` : ''}
    </table>
    <div style="margin-top:20px;padding:12px;background:#0f172a;border-radius:8px;color:#64748b;font-size:11px;">
      Log in to AIReports → Cash Drawer Reconciliation to review and reconcile this drawer.
    </div>
  </div>
</div></body></html>`;

    const twilioClient = twilio(Deno.env.get('TWILIO_ACCOUNT_SID'), Deno.env.get('TWILIO_AUTH_TOKEN'));
    const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');

    for (const phone of alertPhones) {
      try {
        await twilioClient.messages.create({ from: TWILIO_PHONE, to: phone, body: smsBody.slice(0, 1600) });
      } catch (e) { console.error('SMS failed:', e.message); }
    }

    if (alertEmails.length > 0) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'AIReports Cash Watch <reports@lupine.rental>',
            to: alertEmails,
            subject: `⚠️ Cash Drawer Short $${absVariance} — ${branch} (${drawer.shiftDate})`,
            html: htmlBody,
          }),
        });
      } catch (e) { console.error('Email failed:', e.message); }
    }

    // AuditLog entry
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'cash_drawer_short',
      entityName: 'CashDrawer',
      entityId: drawer.id || body.event?.entity_id,
      entityLabel: `${branch} — ${drawer.shiftDate} ${drawer.shiftLabel}`,
      performedBy: closedBy,
      performedAt: new Date().toISOString(),
      branch,
      reason: `Drawer closed $${absVariance} short`,
      changes: {
        openedBy,
        closedBy,
        attendants,
        expectedCash: drawer.expectedCash,
        countedCash: drawer.countedCash,
        variance,
      },
    });

    return Response.json({ alerted: true, variance, branch });

  } catch (error) {
    console.error('cashDrawerAlert error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});