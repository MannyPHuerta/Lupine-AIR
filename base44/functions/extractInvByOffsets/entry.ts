import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Extract printable ASCII text from a byte range, treating non-printable as delimiters
function extractText(bytes, start, len) {
  let result = '';
  for (let i = start; i < start + len && i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 0x20 && b <= 0x7E) {
      result += String.fromCharCode(b);
    } else if (b === 0x0D || b === 0x0A || b === 0x00) {
      // treat CR/LF/null as field separator
      result += '\x01'; // use a placeholder separator
    }
  }
  return result;
}

// Parse comma-separated fields from text, ignoring empty segments
function parseFields(text) {
  // Split on commas or our placeholder separator, filter garbage
  const parts = text.split(/[,\x01]+/);
  return parts
    .map(s => s.trim())
    .filter(s => s.length > 0);
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

      const text = extractText(bytes, localStart, localLen);
      const rawFields = parseFields(text);

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