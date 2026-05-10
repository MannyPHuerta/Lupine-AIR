import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [workOrders, maintenanceLogs, equipment, rentals] = await Promise.all([
      base44.entities.WorkOrder.list('-createdAt', 500),
      base44.entities.MaintenanceLog.list('-completedDate', 500),
      base44.entities.Equipment.list('name', 2000),
      base44.entities.Rental.list('-created_date', 1000),
    ]);

    const anomalies = [];

    // 1. High-cost repairs on low-utilization equipment
    const equipmentRentalFrequency = {};
    rentals.forEach(rental => {
      equipmentRentalFrequency[rental.equipmentId] = 
        (equipmentRentalFrequency[rental.equipmentId] || 0) + 1;
    });

    const lowUtilizationHighCost = maintenanceLogs
      .filter(log => log.status === 'completed' && log.cost > 500)
      .forEach(log => {
        const rentalCount = equipmentRentalFrequency[log.equipmentId] || 0;
        if (rentalCount < 5) {
          const eq = equipment.find(e => e.id === log.equipmentId);
          anomalies.push({
            type: 'low_utilization_high_cost',
            severity: 'medium',
            equipmentId: log.equipmentId,
            equipmentName: eq?.name || log.equipmentName,
            cost: log.cost,
            rentalCount,
            message: `Equipment rented only ${rentalCount}x but repair cost $${log.cost}. Consider selling or retiring.`,
          });
        }
      });

    // 2. Recurring failures: same equipment repaired 3+ times in 90 days
    const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const equipmentRepairCounts = {};
    maintenanceLogs
      .filter(log => new Date(log.completedDate) > last90Days && log.status === 'completed')
      .forEach(log => {
        equipmentRepairCounts[log.equipmentId] = 
          (equipmentRepairCounts[log.equipmentId] || 0) + 1;
      });

    Object.entries(equipmentRepairCounts).forEach(([equipmentId, count]) => {
      if (count >= 3) {
        const eq = equipment.find(e => e.id === equipmentId);
        anomalies.push({
          type: 'recurring_failures',
          severity: 'high',
          equipmentId,
          equipmentName: eq?.name,
          repairCount: count,
          message: `${eq?.name || 'Equipment'} repaired ${count} times in 90 days. Potential systemic issue.`,
        });
      }
    });

    // 3. Cost outliers: repairs 2x average for equipment category
    const costByCategory = {};
    const countByCategory = {};
    maintenanceLogs
      .filter(log => log.status === 'completed' && log.cost)
      .forEach(log => {
        const eq = equipment.find(e => e.id === log.equipmentId);
        const cat = eq?.category || 'unknown';
        costByCategory[cat] = (costByCategory[cat] || 0) + log.cost;
        countByCategory[cat] = (countByCategory[cat] || 0) + 1;
      });

    const avgCostByCategory = {};
    Object.keys(costByCategory).forEach(cat => {
      avgCostByCategory[cat] = costByCategory[cat] / countByCategory[cat];
    });

    maintenanceLogs
      .filter(log => log.status === 'completed' && log.cost)
      .forEach(log => {
        const eq = equipment.find(e => e.id === log.equipmentId);
        const cat = eq?.category || 'unknown';
        const avgCost = avgCostByCategory[cat] || 0;
        if (log.cost > avgCost * 2) {
          anomalies.push({
            type: 'cost_outlier',
            severity: 'low',
            equipmentId: log.equipmentId,
            equipmentName: eq?.name,
            cost: log.cost,
            categoryAverage: Math.round(avgCost),
            message: `Repair cost $${log.cost} is ${(log.cost / avgCost).toFixed(1)}x category average.`,
          });
        }
      });

    // Deduplicate by equipmentId
    const uniqueAnomalies = Array.from(
      new Map(anomalies.map(a => [a.equipmentId + a.type, a])).values()
    ).sort((a, b) => {
      const severityMap = { high: 0, medium: 1, low: 2 };
      return severityMap[a.severity] - severityMap[b.severity];
    });

    return Response.json({
      anomalies: uniqueAnomalies.slice(0, 20),
      totalDetected: uniqueAnomalies.length,
    });
  } catch (error) {
    console.error('Error in detectRepairAnomalies:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});