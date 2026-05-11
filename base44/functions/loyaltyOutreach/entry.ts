import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * AI-powered loyalty outreach function.
 * Identifies loyal customers who haven't rented recently and sends personalized offers.
 * 
 * Payload:
 * - daysSinceLastRental: number (e.g., 60) — customers inactive this many days or more
 * - minRentals: number (e.g., 5) — customer must have at least this many rental history
 * - daysBack: number (e.g., 365) — analyze rental history within this many days
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can trigger this
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const daysSinceLastRental = body.daysSinceLastRental || 60;
    const minRentals = body.minRentals || 5;
    const daysBack = body.daysBack || 365;

    const now = new Date();
    const inactiveSince = new Date(now.getTime() - daysSinceLastRental * 24 * 60 * 60 * 1000);
    const historyStart = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Fetch all customers and rentals
    const [customers, rentals] = await Promise.all([
      base44.entities.Customer.list('-created_date', 2000),
      base44.entities.Rental.list('-created_date', 5000),
    ]);

    // Identify loyal customers who haven't rented recently
    const outreachList = [];

    for (const cust of customers) {
      if (!cust.email || cust.blacklisted) continue;

      // Find customer's rental history
      const custRentals = rentals.filter(r =>
        (r.customerName === cust.fullName || r.customerEmail === cust.email) &&
        r.status === 'completed'
      );

      // Skip if not enough rental history
      if (custRentals.length < minRentals) continue;

      // Find most recent rental
      const sorted = [...custRentals].sort((a, b) =>
        new Date(b.startDate || b.created_date) - new Date(a.startDate || a.created_date)
      );
      const lastRental = sorted[0];
      const lastRentalDate = new Date(lastRental.startDate || lastRental.created_date);

      // Check if inactive
      if (lastRentalDate > inactiveSince) continue;

      // Analyze rental history for equipment preferences
      const recentRentals = rentals.filter(r =>
        (r.customerName === cust.fullName || r.customerEmail === cust.email) &&
        r.status === 'completed' &&
        new Date(r.startDate || r.created_date) >= historyStart
      );

      const equipmentFreq = {};
      const categoryFreq = {};
      recentRentals.forEach(r => {
        equipmentFreq[r.equipmentName] = (equipmentFreq[r.equipmentName] || 0) + 1;
        if (r.equipmentCategory) {
          categoryFreq[r.equipmentCategory] = (categoryFreq[r.equipmentCategory] || 0) + 1;
        }
      });

      // Get top equipment
      const topEquipment = Object.entries(equipmentFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      const topCategories = Object.entries(categoryFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([cat]) => cat);

      const daysInactive = Math.floor((now - lastRentalDate) / (1000 * 60 * 60 * 24));

      outreachList.push({
        customerId: cust.id,
        customerName: cust.fullName,
        email: cust.email,
        totalRentals: custRentals.length,
        daysInactive,
        topEquipment,
        topCategories,
        lastRentalDate: lastRental.startDate || lastRental.created_date,
      });
    }

    // Sort by days inactive (longest first)
    outreachList.sort((a, b) => b.daysInactive - a.daysInactive);

    console.log(`[loyaltyOutreach] Identified ${outreachList.length} customers for outreach`);

    return Response.json({
      success: true,
      criteria: {
        daysSinceLastRental,
        minRentals,
        daysBack,
      },
      outreachCount: outreachList.length,
      candidates: outreachList,
    });
  } catch (error) {
    console.error('[loyaltyOutreach] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});