import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.replace(/^"|"$/g, '').trim());
  return fields;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { csvFileUrl, sessionId } = await req.json();
    if (!csvFileUrl) return Response.json({ error: 'csvFileUrl required' }, { status: 400 });

    const csvRes = await fetch(csvFileUrl);
    const csvText = await csvRes.text();
    const lines = csvText.split('\n').filter(l => l.trim());
    
    const headerLine = lines[0];
    const dataLines = lines.slice(1);

    // Parse records from CSV (RecordIndex, ByteOffset format)
    const records = [];
    for (const line of dataLines) {
      if (!line.trim()) continue;

      const fields = parseCSVLine(line);
      const recordIndex = parseInt(fields[0], 10);
      const byteOffset = parseInt(fields[1], 10);

      if (!isNaN(recordIndex) && !isNaN(byteOffset)) {
        records.push({
          recordIndex,
          byteOffset,
          migrationSource: 'inv_file',
          migrationSessionId: sessionId
        });
      }
    }

    if (records.length === 0) {
      return Response.json({ error: 'No valid records parsed', success: false, imported: 0 });
    }

    // Bulk import
    await base44.asServiceRole.entities.InventoryItem.bulkCreate(records);
    return Response.json({
      success: true,
      imported: records.length,
      errors: [],
      sessionId
    });
  } catch (error) {
    return Response.json({ error: error.message, success: false, imported: 0 }, { status: 500 });
  }
});