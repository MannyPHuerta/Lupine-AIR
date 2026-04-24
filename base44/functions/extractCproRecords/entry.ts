import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// CPro binary file record layout (552 bytes per record, 532-byte header)
const RECORD_SIZE = 552;
const HEADER_OFFSET = 532;

// Field offsets within each record
const FIELDS = {
  phone:     { offset: 9,   length: 19 },  // first phone slot (7-digit, may have garbage prefix)
  accountNo: { offset: 294, length: 9  },
  fullName:  { offset: 306, length: 30 },
  address:   { offset: 362, length: 27 },
  cityStateZip: { offset: 389, length: 44 },
};

function isPrintable(b) {
  return b >= 0x20 && b <= 0x7E;
}

function extractText(bytes, offset, length) {
  const end = Math.min(offset + length, bytes.length);
  let s = '';
  for (let i = offset; i < end; i++) {
    s += isPrintable(bytes[i]) ? String.fromCharCode(bytes[i]) : ' ';
  }
  return s.trim();
}

// Clean phone: strip leading garbage chars, keep digits and dashes
function cleanPhone(raw) {
  // Find first digit
  const match = raw.match(/\d[\d\-]{6,}/);
  return match ? match[0].trim() : '';
}

// Split "BROWNSVILLE, TX 78526 504-2662" into parts
function parseCityStateZip(raw) {
  // Pattern: CITY, ST ZIP[ PHONE]
  const m = raw.match(/^([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*([\d\-]+)?/);
  if (m) {
    return {
      city: m[1].trim(),
      state: m[2].trim(),
      zipCode: m[3].trim(),
      phoneInField: m[4] ? m[4].trim() : '',
    };
  }
  return { city: raw, state: '', zipCode: '', phoneInField: '' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chunk, chunkIndex, totalChunks, sessionId } = await req.json();
    if (!chunk) {
      return Response.json({ error: 'chunk required' }, { status: 400 });
    }

    // Decode base64
    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }

    // For chunk 0, skip the header; subsequent chunks start at 0 but we need to
    // account for the fact that the first chunk already consumed the header.
    // We track a "file offset" to know where this chunk starts in the file.
    // chunkIndex * CHUNK_SIZE gives the file byte position of this chunk's start.
    // The caller passes chunkIndex so we can compute the file offset.
    const CHUNK_SIZE = 2 * 1024 * 1024;
    const fileOffset = chunkIndex * CHUNK_SIZE;

    // Determine where in this chunk the first record starts
    let startInChunk;
    if (fileOffset === 0) {
      // First chunk: skip the 532-byte header
      startInChunk = HEADER_OFFSET;
    } else {
      // Subsequent chunks: find the offset into the record grid
      const bytesAfterHeader = fileOffset - HEADER_OFFSET;
      const remainder = bytesAfterHeader % RECORD_SIZE;
      startInChunk = remainder === 0 ? 0 : RECORD_SIZE - remainder;
    }

    const contacts = [];
    let pos = startInChunk;

    while (pos + RECORD_SIZE <= bytes.length) {
      const rawName = extractText(bytes, pos + FIELDS.fullName.offset, FIELDS.fullName.length);
      // Skip empty or non-name records
      if (!rawName || rawName.length < 2) {
        pos += RECORD_SIZE;
        continue;
      }
      // Skip if name looks like an account index (all digits)
      if (/^\d+$/.test(rawName.replace(/\s/g, ''))) {
        pos += RECORD_SIZE;
        continue;
      }

      const rawPhone = extractText(bytes, pos + FIELDS.phone.offset, FIELDS.phone.length);
      const rawAccount = extractText(bytes, pos + FIELDS.accountNo.offset, FIELDS.accountNo.length);
      const rawAddress = extractText(bytes, pos + FIELDS.address.offset, FIELDS.address.length);
      const rawCityStateZip = extractText(bytes, pos + FIELDS.cityStateZip.offset, FIELDS.cityStateZip.length);

      const phone = cleanPhone(rawPhone);
      const accountNumber = rawAccount.replace(/\D/g, '').trim();
      const { city, state, zipCode, phoneInField } = parseCityStateZip(rawCityStateZip);

      // Use phone from city field if primary phone slot is empty
      const finalPhone = phone || phoneInField;

      contacts.push({
        fullName: rawName,
        phone: finalPhone,
        address: rawAddress,
        city,
        state,
        zipCode,
        accountNumber,
        migrationSource: 'dbf_cpro',
        migrationSessionId: sessionId,
        notes: `raw: ${rawCityStateZip}`,
      });

      pos += RECORD_SIZE;
    }

    // Bulk insert
    let insertedCount = 0;
    if (contacts.length > 0) {
      await base44.asServiceRole.entities.CproContact.bulkCreate(contacts);
      insertedCount = contacts.length;
    }

    return Response.json({
      success: true,
      chunkIndex,
      recordsFound: contacts.length,
      insertedCount,
      bytesProcessed: bytes.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});