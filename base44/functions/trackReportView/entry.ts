import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const { reportId, viewerEmail } = await req.json();

    if (!reportId) {
        return Response.json({ error: 'reportId required' }, { status: 400 });
    }

    try {
        const report = await base44.asServiceRole.entities.Report.get(reportId);

        if (!report) {
            return Response.json({ error: 'Report not found' }, { status: 404 });
        }

        // Only mark as viewed if not already viewed
        if (!report.viewedAt) {
            const now = new Date().toISOString();
            const viewer = viewerEmail || 'external recipient';
            const logEntry = `${now} | Viewed by ${viewer}`;
            const activityLog = [...(report.activityLog || []), logEntry];

            await base44.asServiceRole.entities.Report.update(reportId, {
                viewedAt: now,
                viewedBy: viewer,
                activityLog,
            });

            // Notify the submitter that their report was viewed
            try {
                await base44.asServiceRole.functions.invoke('notifyReportViewed', { reportId, viewerEmail: viewer });
            } catch (_) {
                // Non-fatal — don't fail the view tracking if notification fails
            }
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});