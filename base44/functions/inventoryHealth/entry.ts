import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [equipment, rentals] = await Promise.all([
      base44.asServiceRole.entities.Equipment.list('-created_date', 500),
      base44.asServiceRole.entities.Rental.list('-created_date', 2000),
    ]);

    const now = new Date();

    // For each equipment item, compute last rental date and total revenue
    const stats = equipment.map(eq => {
      const eqRentals = rentals.filter(r =>
        r.equipmentId === eq.id && !['cancelled'].includes(r.status)
      );
      const lastRental = eqRentals.length > 0
        ? eqRentals.reduce((latest, r) => r.endDate > latest ? r.endDate : latest, eqRentals[0].endDate)
        : null;
      const totalRevenue = eqRentals.reduce((s, r) => s + (r.baseAmount || 0), 0);
      const daysSinceRental = lastRental
        ? Math.floor((now - new Date(lastRental)) / (1000 * 60 * 60 * 24))
        : 9999;
      const rentalCount = eqRentals.length;

      // Health score: 0 (critical) to 100 (healthy)
      let healthScore = 100;
      if (daysSinceRental > 180) healthScore -= 50;
      else if (daysSinceRental > 90) healthScore -= 30;
      else if (daysSinceRental > 30) healthScore -= 10;
      if (rentalCount === 0) healthScore -= 30;
      else if (rentalCount < 3) healthScore -= 10;

      return {
        id: eq.id,
        name: eq.name,
        category: eq.category,
        status: eq.status,
        dailyRate: eq.dailyRate,
        location: eq.location,
        lastRentalDate: lastRental,
        daysSinceRental,
        rentalCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        healthScore: Math.max(0, healthScore),
      };
    });

    // Sort by health score ascending (worst first)
    stats.sort((a, b) => a.healthScore - b.healthScore);

    // Get AI recommendations for the worst 5
    const staleItems = stats.filter(s => s.healthScore < 60).slice(0, 5);

    let aiInsights = [];
    if (staleItems.length > 0) {
      const itemList = staleItems.map(s =>
        `${s.name} (${s.category}, last rented ${s.daysSinceRental === 9999 ? 'never' : s.daysSinceRental + ' days ago'}, ${s.rentalCount} total rentals, $${s.totalRevenue} revenue)`
      ).join('; ');

      const prompt = `You are a rental fleet manager. These equipment items are underperforming: ${itemList}. For each item, give a 1-sentence recommendation (sell, repair, reposition, or bundle). Return a JSON array with objects: {name, recommendation, action} where action is one of: "sell", "repair", "reposition", "bundle". Return only the JSON array.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  recommendation: { type: 'string' },
                  action: { type: 'string' },
                },
              },
            },
          },
        },
      });

      aiInsights = aiResponse?.items || [];
    }

    return Response.json({ stats, aiInsights });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});