import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { reportId, deletedBy } = await req.json();
    if (!reportId) {
      return Response.json({ error: 'reportId is required' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const logEntry = `${now} | Hidden (soft-deleted) by ${deletedBy || user.email || "admin"}`;

    const existing = await base44.asServiceRole.entities.Report.get(reportId);
    const activityLog = [...(existing?.activityLog || []), logEntry];

    await base44.asServiceRole.entities.Report.update(reportId, {
      isDeleted: true,
      activityLog,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});