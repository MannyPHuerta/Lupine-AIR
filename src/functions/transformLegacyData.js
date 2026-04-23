import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// deno-lint-ignore no-undef
const _serve = Deno.serve;
_serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chunks, mapping, sessionId } = await req.json();
    if (!chunks || !Array.isArray(chunks) || !mapping) {
      return Response.json({ error: 'chunks array and mapping required' }, { status: 400 });
    }

    // Reconstruct full binary from chunks
    const totalBytes = chunks.reduce((sum, chunk) => {
      const binaryString = atob(chunk);
      return sum + binaryString.length;
    }, 0);
    
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      const binaryString = atob(chunk);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[offset + i] = binaryString.charCodeAt(i);
      }
      offset += binaryString.length;
    }

    // Parse fields from binary
    const fields = detectFieldBoundaries(bytes);
    const records = [];

    // Transform each field into a record
    for (const field of fields) {
      const content = extractText(bytes, field.startOffset, field.endOffset).trim();
      if (!content) continue; // Skip empty fields

      const record = {};
      for (const [legacyOffset, awField] of Object.entries(mapping)) {
        const fieldKey = parseInt(legacyOffset);
        if (fields[fieldKey]?.content.trim() === content) {
          record[awField] = content;
        }
      }

      if (Object.keys(record).length > 0) {
        records.push({
          ...record,
          migrationSource: 'dbf_cpro',
          migrationSessionId: sessionId,
          rawData: { source: 'legacy_dbf', detectedAt: new Date().toISOString() },
        });
      }
    }

    // Bulk insert CproContact records
    const inserted = await base44.entities.CproContact.bulkCreate(records);

    return Response.json({
      success: true,
      totalRecords: records.length,
      insertedCount: inserted.length,
      records: inserted.slice(0, 5), // Return sample of first 5
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function detectFieldBoundaries(bytes) {
  const fields = [];
  const chunkSize = 256;
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    fields.push({
      startOffset: i,
      endOffset: end,
      size: end - i,
      content: extractText(bytes, i, end),
    });
  }
  
  return fields;
}

function extractText(bytes, start, end) {
  try {
    const slice = bytes.slice(start, end);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
    return text.replace(/[^\x20-\x7E\n\r\t]/g, '?').trim();
  } catch {
    return '(binary)';
  }
}