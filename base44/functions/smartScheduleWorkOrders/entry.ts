import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [workOrders, equipment, rentals] = await Promise.all([
      base44.entities.WorkOrder.list('-createdAt', 500),
      base44.entities.Equipment.list('name', 2000),
      base44.entities.Rental.list('-created_date', 1000),
    ]);

    // Calculate rental frequency for each equipment
    const rentalFrequency = {};
    rentals.forEach(rental => {
      rentalFrequency[rental.equipmentId] = 
        (rentalFrequency[rental.equipmentId] || 0) + 1;
    });

    // Filter open work orders and score them
    const openWOs = workOrders
      .filter(wo => ['scheduled', 'in_progress', 'awaiting_parts'].includes(wo.status))
      .map(wo => {
        const rentCount = rentalFrequency[wo.equipmentId] || 0;
        const eq = equipment.find(e => e.id === wo.equipmentId);
        
        // Prioritize high-utilization equipment
        // High rent count = high priority (want to get frequent-use equipment back in service)
        const utilizationScore = rentCount * 10;
        
        // Downtime cost proxy: high daily rate = high priority
        const dailyRate = eq?.dailyRate || 0;
        const costScore = dailyRate / 10;
        
        // Equipment age: older equipment may be more urgent
        const purchaseAge = eq?.purchaseDate ? 
          Math.floor((Date.now() - new Date(eq.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0;
        const ageScore = purchaseAge * 2;
        
        const totalPriority = utilizationScore + costScore + ageScore;

        return {
          ...wo,
          rentalFrequency: rentCount,
          dailyRate,
          purchaseAge,
          priorityScore: totalPriority,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);

    return Response.json({
      smartSchedule: openWOs,
      totalOpen: openWOs.length,
      topPriority: openWOs[0] || null,
    });
  } catch (error) {
    console.error('Error in smartScheduleWorkOrders:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});