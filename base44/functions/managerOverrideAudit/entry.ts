/**
 * managerOverrideAudit — called explicitly from the frontend whenever a manager-level
 * override is used: waived deposit, blacklist bypass, discount > 20%, manual price edit.
 *
 * Creates an immutable AuditLog entry AND emails the owner/fraud alert list.
 *
 * Payload: {
 *   overrideType: 'waived_deposit' | 'blacklist_bypass' | 'manual_discount' | 'price_override' | 'status_override',
 *   rentalId: string,
 *   managerId: string,      // user ID of manager approving
 *   managerName: string,
 *   managerEmail: string,
 *   employeeId: string,     // user ID of counter staff who requested
 *   employeeName: string,
 *   employeeEmail: string,
 *   branch: string,
 *   customerName: string,
 *   equipmentName: string,
 *   invoiceNumber: string,
 *   originalValue: any,
 *   newValue: any,
 *   reason: string,
 * }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      overrideType, rentalId, managerName, managerEmail,
      employeeName, employeeEmail,
      branch, customerName, equipmentName, invoiceNumber,
      originalValue, newValue, reason,
    } = body;

    if (!overrideType || !rentalId) {
      return Response.json({ error: 'overrideType and rentalId required' }, { status: 400 });
    }

    const overrideLabels = {
      waived_deposit: 'Deposit Waived',
      blacklist_bypass: 'Blacklist Override',
      manual_discount: 'Manual Discount Applied',
      price_override: 'Price Override',
      status_override: 'Status Override',
    };

    const now = new Date().toISOString();
    const label = overrideLabels[overrideType] || overrideType;

    // Write immutable audit entry
    await base44.asServiceRole.entities.AuditLog.create({
      action: `manager_override_${overrideType}`,
      entityName: 'Rental',
      entityId: rentalId,
      entityLabel: `${customerName || '?'} — ${equipmentName || '?'}`,
      performedBy: managerEmail || user.email,
      performedAt: now,
      branch: branch || '?',
      reason: reason || 'No reason provided',
      changes: {
        overrideType,
        label,
        manager: managerName || managerEmail,
        employee: employeeName || employeeEmail,
        originalValue,
        newValue,
        invoiceNumber: invoiceNumber || null,
      },
    });

    // Email the fraud alert list
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0] || {};
    const alertEmails = settings.fraudAlertEmails || settings.geofenceAlertEmails || [];

    // Also email all admins
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminEmails = allUsers.filter(u => u.role === 'admin' && u.email).map(u => u.email);
    const toList = [...new Set([...alertEmails, ...adminEmails])];

    if (toList.length > 0) {
      const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
      const subject = `📋 [${branch}] Manager Override: ${label} — by ${managerName || managerEmail}`;
      const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#1e293b;border:1px solid #6366f1;border-radius:12px;padding:24px;">
    <div style="color:#818cf8;font-size:12px;font-weight:700;margin-bottom:4px;">MANAGER OVERRIDE AUDIT TRAIL</div>
    <div style="color:#f1f5f9;font-size:18px;font-weight:800;margin-bottom:4px;">${label}</div>
    <div style="color:#64748b;font-size:12px;margin-bottom:20px;">${new Date(now).toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT</div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${[
        ['Branch', branch || '—'],
        ['Override Type', label],
        ['Authorizing Manager', `<strong style="color:#f1f5f9">${managerName || managerEmail || '—'}</strong>`],
        ['Counter Employee', `${employeeName || employeeEmail || '—'}`],
        ['Customer', customerName || '—'],
        ['Equipment', equipmentName || '—'],
        ['Invoice', invoiceNumber || 'None assigned'],
        ['Original Value', String(originalValue ?? '—')],
        ['New Value', `<strong style="color:#fbbf24">${String(newValue ?? '—')}</strong>`],
        ['Reason Given', reason || 'None provided'],
      ].map(([k, v]) => `
        <tr>
          <td style="padding:6px 10px;color:#64748b;font-size:12px;width:40%;border-bottom:1px solid #334155;">${k}</td>
          <td style="padding:6px 10px;color:#e2e8f0;font-size:13px;border-bottom:1px solid #334155;">${v}</td>
        </tr>`).join('')}
    </table>

    <div style="background:#0f172a;border-radius:8px;padding:12px;color:#64748b;font-size:11px;">
      This is an immutable audit record. Log in to AIReports → Audit Logs to view the full trail.
    </div>
  </div>
</div></body></html>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'AIReports Audit <reports@lupine.rental>', to: toList, subject, html }),
      });
    }

    console.log(`managerOverrideAudit: logged ${overrideType} for rental ${rentalId} by ${managerEmail}`);
    return Response.json({ success: true, overrideType, auditWritten: true, notified: toList.length });

  } catch (error) {
    console.error('managerOverrideAudit error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});