import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get next batch of items needing approval
    const items = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 10);
    
    let approved = 0;
    for (const item of items) {
      const hasContent = item.description1 || item.description2 || item.serialNumber;
      if (!item.reviewStatus && hasContent) {
        await base44.asServiceRole.entities.InventoryItem.update(item.id, { reviewStatus: 'approved' });
        approved++;
        await new Promise(r => setTimeout(r, 200));
      }
    }

    return Response.json({ approved, processed: items.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});