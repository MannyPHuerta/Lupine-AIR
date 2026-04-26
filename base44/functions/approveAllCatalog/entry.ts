import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all items that need review
    const items = await base44.asServiceRole.entities.InventoryItem.list('-created_date', 10000);
    const needsApproval = items.filter(item => !item.reviewStatus && (item.description1 || item.description2 || item.serialNumber));

    // Update all in bulk via service role
    let approved = 0;
    for (let i = 0; i < needsApproval.length; i += 50) {
      const batch = needsApproval.slice(i, i + 50);
      await Promise.all(
        batch.map(item => 
          base44.asServiceRole.entities.InventoryItem.update(item.id, { reviewStatus: 'approved' })
        )
      );
      approved += batch.length;
    }

    return Response.json({ approved, total: needsApproval.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});