import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Extract runs of printable ASCII text (min length 4) from a byte range
function extractFields(bytes, start, len) {
  const MIN_RUN = 4;
  const fields = [];
  let run = '';

  for (let i = start; i < start + len && i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 0x20 && b <= 0x7E) {
      run += String.fromCharCode(b);
    } else {
      // Non-printable byte ends the current run
      if (run.length >= MIN_RUN) {
        // Split the run on commas, keep non-empty trimmed segments >= MIN_RUN
        const parts = run.split(',').map(s => s.trim()).filter(s => s.length >= MIN_RUN);
        fields.push(...parts);
      }
      run = '';
    }
  }
  // Flush final run
  if (run.length >= MIN_RUN) {
    const parts = run.split(',').map(s => s.trim()).filter(s => s.length >= MIN_RUN);
    fields.push(...parts);
  }

  return fields;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chunk, chunkByteOffset, offsets } = await req.json();
    // offsets: array of {recordIndex, byteOffset, id} sorted by byteOffset
    if (!chunk || !offsets || offsets.length === 0) {
      return Response.json({ error: 'chunk and offsets required' }, { status: 400 });
    }

    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }

    const globalOffset = chunkByteOffset || 0;
    const chunkEnd = globalOffset + bytes.length;

    const results = [];

    for (let oi = 0; oi < offsets.length; oi++) {
      const { recordIndex, byteOffset, id } = offsets[oi];
      // Determine end of this record = start of next record
      const nextOffset = oi + 1 < offsets.length ? offsets[oi + 1].byteOffset : byteOffset + 2048;
      const recordLen = Math.min(nextOffset - byteOffset, 2048);

      // Check if this record overlaps with this chunk
      const recStart = byteOffset;
      const recEnd = byteOffset + recordLen;

      if (recEnd <= globalOffset || recStart >= chunkEnd) continue; // not in this chunk

      // Local byte positions within this chunk
      const localStart = Math.max(recStart - globalOffset, 0);
      const localEnd = Math.min(recEnd - globalOffset, bytes.length);
      const localLen = localEnd - localStart;

      if (localLen <= 0) continue;

      const rawFields = extractFields(bytes, localStart, localLen);

      if (rawFields.length === 0) continue;

      results.push({
        id,
        recordIndex,
        byteOffset,
        rawFields,
        description1: rawFields[0] || '',
        description2: rawFields[1] || '',
      });
    }

    return Response.json({ success: true, results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});