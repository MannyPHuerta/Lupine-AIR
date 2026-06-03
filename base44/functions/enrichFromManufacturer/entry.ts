import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { equipmentId, equipmentIds } = body;

    // Fetch the equipment items to enrich
    let items = [];
    if (equipmentId) {
      const all = await base44.asServiceRole.entities.Equipment.list('name', 2000);
      const found = all.find(e => e.id === equipmentId);
      if (found) items = [found];
    } else if (equipmentIds?.length) {
      const all = await base44.asServiceRole.entities.Equipment.list('name', 2000);
      items = all.filter(e => equipmentIds.includes(e.id));
    } else {
      return Response.json({ error: 'equipmentId or equipmentIds required' }, { status: 400 });
    }

    const results = [];

    for (const item of items) {
      const modelHint = item.modelNumber ? ` model ${item.modelNumber}` : '';
      const categoryHint = item.category ? ` (${item.category})` : '';

      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          prompt: `Search the internet for manufacturer specifications and an image for rental equipment: "${item.name}"${modelHint}${categoryHint}.

Find the official manufacturer product page or a reputable equipment database.

Return the following in JSON:
- imageUrl: a direct, publicly accessible image URL showing the equipment (prefer manufacturer site, .jpg/.png/.webp). null if not found.
- manufacturer: the manufacturer/brand name (e.g. "Wacker Neuson", "Genie", "JLG")
- modelNumber: the specific model number if identifiable
- weightLbs: operating weight in pounds (number only), null if unknown
- footprintWidthFt: width in feet (number), null if unknown  
- footprintLengthFt: length in feet (number), null if unknown
- usefulLifeYears: typical useful life for depreciation (number), null if unknown
- specs: object with key technical specs like { "Engine": "Honda GX160", "Output": "3000W", "Fuel Tank": "0.95 gal" } — use human-friendly keys
- sourceUrl: the manufacturer or reference page URL you found this data from`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              imageUrl: { type: 'string' },
              manufacturer: { type: 'string' },
              modelNumber: { type: 'string' },
              weightLbs: { type: 'number' },
              footprintWidthFt: { type: 'number' },
              footprintLengthFt: { type: 'number' },
              usefulLifeYears: { type: 'number' },
              specs: { type: 'object' },
              sourceUrl: { type: 'string' },
            }
          }
        });

        // Build update payload — only overwrite if field is currently blank
        const update = {};

        if (result?.imageUrl && !item.imageUrl) {
          update.imageUrl = result.imageUrl;
          update.imageEnrichedAt = new Date().toISOString();
        }
        if (result?.modelNumber && !item.modelNumber) {
          update.modelNumber = result.modelNumber;
        }
        if (result?.weightLbs && !item.specs?.weight_lbs) {
          update.specs = {
            ...(item.specs || {}),
            ...(result.specs || {}),
            weight_lbs: String(result.weightLbs),
          };
        } else if (result?.specs && Object.keys(result.specs).length > 0) {
          // Merge specs without overwriting existing values
          const mergedSpecs = { ...result.specs, ...(item.specs || {}) };
          update.specs = mergedSpecs;
        }
        if (result?.footprintWidthFt && !item.footprintWidth) {
          update.footprintWidth = result.footprintWidthFt;
        }
        if (result?.footprintLengthFt && !item.footprintLength) {
          update.footprintLength = result.footprintLengthFt;
        }
        if (result?.usefulLifeYears && !item.usefulLifeYears) {
          update.usefulLifeYears = result.usefulLifeYears;
        }

        if (Object.keys(update).length > 0) {
          await base44.asServiceRole.entities.Equipment.update(item.id, update);
        }

        results.push({
          id: item.id,
          name: item.name,
          enriched: Object.keys(update),
          manufacturer: result?.manufacturer || null,
          sourceUrl: result?.sourceUrl || null,
          imageFound: !!result?.imageUrl,
        });

      } catch (err) {
        console.error(`Failed to enrich "${item.name}":`, err.message);
        results.push({ id: item.id, name: item.name, enriched: [], error: err.message });
      }
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});