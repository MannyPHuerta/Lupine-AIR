import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const names = body.names || [];

    if (!names.length) {
      return Response.json({ error: 'No names provided' }, { status: 400 });
    }

    const sessionId = `catalog_${Date.now()}`;
    const records = names.map((name, idx) => ({
      description1: name,
      cleanName: name,
      migrationSource: 'cuaux_catalog',
      migrationSessionId: sessionId,
      recordIndex: idx,
      byteOffset: 0,
    }));

    // Batch create in chunks of 100
    let imported = 0;
    for (let i = 0; i < records.length; i += 100) {
      const chunk = records.slice(i, i + 100);
      await base44.asServiceRole.entities.InventoryItem.bulkCreate(chunk);
      imported += chunk.length;
    }

    return Response.json({ imported, sessionId });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});