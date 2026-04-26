import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get items without reviewStatus (needs review) in batches
    let approved = 0;
    let offset = 0;
    const batchSize = 100;
    
    while (true) {
      const items = await base44.asServiceRole.entities.InventoryItem.filter(
        { reviewStatus: { $exists: false } },
        '-created_date',
        batchSize,
        offset
      );
      
      if (items.length === 0) break;
      
      // Filter for items with actual content
      const validItems = items.filter(item => item.description1 || item.description2 || item.serialNumber);
      
      // Update sequentially with delay to avoid rate limits
      for (const item of validItems) {
        await base44.asServiceRole.entities.InventoryItem.update(item.id, { reviewStatus: 'approved' });
        await new Promise(r => setTimeout(r, 10));
      }
      
      approved += validItems.length;
      offset += batchSize;
    }

    return Response.json({ approved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});