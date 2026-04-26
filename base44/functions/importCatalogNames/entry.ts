import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const lines = body.csv.split('\n').filter(line => line.trim());
    const names = lines.slice(1).map(line => line.replace(/^"|"$/g, '').trim()).filter(n => n);

    const records = names.map(name => ({
      description1: name,
      migrationSource: 'cuaux_catalog',
      migrationSessionId: `catalog_${Date.now()}`,
      recordIndex: 0,
      byteOffset: 0,
    }));

    // Batch create in chunks of 100
    let imported = 0;
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100);
      await base44.asServiceRole.entities.InventoryItem.bulkCreate(chunk);
      imported += chunk.length;
    }

    return Response.json({ imported, total: names.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});