import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// CPro binary file record layout (552 bytes per record, 532-byte file header)
const RECORD_SIZE = 552;
const FILE_HEADER = 532;

// Field offsets within each 552-byte record (confirmed via Record Prober)
const F_ACCOUNT  = { off: 294, len: 9  };
const F_NAME     = { off: 306, len: 30 };
const F_ADDRESS  = { off: 362, len: 27 };
const F_CITYZIP  = { off: 389, len: 44 };
const F_PHONE    = { off: 9,   len: 19 };

function isPrintable(b) { return b >= 0x20 && b <= 0x7E; }

function extractText(bytes, baseOffset, off, len) {
  const start = baseOffset + off;
  const end = Math.min(start + len, bytes.length);
  let s = '';
  for (let i = start; i < end; i++) {
    s += isPrintable(bytes[i]) ? String.fromCharCode(bytes[i]) : '\x00';
  }
  // Replace null clusters with spaces, then trim
  return s.replace(/\x00+/g, ' ').trim();
}

function cleanPhone(raw) {
  const m = raw.match(/\d[\d\-]{6,}/);
  return m ? m[0].trim() : '';
}

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
  return { city: '', state: '', zipCode: '', phoneInField: '' };
}

// A "real" contact record has a name that looks like a person or company
// (at least 3 alpha chars, not all digits, not mostly garbage)
function looksLikeName(s) {
  if (!s || s.length < 3) return false;
  const alphaCount = (s.match(/[A-Za-z]/g) || []).length;
  if (alphaCount < 3) return false;
  // Reject if more than 40% non-alpha-space chars (garbage/binary bleed)
  const nonAlphaSpace = (s.match(/[^A-Za-z\s\-',\.]/g) || []).length;
  if (nonAlphaSpace / s.length > 0.4) return false;
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chunk, chunkIndex, totalChunks, sessionId } = await req.json();
    if (!chunk) return Response.json({ error: 'chunk required' }, { status: 400 });

    // Decode base64
    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }

    const CHUNK_SIZE = 2 * 1024 * 1024;

    // fileOffset = byte position in the original file where this chunk starts
    const fileOffset = chunkIndex * CHUNK_SIZE;

    // Find the first record boundary in this chunk.
    // Record N starts at: FILE_HEADER + N * RECORD_SIZE
    // We need the smallest N such that FILE_HEADER + N*RECORD_SIZE >= fileOffset
    // i.e. the first record that starts AT OR AFTER the beginning of this chunk.
    let firstRecordFilePos;
    if (fileOffset <= FILE_HEADER) {
      // We're still in or at the header
      firstRecordFilePos = FILE_HEADER;
    } else {
      const recordsBeforeChunk = Math.ceil((fileOffset - FILE_HEADER) / RECORD_SIZE);
      firstRecordFilePos = FILE_HEADER + recordsBeforeChunk * RECORD_SIZE;
    }

    // Offset of that record within this chunk's byte array
    let pos = firstRecordFilePos - fileOffset;

    const contacts = [];

    while (pos + RECORD_SIZE <= bytes.length) {
      const rawName    = extractText(bytes, pos, F_NAME.off,    F_NAME.len);
      const rawAccount = extractText(bytes, pos, F_ACCOUNT.off, F_ACCOUNT.len);
      const rawAddress = extractText(bytes, pos, F_ADDRESS.off, F_ADDRESS.len);
      const rawCityZip = extractText(bytes, pos, F_CITYZIP.off, F_CITYZIP.len);
      const rawPhone   = extractText(bytes, pos, F_PHONE.off,   F_PHONE.len);

      if (looksLikeName(rawName)) {
        const phone = cleanPhone(rawPhone);
        const accountNumber = rawAccount.replace(/\D/g, '').trim();
        const { city, state, zipCode, phoneInField } = parseCityStateZip(rawCityZip);
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
          notes: rawCityZip,
        });
      }

      pos += RECORD_SIZE;
    }

    let insertedCount = 0;
    if (contacts.length > 0) {
      await base44.asServiceRole.entities.CproContact.bulkCreate(contacts);
      insertedCount = contacts.length;
    }

    return Response.json({ success: true, chunkIndex, recordsFound: contacts.length, insertedCount });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});