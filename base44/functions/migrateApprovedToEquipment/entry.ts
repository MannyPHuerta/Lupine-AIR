import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all approved InventoryItems
    const approved = await base44.asServiceRole.entities.InventoryItem.filter({ reviewStatus: 'approved' });

    // Fetch existing Equipment to avoid duplicates
    const existing = await base44.asServiceRole.entities.Equipment.list('-created_date', 10000);
    const existingItemIds = new Set(existing.map(e => e.inventoryItemId));

    // Migrate approved items to Equipment
    let created = 0;
    let skipped = 0;
    const errors = [];

    for (const item of approved) {
      // Skip if already migrated
      if (existingItemIds.has(item.id)) {
        skipped++;
        continue;
      }

      // Only create if we have a clean name
      if (!item.cleanName) {
        skipped++;
        continue;
      }

      try {
        await base44.asServiceRole.entities.Equipment.create({
          inventoryItemId: item.id,
          name: item.cleanName,
          category: item.category || 'Other',
          dailyRate: 50, // Default starting rate
          weeklyRate: 280, // ~40/day
          monthlyRate: 1000, // ~33/day
          depositRequired: 100,
          taxable: true,
          status: 'available',
          location: item.location || '',
          notes: item.disposition || '',
          dependencies: [],
        });
        created++;
        await new Promise(r => setTimeout(r, 50)); // Gentle delay
      } catch (err) {
        errors.push({ itemId: item.id, name: item.cleanName, error: err.message });
      }
    }

    return Response.json({
      created,
      skipped,
      total: approved.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // First 10 errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});