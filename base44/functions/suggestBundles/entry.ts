import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { equipmentId, equipmentName } = await req.json();

    if (!equipmentId) {
      return Response.json({ error: 'equipmentId required' }, { status: 400 });
    }

    // Get past rentals of this equipment
    const rentals = await base44.asServiceRole.entities.Rental.filter(
      { equipmentId },
      '-created_date',
      100
    );

    if (rentals.length === 0) {
      return Response.json({ suggestions: [] });
    }

    // Extract customer names that rented this item
    const customerNames = [...new Set(rentals.map(r => r.customerName))];

    // Find all rentals from those customers (regardless of equipment)
    const allCustomerRentals = [];
    for (const name of customerNames.slice(0, 10)) { // Limit to avoid huge query
      const custRentals = await base44.asServiceRole.entities.Rental.filter(
        { customerName: name },
        '-created_date',
        50
      );
      allCustomerRentals.push(...custRentals);
    }

    // Count frequency of other equipment rented alongside target
    const equipmentFreq = {};
    allCustomerRentals.forEach(r => {
      if (r.equipmentId !== equipmentId) {
        equipmentFreq[r.equipmentId] = (equipmentFreq[r.equipmentId] || 0) + 1;
      }
    });

    // Get top 3 recommendations
    const topEquipmentIds = Object.entries(equipmentFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    // Fetch equipment details
    const allEquipment = await base44.asServiceRole.entities.Equipment.list('-created_date', 500);
    const equipmentMap = {};
    allEquipment.forEach(e => { equipmentMap[e.id] = e; });

    const recommendedEquipment = topEquipmentIds
      .map(id => equipmentMap[id])
      .filter(e => e);

    if (recommendedEquipment.length === 0) {
      return Response.json({ suggestions: [] });
    }

    // Use LLM to generate friendly recommendations
    const rentedWith = recommendedEquipment.map(e => `${e.name} ($${e.dailyRate}/day)`).join(', ');
    const prompt = `The customer is renting "${equipmentName}". Based on rental history, the last 3 customers who rented this item also rented: ${rentedWith}. Generate a brief, one-sentence suggestion explaining why these items work well together. Be specific to construction/rental context. Keep it under 15 words.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
    });

    return Response.json({
      suggestions: recommendedEquipment.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category,
        dailyRate: e.dailyRate,
        depositRequired: e.depositRequired,
      })),
      reasoning: aiResponse,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});