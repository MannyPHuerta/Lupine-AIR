import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Pattern-based CPro extractor
// Each customer block contains: CITY, ST % ZIP PHONE
// We scan the chunk for that pattern and extract fields relative to it.

function isPrintable(b) { return b >= 0x20 && b <= 0x7E; }

function bytesToString(bytes, start, end) {
  let s = '';
  for (let i = start; i < Math.min(end, bytes.length); i++) {
    s += isPrintable(bytes[i]) ? String.fromCharCode(bytes[i]) : '\x00';
  }
  return s.replace(/\x00+/g, ' ').trim();
}

// Find all occurrences of an ASCII pattern in bytes
function findAll(bytes, pattern) {
  const hits = [];
  const p = pattern.split('').map(c => c.charCodeAt(0));
  outer: for (let i = 0; i <= bytes.length - p.length; i++) {
    for (let j = 0; j < p.length; j++) {
      if (bytes[i + j] !== p[j]) continue outer;
    }
    hits.push(i);
  }
  return hits;
}

// Extract a clean printable run backwards from pos (to find name/address before the city line)
function extractRunBackward(bytes, from, maxLen) {
  // Walk back through printable bytes to find a good text run
  let end = from;
  // Skip non-printable bytes immediately before
  while (end > 0 && !isPrintable(bytes[end - 1])) end--;
  let start = end;
  let runLen = 0;
  while (start > 0 && runLen < maxLen) {
    const b = bytes[start - 1];
    if (isPrintable(b)) {
      start--;
      runLen++;
    } else {
      break;
    }
  }
  return bytesToString(bytes, start, end);
}

// Given position of "CITY, ST %" pattern, extract a clean name going backwards
// Structure before city line: ... [account#] [name variants] [address] [CITY, ST %]
// We look for a text run 20-80 bytes before the city marker
function extractFieldBefore(bytes, cityPos, skipBack, fieldLen) {
  const end = cityPos - skipBack;
  const start = Math.max(0, end - fieldLen);
  return bytesToString(bytes, start, end);
}

function parseCityBlock(bytes, cityPos) {
  // From cityPos, read forward to get "CITY, ST % ZIP PHONE"
  // The % is a separator, after it comes: ZIP (5 digits) + space + phone
  const block = bytesToString(bytes, cityPos, cityPos + 50);

  // Match: CITY, ST % ZIP PHONE  or  CITY, ST ZIP PHONE
  const m = block.match(/^([A-Z][^,]+),\s+([A-Z]{2})\s+%?\s*(\d{5}(?:-\d{4})?)\s+([\d\(\)\-\.\s]{7,20})/);
  if (m) {
    return {
      city: m[1].trim(),
      state: m[2].trim(),
      zipCode: m[3].trim(),
      phone: m[4].replace(/[^\d\-\(\)]/g, '').trim(),
    };
  }
  // Fallback: try without phone
  const m2 = block.match(/^([A-Z][^,]+),\s+([A-Z]{2})\s+%?\s*(\d{5})/);
  if (m2) {
    // Try to find phone further along
    const rest = block.slice(m2[0].length);
    const pm = rest.match(/\d[\d\-\(\)\s]{6,}/);
    return {
      city: m2[1].trim(),
      state: m2[2].trim(),
      zipCode: m2[3].trim(),
      phone: pm ? pm[0].replace(/[^\d\-\(\)]/g, '').trim() : '',
    };
  }
  return null;
}

function looksLikeName(s) {
  if (!s || s.length < 3) return false;
  const alpha = (s.match(/[A-Za-z]/g) || []).length;
  if (alpha < 3) return false;
  const bad = (s.match(/[^A-Za-z\s\-',\.\/]/g) || []).length;
  if (bad / s.length > 0.3) return false;
  // Must start with a letter
  if (!/^[A-Za-z]/.test(s.trim())) return false;
  return true;
}

function cleanName(s) {
  // Remove leading punctuation chars like ', #, +
  return s.replace(/^[\s'#+\*\|]+/, '').trim();
}

function extractAccountNumber(bytes, cityPos) {
  // Account numbers look like 8-digit zero-padded strings e.g. "00028291"
  // They appear ~140-280 bytes before the city line
  const searchStart = Math.max(0, cityPos - 300);
  const searchEnd = cityPos - 100;
  const block = bytesToString(bytes, searchStart, searchEnd);
  const m = block.match(/0{2,}\d{4,8}/g);
  if (m && m.length > 0) return m[m.length - 1]; // take the last/closest one
  return '';
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

    // Find all "CITY, ST %" anchor patterns in this chunk
    // We look for ", TX %" as the most common pattern (and ", TX " followed by 5 digits)
    // More broadly: look for ", [A-Z][A-Z] %" or ", [A-Z][A-Z] \d\d\d\d\d"
    const statePatterns = [
      ', TX %', ', TX\x00%', 
    ];

    const cityPositions = new Set();

    for (const pat of statePatterns) {
      for (const pos of findAll(bytes, pat)) {
        // Walk back to find start of city name (up to 40 bytes)
        let cityStart = pos;
        while (cityStart > 0 && isPrintable(bytes[cityStart - 1]) && (pos - cityStart) < 40) {
          cityStart--;
        }
        cityPositions.add(cityStart);
      }
    }

    // Also scan for other state patterns: ", [A-Z][A-Z] %" 
    // by looking for comma + space + 2 uppercase + space + %
    for (let i = 0; i < bytes.length - 6; i++) {
      if (
        bytes[i] === 0x2C && // ','
        bytes[i+1] === 0x20 && // ' '
        bytes[i+2] >= 0x41 && bytes[i+2] <= 0x5A && // uppercase
        bytes[i+3] >= 0x41 && bytes[i+3] <= 0x5A && // uppercase
        bytes[i+4] === 0x20 && // ' '
        bytes[i+5] === 0x25   // '%'
      ) {
        // Walk back to find city start
        let cityStart = i;
        while (cityStart > 0 && isPrintable(bytes[cityStart - 1]) && (i - cityStart) < 40) {
          cityStart--;
        }
        cityPositions.add(cityStart);
      }
    }

    const contacts = [];
    const seenPositions = new Set();

    for (const cityStart of [...cityPositions].sort((a, b) => a - b)) {
      if (seenPositions.has(cityStart)) continue;
      seenPositions.add(cityStart);

      const parsed = parseCityBlock(bytes, cityStart);
      if (!parsed) continue;

      // Extract address: text run immediately before city (10-30 bytes back)
      // There are usually non-printable bytes separating fields
      let addrEnd = cityStart;
      while (addrEnd > 0 && !isPrintable(bytes[addrEnd - 1])) addrEnd--;
      let addrStart = addrEnd;
      while (addrStart > 0 && isPrintable(bytes[addrStart - 1]) && (addrEnd - addrStart) < 35) {
        addrStart--;
      }
      const rawAddress = bytesToString(bytes, addrStart, addrEnd);

      // Extract name: text run before address (skip non-printable gap)
      let nameEnd = addrStart;
      while (nameEnd > 0 && !isPrintable(bytes[nameEnd - 1])) nameEnd--;
      let nameStart = nameEnd;
      while (nameStart > 0 && isPrintable(bytes[nameStart - 1]) && (nameEnd - nameStart) < 35) {
        nameStart--;
      }
      const rawName = cleanName(bytesToString(bytes, nameStart, nameEnd));

      if (!looksLikeName(rawName)) continue;

      const accountNumber = extractAccountNumber(bytes, cityStart);

      contacts.push({
        fullName: rawName,
        phone: parsed.phone,
        address: rawAddress,
        city: parsed.city,
        state: parsed.state,
        zipCode: parsed.zipCode,
        accountNumber,
        migrationSource: 'dbf_cpro',
        migrationSessionId: sessionId,
        notes: '',
      });
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