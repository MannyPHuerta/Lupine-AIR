/**
 * fraudAlertWatcher — fires on every Rental create/update.
 * Checks for 4 real-time fraud signals and fires immediate SMS + email alerts
 * to configured fraud alert contacts, naming the responsible employee.
 *
 * Signals:
 *  1. Rental goes active (out/contract) with no invoice number
 *  2. Blacklisted customer has a rental created/updated into active status
 *  3. Discount > 30% applied (amountPaid < baseAmount * 0.70)
 *  4. Same equipment cancelled + new rental same day (refund skimming)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@4.20.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const eventType = body.event?.type;
    const rentalId  = body.event?.entity_id;
    const rental    = body.data;
    const oldRental = body.old_data;

    if (!rental || !rentalId) {
      return Response.json({ skipped: true, reason: 'no rental data' });
    }

    // Load settings for alert contacts
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0] || {};
    const alertPhones = settings.fraudAlertPhones || settings.geofenceAlertPhones || [];
    const alertEmails = settings.fraudAlertEmails || settings.geofenceAlertEmails || [];

    if (alertPhones.length === 0 && alertEmails.length === 0) {
      console.log('No fraud alert contacts configured, skipping.');
      return Response.json({ skipped: true, reason: 'no alert contacts' });
    }

    // Resolve responsible employee — created_by_id → User lookup
    let employeeName = rental.created_by || 'Unknown Employee';
    let employeeEmail = rental.created_by || '';
    try {
      if (rental.created_by_id) {
        const users = await base44.asServiceRole.entities.User.list();
        const emp = users.find(u => u.id === rental.created_by_id);
        if (emp) {
          employeeName = emp.full_name || emp.email || employeeName;
          employeeEmail = emp.email || '';
        }
      }
    } catch(e) { /* non-fatal */ }

    const alerts = [];
    const branch = rental.branch || '?';
    const customer = rental.customerName || 'Unknown Customer';
    const invoice = rental.invoiceNumber || 'NO INVOICE';
    const amt = rental.baseAmount ? `$${Number(rental.baseAmount).toFixed(2)}` : '$0';
    const paid = rental.amountPaid != null ? `$${Number(rental.amountPaid).toFixed(2)}` : null;

    // ── Signal 1: Active rental with no invoice number ──────────────────────
    const isNowActive = ['out', 'contract'].includes(rental.status);
    const wasNotActive = !oldRental || !['out', 'contract'].includes(oldRental.status);
    if (isNowActive && wasNotActive && !rental.invoiceNumber) {
      alerts.push({
        severity: 'HIGH',
        code: 'NO_INVOICE',
        subject: `🚨 [${branch}] Active rental — NO INVOICE — ${employeeName}`,
        message: `CASH INVOICE SUPPRESSION ALERT\n\nBranch: ${branch}\nEmployee: ${employeeName} (${employeeEmail})\nCustomer: ${customer}\nEquipment: ${rental.equipmentName || rental.equipmentId}\nAmount: ${amt}\nStatus: ${rental.status}\nRental ID: ${rentalId}\n\nA rental was moved to active status WITHOUT an invoice number. Possible cash diversion — verify immediately.`,
        sms: `🚨 NO INVOICE ALERT [${branch}] Employee: ${employeeName} | Customer: ${customer} | ${amt} | Status: ${rental.status}. Possible cash diversion. Check AIReports now.`,
      });
    }

    // ── Signal 2: Blacklisted customer ────────────────────────────────────
    if (eventType === 'create' || (isNowActive && wasNotActive)) {
      try {
        if (rental.customerId) {
          const cust = await base44.asServiceRole.entities.Customer.get(rental.customerId);
          if (cust?.blacklisted) {
            alerts.push({
              severity: 'CRITICAL',
              code: 'BLACKLISTED_CUSTOMER',
              subject: `🚫 [${branch}] BLACKLISTED customer rented — ${employeeName}`,
              message: `BLACKLISTED CUSTOMER ALERT\n\nBranch: ${branch}\nEmployee: ${employeeName} (${employeeEmail})\nCustomer: ${customer}\nBlacklist Reason: ${cust.blacklistReason || 'No reason recorded'}\nEquipment: ${rental.equipmentName || rental.equipmentId}\nInvoice: ${invoice}\nAmount: ${amt}\n\nA blacklisted customer was given equipment. This requires immediate manager review.`,
              sms: `🚫 BLACKLISTED CUSTOMER [${branch}] Employee: ${employeeName} | Customer: ${customer} (BLACKLISTED) | ${amt}. Immediate review required.`,
            });
          }
        }
      } catch(e) { console.error('Blacklist check failed:', e.message); }
    }

    // ── Signal 3: Deep discount (>30% off) ────────────────────────────────
    const base = rental.baseAmount || 0;
    const paid_n = rental.amountPaid != null ? Number(rental.amountPaid) : null;
    const oldPaid = oldRental?.amountPaid != null ? Number(oldRental.amountPaid) : null;
    const discountJustApplied = paid_n != null && paid_n !== oldPaid;
    if (discountJustApplied && base > 0 && paid_n < base * 0.70 && rental.status !== 'cancelled') {
      const discountPct = Math.round((1 - paid_n / base) * 100);
      alerts.push({
        severity: 'HIGH',
        code: 'DEEP_DISCOUNT',
        subject: `⚠️ [${branch}] ${discountPct}% discount applied — ${employeeName}`,
        message: `UNAUTHORIZED DISCOUNT ALERT\n\nBranch: ${branch}\nEmployee: ${employeeName} (${employeeEmail})\nCustomer: ${customer}\nEquipment: ${rental.equipmentName || rental.equipmentId}\nInvoice: ${invoice}\nFull Amount: ${amt}\nAmount Paid: ${paid}\nDiscount: ${discountPct}%\n\nA discount exceeding 30% was applied. Verify manager authorization.`,
        sms: `⚠️ ${discountPct}% DISCOUNT [${branch}] Employee: ${employeeName} | Customer: ${customer} | ${amt} → ${paid}. Verify authorization.`,
      });
    }

    // ── Signal 4: Same-equipment cancel + re-rent same day (refund skimming) ─
    if (eventType === 'create' && rental.equipmentId && rental.status !== 'cancelled') {
      try {
        const today = new Date().toISOString().split('T')[0];
        const recentRentals = await base44.asServiceRole.entities.Rental.filter({
          equipmentId: rental.equipmentId,
          status: 'cancelled',
        });
        const sameDayCancel = recentRentals.find(r =>
          r.id !== rentalId &&
          r.created_date &&
          r.created_date.startsWith(today)
        );
        if (sameDayCancel) {
          const cancelEmp = sameDayCancel.created_by || 'Unknown';
          alerts.push({
            severity: 'HIGH',
            code: 'CANCEL_RESELL',
            subject: `🔄 [${branch}] Cancel + same-day re-rent — ${employeeName}`,
            message: `REFUND SKIMMING ALERT\n\nBranch: ${branch}\nEmployee (new rental): ${employeeName} (${employeeEmail})\nCancelled Rental ID: ${sameDayCancel.id} (by ${cancelEmp})\nNew Rental ID: ${rentalId}\nCustomer: ${customer}\nEquipment: ${rental.equipmentName || rental.equipmentId}\nInvoice: ${invoice}\nAmount: ${amt}\n\nThe same equipment was cancelled and re-rented on the same day. This is a known refund skimming pattern.`,
            sms: `🔄 CANCEL+RESELL [${branch}] Employee: ${employeeName} | ${rental.equipmentName || 'Equipment'} cancelled then re-rented same day. Possible skimming.`,
          });
        }
      } catch(e) { console.error('Cancel/resell check failed:', e.message); }
    }

    if (alerts.length === 0) {
      return Response.json({ clean: true, rentalId });
    }

    // ── Send alerts ──────────────────────────────────────────────────────────
    const twilioClient = twilio(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN')
    );
    const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');

    for (const alert of alerts) {
      console.log(`FRAUD ALERT [${alert.code}]: ${alert.subject}`);

      // SMS
      for (const phone of alertPhones) {
        try {
          await twilioClient.messages.create({
            from: TWILIO_PHONE,
            to: phone,
            body: alert.sms.slice(0, 1600),
          });
        } catch(e) { console.error('SMS failed to', phone, e.message); }
      }

      // Email
      if (alertEmails.length > 0) {
        const severityColor = alert.severity === 'CRITICAL' ? '#ef4444' : '#f97316';
        const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1e293b;border:2px solid ${severityColor};border-radius:12px;padding:24px;">
    <div style="color:${severityColor};font-size:20px;font-weight:800;margin-bottom:6px;">${alert.subject}</div>
    <div style="color:#64748b;font-size:12px;margin-bottom:20px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT · Auto-generated by AIReports Fraud Watcher</div>
    <pre style="color:#e2e8f0;font-size:13px;line-height:1.7;white-space:pre-wrap;font-family:Arial,sans-serif;">${alert.message}</pre>
    <div style="margin-top:20px;padding:12px;background:#0f172a;border-radius:8px;color:#64748b;font-size:11px;">
      Log in to AIReports → Rental History or Fraud Intel to review this transaction.
    </div>
  </div>
</div></body></html>`;
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'AIReports Fraud Watch <reports@lupine.rental>',
              to: alertEmails,
              subject: alert.subject,
              html,
            }),
          });
        } catch(e) { console.error('Email failed:', e.message); }
      }

      // Write immutable AuditLog entry for every alert
      try {
        await base44.asServiceRole.entities.AuditLog.create({
          action: `fraud_alert_${alert.code.toLowerCase()}`,
          entityName: 'Rental',
          entityId: rentalId,
          entityLabel: `${customer} — ${rental.equipmentName || ''}`,
          performedBy: employeeEmail || 'system',
          performedAt: new Date().toISOString(),
          branch: branch,
          reason: alert.subject,
          changes: {
            alertCode: alert.code,
            severity: alert.severity,
            employeeName,
            employeeEmail,
            rentalStatus: rental.status,
            invoiceNumber: rental.invoiceNumber || null,
            baseAmount: rental.baseAmount,
            amountPaid: rental.amountPaid,
          },
        });
      } catch(e) { console.error('AuditLog write failed:', e.message); }
    }

    return Response.json({ alertsFired: alerts.length, codes: alerts.map(a => a.code), rentalId });

  } catch (error) {
    console.error('fraudAlertWatcher error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});