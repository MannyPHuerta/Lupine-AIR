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
    
    // Update sequentially with delays to respect rate limits
    let approved = 0;
    for (const item of needsApproval) {
      await base44.asServiceRole.entities.InventoryItem.update(item.id, { reviewStatus: 'approved' });
      approved++;
      await new Promise(r => setTimeout(r, 200));
    }

    return Response.json({ approved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});