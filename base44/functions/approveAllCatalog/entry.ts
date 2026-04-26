import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all items and filter client-side
    let approved = 0;
    let offset = 0;
    const batchSize = 50;
    
    while (true) {
      const items = await base44.asServiceRole.entities.InventoryItem.list('-created_date', batchSize, offset);
      
      if (items.length === 0) break;
      
      // Filter for items needing review (no reviewStatus AND has content)
      const needsApproval = items.filter(item => 
        !item.reviewStatus && (item.description1 || item.description2 || item.serialNumber)
      );
      
      // Update sequentially with longer delay to respect rate limits
      for (const item of needsApproval) {
        await base44.asServiceRole.entities.InventoryItem.update(item.id, { reviewStatus: 'approved' });
        await new Promise(r => setTimeout(r, 100));
      }
      
      approved += needsApproval.length;
      offset += batchSize;
      
      // Delay between batches
      await new Promise(r => setTimeout(r, 500));
    }

    return Response.json({ approved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});