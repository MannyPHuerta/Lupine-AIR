import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Parse DBF header to get field definitions
function parseDbfHeader(buffer) {
  const view = new DataView(buffer);
  let offset = 0;

  // Read file header
  offset = 32; // Skip to field descriptors
  const fields = [];

  while (offset < buffer.byteLength && offset < 1024) {
    const byte = view.getUint8(offset);
    if (byte === 13) break; // Field descriptor terminator

    const fieldName = new TextDecoder().decode(buffer.slice(offset, offset + 11)).split('\0')[0];
    offset += 11;

    if (fieldName.trim() === '') break;

    const fieldType = String.fromCharCode(view.getUint8(offset++));
    offset += 4;
    const fieldLength = view.getUint8(offset++);
    const decimalCount = view.getUint8(offset++);
    offset += 14;

    fields.push({
      name: fieldName.trim(),
      type: fieldType,
      size: fieldLength,
      decimalCount
    });
  }

  // Get header length and record length
  const headerLengthOffset = 8;
  const recordLengthOffset = 10;
  const headerLength = new DataView(buffer).getUint16(headerLengthOffset, true);
  const recordLength = new DataView(buffer).getUint16(recordLengthOffset, true);

  return { fields, headerLength, recordLength };
}

// Extract a single record from buffer
function extractRecord(buffer, fields, startOffset, recordLength) {
  const view = new DataView(buffer);
  const isDeleted = view.getUint8(startOffset) === 42; // '*' = deleted
  
  if (isDeleted) return null;

  let offset = startOffset + 1;
  const record = {};

  for (const field of fields) {
    const fieldData = new TextDecoder().decode(
      buffer.slice(offset, offset + field.size)
    ).trim();
    record[field.name] = fieldData;
    offset += field.size;
  }

  return record;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { chunk, chunkIndex, totalChunks, sessionId, fields, headerLength } = body;

    if (!chunk) {
      return Response.json({ error: 'chunk required' }, { status: 400 });
    }

    // Decode chunk from base64
    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = bytes.buffer;

    // Parse fields from first chunk only
    let parsedFields = fields;
    let recordStartOffset = headerLength;

    if (chunkIndex === 0 && !fields) {
      const headerBuffer = buffer.slice(0, Math.min(buffer.byteLength, 2048));
      const parsed = parseDbfHeader(headerBuffer);
      parsedFields = parsed.fields;
      recordStartOffset = parsed.headerLength;
    }

    // Extract records from this chunk
    const records = [];
    let currentOffset = recordStartOffset;

    const view = new DataView(buffer);
    const recordLength = parsedFields.length > 0 ? 
      1 + parsedFields.reduce((sum, f) => sum + f.size, 0) : 0;

    while (currentOffset + recordLength <= buffer.byteLength) {
      const record = extractRecord(buffer, parsedFields, currentOffset, recordLength);
      if (record) {
        records.push(record);
      }
      currentOffset += recordLength;
    }

    // Batch insert records (max 100 at a time to avoid payload limits)
    let insertedCount = 0;
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100).map(r => ({
        ...r,
        migrationSource: 'dbf_cpro',
        migrationSessionId: sessionId,
      }));

      // Create records in database
      const created = await base44.entities.CproContact.bulkCreate(batch);
      insertedCount += created.length;
    }

    return Response.json({
      success: true,
      chunkIndex,
      totalChunks,
      recordsInChunk: records.length,
      insertedCount,
      fields: parsedFields,
      isLastChunk: chunkIndex === totalChunks - 1,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});