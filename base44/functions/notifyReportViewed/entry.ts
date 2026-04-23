import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportId, viewerEmail } = await req.json();

    if (!reportId) {
      return Response.json({ error: 'Missing reportId' }, { status: 400 });
    }

    const reports = await base44.asServiceRole.entities.Report.filter({ id: reportId });
    const report = reports?.[0];
    if (!report) {
      return Response.json({ error: 'Report not found' }, { status: 404 });
    }

    // Only notify if there's a submitter to notify
    const submitterEmail = report.sentBy;
    if (!submitterEmail) {
      return Response.json({ skipped: true, reason: 'No submitter email on report' });
    }

    // Don't notify if the submitter is viewing their own report
    if (submitterEmail.toLowerCase() === viewerEmail?.toLowerCase()) {
      return Response.json({ skipped: true, reason: 'Submitter viewed their own report' });
    }

    const viewedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const viewer = viewerEmail || 'Someone';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: submitterEmail,
      from_name: 'Asset Wolf',
      subject: `👁 Your report was viewed — ${report.itemName}`,
      body: `
Hi,

Your asset report was just opened by a recipient.

━━━━━━━━━━━━━━━━━━━━━━━━
Asset: ${report.itemName}
Type:  ${report.itemType || '—'}
Action: ${report.action}
Branch: ${report.branch}
${report.assetNumber ? `Asset #: ${report.assetNumber}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━

Viewed by: ${viewer}
Viewed at: ${viewedAt} (Central Time)

— Asset Wolf · Rental World
      `.trim(),
    });

    return Response.json({ sent: true, to: submitterEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});