import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find excavator reports
    const reports = await base44.entities.Report.filter({ itemType: 'Excavator' });
    
    // Mark all excavator reports as deleted
    for (const report of reports) {
      if (!report.isDeleted) {
        await base44.entities.Report.update(report.id, { isDeleted: true });
      }
    }

    return Response.json({ success: true, deletedCount: reports.filter(r => !r.isDeleted).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});