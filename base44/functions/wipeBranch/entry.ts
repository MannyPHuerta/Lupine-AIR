import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Admin-only function: Delete all data for a specific branch.
 * Used to reset a demo branch between prospect tours.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { branch } = await req.json();
    if (!branch) {
      return Response.json({ error: 'branch parameter required' }, { status: 400 });
    }

    const service = base44.asServiceRole;
    const entityNames = [
      'Rental', 'Delivery', 'WorkOrder', 'MaintenanceLog', 'Expense',
      'Recovery', 'BranchSettings', 'AvailabilityConfig', 'DeliveryMatrix',
      'DiscountLog', 'AuditLog'
    ];

    let totalDeleted = 0;

    for (const entity of entityNames) {
      const records = await service.entities[entity].filter({ branch }, null, 1000);
      if (records.length > 0) {
        for (const rec of records) {
          await service.entities[entity].delete(rec.id);
        }
        totalDeleted += records.length;
      }
    }

    return Response.json({ 
      message: `Branch "${branch}" wiped successfully`,
      recordsDeleted: totalDeleted 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});