import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { websiteUrl, equipmentIds } = body;

    if (!websiteUrl) {
      return Response.json({ error: 'websiteUrl is required' }, { status: 400 });
    }

    // Get equipment to enrich — either specific IDs or all with daily rates
    let items;
    if (equipmentIds && equipmentIds.length > 0) {
      items = await base44.asServiceRole.entities.Equipment.list('name', 500);
      items = items.filter(e => equipmentIds.includes(e.id));
    } else {
      items = await base44.asServiceRole.entities.Equipment.list('name', 500);
      items = items.filter(e => e.dailyRate > 0);
    }

    // Deduplicate by name (same named items share one image lookup)
    const uniqueNames = [...new Set(items.map(e => e.name))];
    const nameToImageUrl = {};

    let successCount = 0;
    let failCount = 0;

    for (const name of uniqueNames) {
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Search the website "${websiteUrl}" for an image of their rental equipment called "${name}".
Return ONLY a valid direct image URL (ending in .jpg, .jpeg, .png, .webp, or similar image extension) from that website.
The image should clearly show the "${name}" equipment.
If you cannot find a specific image on that website, return null.
Do not return placeholder URLs or generic stock photos — only real URLs from the target website.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              imageUrl: { type: "string", description: "Direct image URL from the subscriber website, or null if not found" },
              found: { type: "boolean", description: "Whether an image was found" }
            },
            required: ["found"]
          }
        });

        if (result?.found && result?.imageUrl) {
          nameToImageUrl[name] = result.imageUrl;
        } else {
          nameToImageUrl[name] = null;
        }
      } catch (err) {
        console.error(`Failed to enrich image for "${name}":`, err.message);
        nameToImageUrl[name] = null;
      }
    }

    // Update all equipment records with found images
    const now = new Date().toISOString();
    for (const item of items) {
      const imageUrl = nameToImageUrl[item.name];
      if (imageUrl) {
        await base44.asServiceRole.entities.Equipment.update(item.id, {
          imageUrl,
          imageEnrichedAt: now
        });
        successCount++;
      } else {
        failCount++;
      }
    }

    return Response.json({
      success: true,
      totalItems: items.length,
      uniqueNames: uniqueNames.length,
      imagesFound: successCount,
      notFound: failCount,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});