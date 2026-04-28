import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const rentals = await base44.asServiceRole.entities.Rental.list('-created_date', 2000);

    const active = rentals.filter(r => r.status !== 'cancelled');

    // 1. Demand by month
    const byMonth = {};
    active.forEach(r => {
      if (!r.startDate) return;
      const month = r.startDate.slice(0, 7); // YYYY-MM
      if (!byMonth[month]) byMonth[month] = { month, rentals: 0, revenue: 0 };
      byMonth[month].rentals++;
      byMonth[month].revenue += r.baseAmount || 0;
    });
    const monthlyTrend = Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, revenue: Math.round(m.revenue * 100) / 100 }));

    // 2. Top equipment by demand
    const byEquipment = {};
    active.forEach(r => {
      const name = r.equipmentName || r.equipmentId;
      if (!name) return;
      if (!byEquipment[name]) byEquipment[name] = { name, rentals: 0, revenue: 0 };
      byEquipment[name].rentals++;
      byEquipment[name].revenue += r.baseAmount || 0;
    });
    const topEquipment = Object.values(byEquipment)
      .sort((a, b) => b.rentals - a.rentals)
      .slice(0, 10)
      .map(e => ({ ...e, revenue: Math.round(e.revenue * 100) / 100 }));

    // 3. Top customers by volume
    const byCustomer = {};
    active.forEach(r => {
      const name = r.customerName;
      if (!name) return;
      if (!byCustomer[name]) byCustomer[name] = { name, rentals: 0, revenue: 0, branch: r.branch };
      byCustomer[name].rentals++;
      byCustomer[name].revenue += r.baseAmount || 0;
    });
    const topCustomers = Object.values(byCustomer)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(c => ({ ...c, revenue: Math.round(c.revenue * 100) / 100 }));

    // 4. Demand by branch
    const byBranch = {};
    active.forEach(r => {
      const branch = r.branch || 'Unknown';
      if (!byBranch[branch]) byBranch[branch] = { branch, rentals: 0, revenue: 0 };
      byBranch[branch].rentals++;
      byBranch[branch].revenue += r.baseAmount || 0;
    });
    const branchBreakdown = Object.values(byBranch)
      .sort((a, b) => b.revenue - a.revenue)
      .map(b => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 }));

    // 5. Avg rental duration trend
    const avgDuration = active
      .filter(r => r.totalDays)
      .reduce((acc, r) => acc + r.totalDays, 0) / (active.filter(r => r.totalDays).length || 1);

    // 6. AI narrative
    const totalRevenue = active.reduce((s, r) => s + (r.baseAmount || 0), 0);
    const topItem = topEquipment[0];
    const topCustomer = topCustomers[0];
    const latestMonths = monthlyTrend.slice(-3);
    const trend = latestMonths.length >= 2
      ? latestMonths[latestMonths.length - 1].revenue > latestMonths[0].revenue ? 'growing' : 'declining'
      : 'stable';

    const prompt = `You are a rental business analyst. Here is the rental data summary:
- Total revenue: $${Math.round(totalRevenue)}
- Top equipment: ${topItem?.name} (${topItem?.rentals} rentals)
- Top customer: ${topCustomer?.name} ($${topCustomer?.revenue} revenue)
- Revenue trend over last 3 months: ${trend}
- Average rental duration: ${Math.round(avgDuration)} days
- Most active branch: ${branchBreakdown[0]?.branch}

Write a 3-sentence business intelligence summary highlighting key demand patterns, opportunities, and one actionable recommendation. Be specific and direct.`;

    const aiNarrative = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
    });

    return Response.json({
      monthlyTrend,
      topEquipment,
      topCustomers,
      branchBreakdown,
      avgDuration: Math.round(avgDuration * 10) / 10,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalRentals: active.length,
      aiNarrative,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});