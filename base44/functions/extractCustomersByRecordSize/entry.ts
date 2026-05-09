import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RECORD_SIZE = 149040;  // Fixed CPro customer record size (bytes)

function isPrintable(b) {
  return b >= 0x20 && b <= 0x7E;
}

function bytesToString(bytes, start, end) {
  let s = '';
  for (let i = start; i < Math.min(end, bytes.length); i++) {
    s += isPrintable(bytes[i]) ? String.fromCharCode(bytes[i]) : '\x00';
  }
  return s.replace(/\x00+/g, ' ').trim();
}

function extractTextRun(bytes, offset, maxLen) {
  let s = '';
  for (let i = 0; i < maxLen && offset + i < bytes.length; i++) {
    const b = bytes[offset + i];
    if (isPrintable(b)) {
      s += String.fromCharCode(b);
    } else if (s.length > 0) {
      break;  // Stop at first non-printable after text starts
    }
  }
  return s.trim();
}

function cleanName(s) {
  return s
    .replace(/^[\s'#+\*\|!\.\,\+]+/, '')
    .replace(/[\s!#\*\|]+$/, '')
    .trim();
}

function looksLikeName(s) {
  if (!s || s.length < 3) return false;
  const alpha = (s.match(/[A-Za-z]/g) || []).length;
  if (alpha < 3) return false;
  if (!/^[A-Za-z]/.test(s)) return false;
  const bad = (s.match(/[^A-Za-z\s\-',\.\/\&]/g) || []).length;
  if (bad / s.length > 0.25) return false;
  return true;
}

function looksLikeAddress(s) {
  return /\d/.test(s) && /[A-Za-z]{3}/.test(s) && s.length >= 5;
}

function extractCityZipPhone(bytes, offset, maxLen) {
  const block = bytesToString(bytes, offset, offset + maxLen);
  
  // Pattern: CITY, STATE ZIP PHONE
  const m = block.match(/^([A-Z][A-Z\s\.]+),\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s+([\d\(\)\-\.\s]{7,20})/);
  if (m) {
    return {
      city: m[1].trim(),
      state: m[2].trim(),
      zip: m[3].trim(),
      phone: m[4].replace(/[^\d\-\(\)]/g, '').trim(),
    };
  }
  
  // Fallback: just city, state, zip
  const m2 = block.match(/^([A-Z][A-Z\s\.]+),\s+([A-Z]{2})\s+(\d{5})/);
  if (m2) {
    return {
      city: m2[1].trim(),
      state: m2[2].trim(),
      zip: m2[3].trim(),
      phone: '',
    };
  }
  
  return null;
}

function extractCustomerFromRecord(bytes, recordOffset, recordIndex) {
  if (recordOffset + RECORD_SIZE > bytes.length) return null;

  // Field layout (discovered via Prober):
  // +6: ~22 bytes — Name variant 1
  // +30: ~21 bytes — Name variant 2 (cleanest)
  // +53: ~17 bytes — Address
  // +80: ~44 bytes — City, State, Zip, Phone
  // +206: ~10 bytes — Account number
  // +532: ~20 bytes — Full name or company (COUNTRY INN MCALLEN hit here)

  const name1 = extractTextRun(bytes, recordOffset + 6, 22);
  const name2 = extractTextRun(bytes, recordOffset + 30, 21);
  const address = extractTextRun(bytes, recordOffset + 53, 17);
  const cityBlock = bytesToString(bytes, recordOffset + 80, recordOffset + 80 + 44);
  const accountNum = extractTextRun(bytes, recordOffset + 206, 10);
  const name3 = extractTextRun(bytes, recordOffset + 532, 20);

  // Pick the cleanest name
  let fullName = '';
  for (const name of [name2, name1, name3]) {
    const cleaned = cleanName(name);
    if (looksLikeName(cleaned) && cleaned.length <= 50) {
      fullName = cleaned;
      break;
    }
  }

  if (!fullName) return null;

  // Parse city/state/zip/phone
  const cityData = extractCityZipPhone(bytes, recordOffset + 80, 44);
  if (!cityData) return null;

  return {
    fullName,
    phone: cityData.phone || '',
    address: looksLikeAddress(address) ? address : '',
    city: cityData.city || '',
    state: cityData.state || '',
    zipCode: cityData.zip || '',
    accountNumber: accountNum || '',
    migrationSource: 'cu_fixed_width',
    migrationSessionId: null,
    recordIndex,
  };
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

    // Extract records from this chunk
    const customers = [];
    let recordStartInChunk = 0;
    let globalRecordIndex = chunkIndex * Math.floor(bytes.length / RECORD_SIZE);
    let totalAttempted = 0;

    while (recordStartInChunk + RECORD_SIZE <= bytes.length) {
      const customer = extractCustomerFromRecord(bytes, recordStartInChunk, globalRecordIndex);
      totalAttempted++;
      if (customer) {
        customer.migrationSessionId = sessionId;
        customers.push(customer);
      }
      recordStartInChunk += RECORD_SIZE;
      globalRecordIndex++;
    }

    console.log(`[Chunk ${chunkIndex}] Attempted ${totalAttempted} records, extracted ${customers.length}`);

    // Bulk insert
    let insertedCount = 0;
    if (customers.length > 0) {
      for (let i = 0; i < customers.length; i += 50) {
        const batch = customers.slice(i, i + 50);
        await base44.entities.CproContact.bulkCreate(batch);
        insertedCount += batch.length;
      }
    }

    return Response.json({
      success: true,
      chunkIndex,
      totalChunks,
      recordsExtracted: customers.length,
      insertedCount,
      isLastChunk: chunkIndex === totalChunks - 1,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});