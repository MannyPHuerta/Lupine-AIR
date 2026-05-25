import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITIES = [
  'Equipment', 'Rental', 'Customer', 'Delivery', 'WorkOrder',
  'MaintenanceLog', 'Expense', 'Recovery', 'Report', 'InventoryItem',
  'BranchSettings', 'CompanySettings', 'AvailabilityConfig', 'DeliveryMatrix',
  'VolumeDiscountRule', 'PromoCode', 'DiscountLog', 'AuditLog',
  'RentalAgreement', 'EquipmentCategory', 'MechanicProfile', 'Timesheet',
  'PartRequirement', 'PartsProcurement', 'RFQRecord', 'EventPlan',
  'PredictiveAlert', 'GPSProvider', 'EquipmentGPSLink', 'StaffPhone',
  'DriverLocation', 'PaymentSettings', 'CustomEmail', 'Role'
];

async function fetchAll(entity, base44) {
  const results = [];
  let skip = 0;
  const limit = 200;
  while (true) {
    const page = await base44.asServiceRole.entities[entity].list(null, limit, skip);
    if (!page || page.length === 0) break;
    results.push(...page);
    if (page.length < limit) break;
    skip += limit;
  }
  return results;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      version: '1.0',
      entities: {}
    };

    for (const entityName of ENTITIES) {
      try {
        exportData.entities[entityName] = await fetchAll(entityName, base44);
      } catch (e) {
        exportData.entities[entityName] = { error: e.message };
      }
    }

    const json = JSON.stringify(exportData, null, 2);
    const filename = `air-export-${new Date().toISOString().split('T')[0]}.json`;

    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});