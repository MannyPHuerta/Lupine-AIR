import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Management emails to notify on every new Sell report
const MANAGEMENT_EMAILS = [
  "manny@rentalworld.com",
  "bwolf@rentalworld.com",
  "awolf@rentalworld.com",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Entity automation payload
    const report = payload?.data;
    if (!report) {
      return Response.json({ skipped: true, reason: 'No report data in payload' });
    }

    // Only act on Sell reports
    if (report.action !== 'Sell') {
      return Response.json({ skipped: true, reason: 'Not a Sell report' });
    }

    const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const priceStr = report.askingPrice != null ? `$${Number(report.askingPrice).toLocaleString()}` : 'Not specified';
    const reportLink = `https://app.base44.com/apps/69deb9b2f06f1355a056f8e0/report/${report.id}`;

    // Only send to registered app users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const registeredEmails = allUsers.map(u => u.email.toLowerCase());
    const recipients = MANAGEMENT_EMAILS.filter(e => registeredEmails.includes(e.toLowerCase()));

    for (const email of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'Asset Wolf',
        subject: `🔔 New Sell Report — ${report.itemName} (${report.branch})`,
        body: `
A new asset has been flagged for sale.

━━━━━━━━━━━━━━━━━━━━━━━━
Asset:        ${report.itemName}
Type:         ${report.itemType || '—'}
Model:        ${report.model || '—'}
Serial #:     ${report.serialNumber || '—'}
Asset #:      ${report.assetNumber || '—'}
Branch:       ${report.branch}
Asking Price: ${priceStr}
Condition:    ${report.comments || '—'}
━━━━━━━━━━━━━━━━━━━━━━━━

Submitted by: ${report.sentBy || '—'}
Submitted at: ${submittedAt} (Central Time)

View full report: ${reportLink}

— Asset Wolf · Rental World
        `.trim(),
      });
    }

    return Response.json({ sent: true, count: recipients.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});