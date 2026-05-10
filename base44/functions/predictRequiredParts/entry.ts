import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workOrderId, equipmentId } = await req.json();

    const [wo, equipment, maintenanceLogs, partRequirements] = await Promise.all([
      base44.entities.WorkOrder.filter({ id: workOrderId }),
      base44.entities.Equipment.filter({ id: equipmentId }),
      base44.entities.MaintenanceLog.list('-completedDate', 500),
      base44.entities.PartRequirement.list('-created_date', 500),
    ]);

    if (!wo || wo.length === 0) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    const workOrder = wo[0];
    const eq = equipment[0];

    // Find similar past repairs on this equipment
    const pastRepairs = maintenanceLogs.filter(log =>
      log.equipmentId === equipmentId &&
      log.status === 'completed' &&
      log.type === 'repair'
    ).sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));

    // Extract parts from past repairs
    const partsFrequency = {};
    pastRepairs.forEach(repair => {
      if (repair.partsUsed) {
        const parts = repair.partsUsed.split(',').map(p => p.trim());
        parts.forEach(part => {
          partsFrequency[part] = (partsFrequency[part] || 0) + 1;
        });
      }
    });

    // Predict parts: those appearing in 2+ recent repairs
    const predicted = Object.entries(partsFrequency)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([partName]) => ({
        partName,
        suggestedByCategoryFrequency: true,
      }));

    // Also check for parts commonly ordered for this equipment category
    if (eq && eq.category) {
      const categoryParts = maintenanceLogs
        .filter(log => log.type === 'repair' && log.type === workOrder.type)
        .reduce((acc, log) => {
          if (log.partsUsed) {
            log.partsUsed.split(',').forEach(p => acc.add(p.trim()));
          }
          return acc;
        }, new Set());

      categoryParts.forEach(partName => {
        if (!predicted.find(p => p.partName === partName)) {
          predicted.push({ partName, suggestedByEquipmentType: true });
        }
      });
    }

    return Response.json({
      workOrderId,
      equipmentId,
      predictedParts: predicted.slice(0, 10),
      confidenceLevel: predicted.length > 0 ? 'high' : 'low',
    });
  } catch (error) {
    console.error('Error in predictRequiredParts:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});