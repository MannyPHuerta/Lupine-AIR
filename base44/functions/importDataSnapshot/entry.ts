import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Admin-only function: Import a full JSON data snapshot.
 * Restores entities from an exportAllData() snapshot into a fresh instance.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { entities } = await req.json();
    if (!entities || typeof entities !== 'object') {
      return Response.json({ error: 'Invalid payload: entities object required' }, { status: 400 });
    }

    const service = base44.asServiceRole;
    const results = {};

    for (const [entityName, records] of Object.entries(entities)) {
      if (!Array.isArray(records) || records.length === 0) {
        results[entityName] = { imported: 0, skipped: 0 };
        continue;
      }

      let imported = 0;
      let skipped = 0;

      for (const rec of records) {
        const { id, created_date, updated_date, created_by, ...payload } = rec;
        try {
          await service.entities[entityName].create(payload);
          imported++;
        } catch (err) {
          skipped++;
        }
      }

      results[entityName] = { imported, skipped };
    }

    return Response.json({ 
      message: 'Data import complete',
      results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});