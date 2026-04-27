import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all items
    const allItems = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 5000);
    
    // Filter for items needing review (no reviewStatus AND has content)
    const needsApproval = allItems.filter(item => 
      !item.reviewStatus && (item.description1 || item.description2 || item.serialNumber)
    );
    
    // Update with batching to avoid timeouts
    let approved = 0;
    for (let i = 0; i < needsApproval.length; i += 20) {
      const batch = needsApproval.slice(i, i + 20);
      await Promise.all(batch.map(item => 
        base44.asServiceRole.entities.InventoryItem.update(item.id, { reviewStatus: 'approved' })
      ));
      approved += batch.length;
      if (i + 20 < needsApproval.length) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return Response.json({ approved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});