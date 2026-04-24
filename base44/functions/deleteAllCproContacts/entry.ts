import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Delete in batches of 100 until none left
    let totalDeleted = 0;
    while (true) {
      const batch = await base44.asServiceRole.entities.CproContact.list(undefined, 100);
      if (!batch || batch.length === 0) break;
      for (const c of batch) {
        await base44.asServiceRole.entities.CproContact.delete(c.id);
      }
      totalDeleted += batch.length;
    }

    return Response.json({ success: true, totalDeleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});