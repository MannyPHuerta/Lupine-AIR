import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base64Data, mapping, sessionId } = await req.json();
    if (!base64Data || !mapping) {
      return Response.json({ error: 'base64Data and mapping required' }, { status: 400 });
    }

    // Decode binary data
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
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
  let currentFieldStart = 0;
  let nullSequence = 0;
  const nullThreshold = 4;

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      nullSequence++;
      if (nullSequence === nullThreshold && currentFieldStart < i - nullThreshold) {
        fields.push({
          startOffset: currentFieldStart,
          endOffset: i - nullThreshold,
          size: i - nullThreshold - currentFieldStart,
          content: extractText(bytes, currentFieldStart, i - nullThreshold),
        });
        currentFieldStart = i;
        nullSequence = 0;
      }
    } else {
      nullSequence = 0;
    }
  }

  if (currentFieldStart < bytes.length) {
    fields.push({
      startOffset: currentFieldStart,
      endOffset: bytes.length,
      size: bytes.length - currentFieldStart,
      content: extractText(bytes, currentFieldStart, bytes.length),
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