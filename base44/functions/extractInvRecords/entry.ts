import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RECORD_SIZE = 1356;

// Field map derived from probing the inv file
// Format: { name, offset, length }
const FIELD_MAP = [
  { name: 'description1',   offset:  53, length: 20 },
  { name: 'description2',   offset: 136, length: 20 },
  { name: 'description3',   offset: 219, length: 20 },
  { name: 'field4',         offset: 254, length:  9 },
  { name: 'code1',          offset: 293, length:  3 },
  { name: 'description4',   offset: 310, length: 20 },
  { name: 'notes1',         offset: 355, length: 17 },
  { name: 'field5',         offset: 386, length: 17 },
  { name: 'code2',          offset: 433, length:  3 },
  { name: 'field6',         offset: 450, length: 20 },
  { name: 'field7',         offset: 495, length: 13 },
];

function isPrintable(b) {
  return b >= 0x20 && b <= 0x7E;
}

function readField(bytes, recStart, offset, maxLen) {
  const start = recStart + offset;
  const end = Math.min(start + maxLen, bytes.length);
  let val = '';
  for (let i = start; i < end; i++) {
    if (!isPrintable(bytes[i])) break;
    val += String.fromCharCode(bytes[i]);
  }
  return val.trim();
}

// Also scan for ALL printable runs in a record (for raw dump)
function extractAllFields(bytes, recStart, recSize) {
  const fields = [];
  let current = '';
  let fieldStart = -1;
  const end = Math.min(recStart + recSize, bytes.length);
  for (let i = recStart; i < end; i++) {
    const b = bytes[i];
    if (isPrintable(b)) {
      if (current.length === 0) fieldStart = i - recStart;
      current += String.fromCharCode(b);
    } else {
      if (current.trim().length >= 3) {
        fields.push({ offset: fieldStart, length: current.length, value: current.trim() });
      }
      current = '';
    }
  }
  if (current.trim().length >= 3) {
    fields.push({ offset: fieldStart, length: current.length, value: current.trim() });
  }
  return fields;
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
      // Check if record looks valid — must have at least one printable run of 3+ chars
      const sample = readField(bytes, i, 53, 20);
      if (sample.length > 0 || readField(bytes, i, 136, 20).length > 0 || readField(bytes, i, 219, 20).length > 0) {
        const rec = {
          recordIndex: Math.floor((globalOffset + i - hdr) / RECORD_SIZE),
          byteOffset: globalOffset + i,
        };
        for (const f of FIELD_MAP) {
          rec[f.name] = readField(bytes, i, f.offset, f.length);
        }
        // Composite description for convenience
        rec.fullDescription = [rec.description1, rec.description2, rec.description3, rec.description4]
          .filter(Boolean).join(' | ');
        // Raw field scan
        rec.rawFields = extractAllFields(bytes, i, RECORD_SIZE);
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