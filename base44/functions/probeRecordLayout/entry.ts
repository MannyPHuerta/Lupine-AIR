import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Given a chunk of binary, find a known search string and dump surrounding bytes
// Returns: offset where found, and a hex+ascii dump of the surrounding 600 bytes

function toHex(byte) {
  return byte.toString(16).padStart(2, '0');
}

function isPrintable(byte) {
  return byte >= 0x20 && byte <= 0x7E;
}

function hexDump(bytes, start, length) {
  const rows = [];
  for (let i = 0; i < length; i += 16) {
    const rowBytes = bytes.slice(start + i, start + i + 16);
    const hex = Array.from(rowBytes).map(toHex).join(' ');
    const ascii = Array.from(rowBytes).map(b => isPrintable(b) ? String.fromCharCode(b) : '.').join('');
    rows.push({ offset: i, hex, ascii });
  }
  return rows;
}

// Extract all printable text runs from a byte range
function extractFieldsFromRange(bytes, start, length) {
  const fields = [];
  let current = '';
  let fieldStart = -1;

  for (let i = start; i < start + length && i < bytes.length; i++) {
    const b = bytes[i];
    if (isPrintable(b)) {
      if (current.length === 0) fieldStart = i - start;
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
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chunk, searchTerm, recordSize } = await req.json();
    if (!chunk || !searchTerm) {
      return Response.json({ error: 'chunk and searchTerm required' }, { status: 400 });
    }

    // Decode base64 chunk
    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }

    // Search for the term as ASCII bytes
    const searchBytes = Array.from(searchTerm).map(c => c.charCodeAt(0));
    const found = [];

    outer:
    for (let i = 0; i <= bytes.length - searchBytes.length; i++) {
      for (let j = 0; j < searchBytes.length; j++) {
        if (bytes[i + j] !== searchBytes[j]) continue outer;
      }
      found.push(i);
      if (found.length >= 5) break; // limit to 5 hits
    }

    if (found.length === 0) {
      return Response.json({ found: false, message: `"${searchTerm}" not found in this chunk` });
    }

    // For each hit, determine record boundary and extract fields
    const rSize = recordSize || 552;
    const records = found.map(hitOffset => {
      // Snap to nearest record boundary before the hit
      const recordStart = Math.floor(hitOffset / rSize) * rSize;
      const dump = hexDump(bytes, recordStart, rSize);
      const fields = extractFieldsFromRange(bytes, recordStart, rSize);
      return {
        hitOffset,
        recordStart,
        recordEnd: recordStart + rSize,
        dump,
        fields,
      };
    });

    return Response.json({
      found: true,
      searchTerm,
      hits: found.length,
      chunkSize: bytes.length,
      recordSize: rSize,
      records,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});