import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Pattern-based CPro extractor
// Anchor: ", ST % ZIPCODE PHONE" pattern in each customer block
// Structure before anchor: ... [acct#] [name] [name2] [name3] [address] [CITY, ST %]

function isPrintable(b) { return b >= 0x20 && b <= 0x7E; }

function bytesToString(bytes, start, end) {
  let s = '';
  for (let i = start; i < Math.min(end, bytes.length); i++) {
    s += isPrintable(bytes[i]) ? String.fromCharCode(bytes[i]) : '\x00';
  }
  return s.replace(/\x00+/g, ' ').trim();
}

// Extract consecutive printable text runs backwards from a position.
// Returns array of {text, start, end} runs separated by non-printable gaps.
function extractRunsBackward(bytes, from, maxBytesToScan) {
  const runs = [];
  let pos = from - 1;
  const limit = Math.max(0, from - maxBytesToScan);

  while (pos >= limit) {
    // Skip non-printable gap
    while (pos >= limit && !isPrintable(bytes[pos])) pos--;
    if (pos < limit) break;

    // Collect printable run
    let runEnd = pos + 1;
    while (pos >= limit && isPrintable(bytes[pos])) pos--;
    let runStart = pos + 1;

    const text = bytesToString(bytes, runStart, runEnd);
    if (text.length >= 2) {
      runs.unshift({ text, start: runStart, end: runEnd });
    }
  }
  return runs;
}

function parseCityBlock(bytes, cityStart) {
  // Read up to 60 bytes from cityStart to parse "CITY, ST % ZIP PHONE"
  const block = bytesToString(bytes, cityStart, cityStart + 60);

  // Pattern: CITY, ST % ZIP PHONE  (% is a separator byte in CPro)
  const m = block.match(/^([A-Z][A-Z\s\.]+),\s+([A-Z]{2})\s+%?\s*(\d{5}(?:-\d{4})?)\s+([\d\(\)\-\.\s]{7,20})/);
  if (m) {
    return {
      city: m[1].trim(),
      state: m[2].trim(),
      zipCode: m[3].trim(),
      phone: m[4].replace(/[^\d\-\(\)]/g, '').trim(),
    };
  }
  // Fallback: no phone in this block
  const m2 = block.match(/^([A-Z][A-Z\s\.]+),\s+([A-Z]{2})\s+%?\s*(\d{5})/);
  if (m2) {
    const rest = block.slice(m2[0].length);
    const pm = rest.match(/\d[\d\-\(\)]{6,}/);
    return {
      city: m2[1].trim(),
      state: m2[2].trim(),
      zipCode: m2[3].trim(),
      phone: pm ? pm[0].replace(/[^\d\-\(\)]/g, '').trim() : '',
    };
  }
  return null;
}

// Clean a name: remove leading/trailing punctuation artifacts
function cleanName(s) {
  return s
    .replace(/^[\s'#+\*\|!\.\,\+]+/, '')  // leading junk
    .replace(/[\s!#\*\|]+$/, '')           // trailing junk
    .trim();
}

// Clean an address: remove leading punctuation artifacts
function cleanAddress(s) {
  return s
    .replace(/^[\s'#+\*\|\.\,]+/, '')
    .trim();
}

// A string looks like a person/company name
function looksLikeName(s) {
  if (!s || s.length < 3) return false;
  const alpha = (s.match(/[A-Za-z]/g) || []).length;
  if (alpha < 3) return false;
  // Must start with a letter
  if (!/^[A-Za-z]/.test(s)) return false;
  // Reject if too many non-alpha-space chars (garbage)
  const bad = (s.match(/[^A-Za-z\s\-',\.\/\&]/g) || []).length;
  if (bad / s.length > 0.25) return false;
  return true;
}

// A string looks like a street address
function looksLikeAddress(s) {
  // Must contain a digit (street number) and some alpha
  return /\d/.test(s) && /[A-Za-z]{3}/.test(s) && s.length >= 5;
}

function extractAccountNumber(bytes, searchEnd) {
  // Look for 8-digit zero-padded account numbers in the ~300 bytes before city
  const searchStart = Math.max(0, searchEnd - 350);
  const block = bytesToString(bytes, searchStart, searchEnd);
  const matches = block.match(/0{2,}\d{4,8}/g);
  return matches ? matches[matches.length - 1] : '';
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

    // Find all ", ST %" anchors: comma + space + 2 uppercase letters + space + %
    const cityPositions = new Set();

    for (let i = 0; i < bytes.length - 6; i++) {
      if (
        bytes[i] === 0x2C &&           // ','
        bytes[i+1] === 0x20 &&         // ' '
        bytes[i+2] >= 0x41 && bytes[i+2] <= 0x5A && // A-Z
        bytes[i+3] >= 0x41 && bytes[i+3] <= 0x5A && // A-Z
        bytes[i+4] === 0x20 &&         // ' '
        (bytes[i+5] === 0x25 || (bytes[i+5] >= 0x30 && bytes[i+5] <= 0x39)) // '%' or digit
      ) {
        // Walk back to find city name start (up to 40 bytes)
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
      // Only accept valid US states (2 uppercase letters, sanity check)
      if (!/^[A-Z]{2}$/.test(parsed.state)) continue;

      // Extract runs backward from cityStart to find address and name
      const runs = extractRunsBackward(bytes, cityStart, 200);

      // The run immediately before city = address
      // The run before that = name (one of possibly 3 name copies)
      // Strategy: find the last run that looks like an address,
      // then take the run before it as the name.

      let address = '';
      let fullName = '';

      // Work backwards through runs
      // runs are in order [oldest ... newest] (newest = closest to cityStart)
      let addressIdx = -1;
      for (let ri = runs.length - 1; ri >= 0; ri--) {
        if (looksLikeAddress(runs[ri].text)) {
          addressIdx = ri;
          break;
        }
      }

      if (addressIdx >= 0) {
        address = cleanAddress(runs[addressIdx].text);
        // Name is one of the runs before the address
        // There are 3 name copies; take the cleanest one (prefer no leading punct)
        for (let ri = addressIdx - 1; ri >= Math.max(0, addressIdx - 4); ri--) {
          const candidate = cleanName(runs[ri].text);
          if (looksLikeName(candidate) && candidate.length <= 40) {
            fullName = candidate;
            // Prefer the version without prefix punctuation in the raw text
            if (!/^[\s'#+]/.test(runs[ri].text)) break;
          }
        }
      } else {
        // No address found — try to at least get a name
        if (runs.length >= 1) {
          const candidate = cleanName(runs[runs.length - 1].text);
          if (looksLikeName(candidate)) fullName = candidate;
        }
      }

      if (!looksLikeName(fullName)) continue;
      // Reject names that look like they contain address data
      if (looksLikeAddress(fullName) && /^\d/.test(fullName)) continue;

      const accountNumber = extractAccountNumber(bytes, cityStart);

      contacts.push({
        fullName,
        phone: parsed.phone,
        address,
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