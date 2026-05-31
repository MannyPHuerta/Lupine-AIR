import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Service role for admin operations
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get company settings to check if late fees are enabled
    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0] || {};
    
    if (!settings.lateFeesEnabled) {
      console.log('Late fees are disabled at company level');
      return Response.json({ 
        message: 'Late fees disabled',
        updatedCount: 0 
      });
    }

    const lateFeePerDay = settings.lateFeePerDay || 0;
    const penaltyRate = settings.lateFeePenaltyRate || 0;
    const gracePeriod = settings.lateFeeGracePeriod || 0;
    const maxCap = settings.lateFeeMaxCap || 0;

    // Get all overdue rentals with status 'out'
    const allRentals = await base44.asServiceRole.entities.Rental.filter({});
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updatedCount = 0;

    for (const rental of allRentals) {
      // Skip if rental is not out, or late fees disabled for this rental
      if (rental.status !== 'out' || rental.lateFeesEnabled === false) {
        continue;
      }

      const endDate = new Date(rental.endDate);
      endDate.setHours(0, 0, 0, 0);

      // Calculate days late
      const diffTime = today.getTime() - endDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Only process if past due date
      if (diffDays <= 0) {
        // Not late yet, reset flags
        if (rental.isLate || rental.daysLate > 0) {
          await base44.asServiceRole.entities.Rental.update(rental.id, {
            isLate: false,
            daysLate: 0,
            lateFeeTotal: 0
          });
          updatedCount++;
        }
        continue;
      }

      // Apply grace period
      const billableDays = Math.max(0, diffDays - gracePeriod);
      
      if (billableDays === 0) {
        continue;
      }

      // Calculate late fee
      let lateFeePerDayForRental = lateFeePerDay;
      
      // If penalty rate is set, use percentage of daily rate
      if (penaltyRate > 0 && rental.baseAmount) {
        const dailyRate = rental.baseAmount / rental.totalDays;
        lateFeePerDayForRental = dailyRate * penaltyRate;
      }

      const lateFeeTotal = lateFeePerDayForRental * billableDays;
      
      // Apply max cap if set
      const finalLateFee = maxCap > 0 ? Math.min(lateFeeTotal, maxCap) : lateFeeTotal;

      // Update rental
      await base44.asServiceRole.entities.Rental.update(rental.id, {
        isLate: true,
        daysLate: diffDays,
        lateFeePerDay: lateFeePerDayForRental,
        lateFeeTotal: finalLateFee
      });

      updatedCount++;
      console.log(`Updated rental ${rental.id}: ${diffDays} days late, $${finalLateFee.toFixed(2)} fee`);
    }

    return Response.json({ 
      message: `Processed ${updatedCount} overdue rentals`,
      updatedCount,
      today: today.toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});