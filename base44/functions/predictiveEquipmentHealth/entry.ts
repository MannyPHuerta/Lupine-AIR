import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [equipment, maintenanceLogs, rentals] = await Promise.all([
      base44.asServiceRole.entities.Equipment.list('-updated_date', 2000),
      base44.asServiceRole.entities.MaintenanceLog.list('-completedDate', 500),
      base44.asServiceRole.entities.Rental.list('-created_date', 500),
    ]);

    const now = new Date();
    const alerts = [];

    for (const eq of equipment) {
      if (eq.status === 'retired') continue;

      const eqLogs = maintenanceLogs.filter(l => l.equipmentId === eq.id).sort((a, b) => 
        new Date(b.completedDate || b.scheduledDate) - new Date(a.completedDate || a.scheduledDate)
      );

      const eqRentals = rentals.filter(r => r.equipmentId === eq.id);
      const recentRentals = eqRentals.filter(r => {
        const daysAgo = (now - new Date(r.endDate)) / (1000 * 60 * 60 * 24);
        return daysAgo < 180;
      });

      const lastService = eqLogs[0];
      const daysSinceService = lastService && lastService.completedDate 
        ? Math.floor((now - new Date(lastService.completedDate)) / (1000 * 60 * 60 * 24))
        : null;

      // Alert 1: Maintenance overdue based on service interval
      if (lastService && daysSinceService > 180) {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          category: eq.category,
          alertType: 'maintenance_overdue',
          severity: daysSinceService > 365 ? 'critical' : daysSinceService > 270 ? 'high' : 'medium',
          message: `${eq.name} has not been serviced in ${daysSinceService} days`,
          recommendation: 'Schedule preventive maintenance immediately',
          confidenceScore: 95,
          daysSinceLastService: daysSinceService,
          estimatedDaysUntilFailure: Math.max(7, Math.floor(365 - daysSinceService)),
          branch: eq.location,
          generatedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Alert 2: High utilization pattern
      const rentalDaysLastQuarter = recentRentals.reduce((sum, r) => {
        const days = Math.max(0, (new Date(r.endDate) - new Date(r.startDate)) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);

      if (rentalDaysLastQuarter > 90) {
        const wearFactor = Math.min(100, (rentalDaysLastQuarter / 120) * 100);
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          category: eq.category,
          alertType: 'wear_pattern',
          severity: wearFactor > 90 ? 'high' : 'medium',
          message: `${eq.name} has been in use for ${Math.round(rentalDaysLastQuarter)} days in the last 6 months (high utilization)`,
          recommendation: 'Plan comprehensive inspection and parts replacement',
          confidenceScore: 87,
          daysSinceLastService: daysSinceService,
          estimatedDaysUntilFailure: Math.max(14, Math.floor(180 - rentalDaysLastQuarter)),
          branch: eq.location,
          generatedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Alert 3: Equipment condition degradation
      if (eq.condition === 'Needs Repair' && !eqLogs.some(l => l.status === 'in_progress' || l.status === 'scheduled')) {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          category: eq.category,
          alertType: 'failure_risk',
          severity: 'critical',
          message: `${eq.name} is marked as "Needs Repair" with no active work orders`,
          recommendation: 'Create work order immediately to prevent rental failures',
          confidenceScore: 100,
          daysSinceLastService: daysSinceService,
          estimatedDaysUntilFailure: 3,
          branch: eq.location,
          generatedAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Alert 4: Inspection due (aging equipment)
      if (eq.purchaseDate && new Date(eq.purchaseDate) < new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)) {
        const yearsSincePurchase = Math.floor((now - new Date(eq.purchaseDate)) / (365 * 24 * 60 * 60 * 1000));
        if (yearsSincePurchase > 5 && !eqLogs.some(l => l.type === 'inspection' && (now - new Date(l.completedDate)) < 90 * 24 * 60 * 60 * 1000)) {
          alerts.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            category: eq.category,
            alertType: 'inspection_due',
            severity: 'medium',
            message: `${eq.name} is ${yearsSincePurchase} years old and requires periodic safety inspection`,
            recommendation: 'Schedule comprehensive inspection within 30 days',
            confidenceScore: 92,
            daysSinceLastService: daysSinceService,
            estimatedDaysUntilFailure: 45,
            branch: eq.location,
            generatedAt: now.toISOString(),
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      }
    }

    // Clear expired and resolved alerts
    const existingAlerts = await base44.asServiceRole.entities.PredictiveAlert.filter({ 
      status: 'active' 
    });

    for (const alert of existingAlerts) {
      if (alert.expiresAt && new Date(alert.expiresAt) < now) {
        await base44.asServiceRole.entities.PredictiveAlert.update(alert.id, { 
          status: 'resolved' 
        });
      }
    }

    // Bulk create new alerts (deduplicate)
    const existing = existingAlerts
      .filter(a => a.status === 'active')
      .map(a => `${a.equipmentId}-${a.alertType}`);

    const toCreate = alerts.filter(a => !existing.includes(`${a.equipmentId}-${a.alertType}`));

    if (toCreate.length > 0) {
      await base44.asServiceRole.entities.PredictiveAlert.bulkCreate(toCreate);
      console.log(`Created ${toCreate.length} new predictive alerts`);
    }

    return Response.json({
      success: true,
      alertsGenerated: toCreate.length,
      totalActiveAlerts: existingAlerts.filter(a => a.status === 'active').length + toCreate.length,
    });
  } catch (error) {
    console.error('Predictive health check failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});