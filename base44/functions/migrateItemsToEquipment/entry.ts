import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all approved items
    const items = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 2000);
    const approved = items.filter(i => i.reviewStatus === 'approved' && i.cleanName);

    // Get existing equipment to avoid duplicates
    const existing = await base44.asServiceRole.entities.Equipment.list('-created_date', 2000);
    const existingIds = new Set(existing.map(e => e.inventoryItemId));

    let created = 0;
    const batchSize = 25;

    // Create equipment in batches
    for (let i = 0; i < approved.length; i += batchSize) {
      const batch = approved.slice(i, i + batchSize);
      const toCreate = batch
        .filter(item => !existingIds.has(item.id))
        .map(item => ({
          inventoryItemId: item.id,
          name: item.cleanName,
          category: item.category || 'Other',
          dailyRate: 75, // Placeholder rate
          weeklyRate: 75 * 5, // 5-day weekly discount
          monthlyRate: 75 * 20, // 20-day monthly discount
          depositRequired: 150,
          status: 'available',
          location: item.location || 'Warehouse',
          notes: item.disposition || ''
        }));

      if (toCreate.length > 0) {
        await base44.asServiceRole.entities.Equipment.bulkCreate(toCreate);
        created += toCreate.length;
      }

      await new Promise(r => setTimeout(r, 500));
    }

    return Response.json({ created, skipped: approved.length - created, total: approved.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});