import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RECORD_SIZE = 544;

// Each record is 544 bytes:
// Bytes 0–443: Equipment CSV line
// Byte 444: Newline separator
// Bytes 445–543: Numeric CSV line

// Parse CSV line by splitting on comma and removing quotes
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim().length > 0) fields.push(current.trim());
  return fields;
}

// Extract bytes as string, trimming nulls
function extractString(bytes, start, len) {
  let str = '';
  for (let i = start; i < start + len && i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0) break;
    if (b >= 0x20 && b <= 0x7E) str += String.fromCharCode(b);
  }
  return str;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chunk, chunkByteOffset, headerSize, startOffset, maxRecords } = await req.json();
    if (!chunk) return Response.json({ error: 'chunk required' }, { status: 400 });

    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }

    const hdr = headerSize || 0;
    const limit = maxRecords || 5000;
    const globalOffset = chunkByteOffset || 0;
    const skipTo = startOffset || 0;

    // Determine the start of records within this chunk
    let chunkRecordStart = 0;
    if (globalOffset === 0 && skipTo === 0) {
      // No skip offset — use header from file beginning
      chunkRecordStart = hdr;
    } else if (skipTo > 0 && globalOffset <= skipTo && skipTo < globalOffset + bytes.length) {
      // We're in the chunk that contains the skip offset
      chunkRecordStart = skipTo - globalOffset;
    } else if (skipTo > 0 && globalOffset > skipTo) {
      // We're past the skip offset — start at 0 and extract normally
      chunkRecordStart = 0;
    }

    const records = [];
    let i = chunkRecordStart;

    while (i + RECORD_SIZE <= bytes.length && records.length < limit) {
      // Extract equipment CSV (bytes 0–443) and numeric CSV (bytes 445–543)
      const equipmentLine = extractString(bytes, i, 444).trim();
      const numericLine = extractString(bytes, i + 445, 99).trim();

      if (equipmentLine.length > 0) {
        const equipFields = parseCSVLine(equipmentLine);
        const numFields = parseCSVLine(numericLine);

        const rec = {
          recordIndex: Math.floor((globalOffset + i - hdr) / RECORD_SIZE),
          byteOffset: globalOffset + i,
          rawFields: equipFields,
          rawNumeric: numFields,
        };

        // Map CSV fields to known attributes (adjust based on actual column order)
        rec.description1 = equipFields[2] || '';
        rec.description2 = equipFields[3] || '';
        rec.serialNumber = equipFields[6] || '';
        rec.assignedTo = equipFields[8] ? [equipFields[8]] : [];
        rec.location = equipFields[9] || '';
        rec.disposition = equipFields[10] || '';

        records.push(rec);
      }
      i += RECORD_SIZE;
    }

    return Response.json({
      success: true,
      chunkByteOffset: globalOffset,
      recordSize: RECORD_SIZE,
      recordsExtracted: records.length,
      records,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});