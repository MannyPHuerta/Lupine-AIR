/**
 * AAMVA PDF417 Driver's License Parser
 * Parses the raw string output from a 2D barcode scanner reading a US/Canada DL.
 * AAMVA standard: https://www.aamva.org/identity/aamva-dl-id-card-design-standard/
 *
 * Handles both newline-delimited AND concatenated field formats (e.g. TX).
 */

const FIELD_MAP = {
  DAA: 'fullName',       // Full name (some states)
  DCS: 'lastName',
  DCT: 'firstName',      // First + middle (some states)
  DAC: 'firstName',
  DAD: 'middleName',
  DBB: 'dob',            // Date of birth MMDDYYYY
  DBA: 'expiry',         // Expiry date MMDDYYYY
  DBD: 'issued',         // Issue date
  DAG: 'address',
  DAI: 'city',
  DAJ: 'state',
  DAK: 'zip',
  DAQ: 'dlNumber',       // License number
  DCF: 'documentId',
  DCG: 'country',
  DBC: 'sex',            // 1=Male, 2=Female
  DAU: 'height',
  DAY: 'eyeColor',
  DCA: 'vehicleClass',
  DCB: 'restrictions',
  DCD: 'endorsements',
};

// KEY fields — if we find at least 3 of these, the parse is considered valid
const KEY_FIELDS = ['lastName', 'firstName', 'address', 'city', 'state', 'zip', 'dob', 'fullName'];

function parseDate(raw) {
  if (!raw || raw.length < 8) return '';
  // MMDDYYYY → YYYY-MM-DD
  const mm = raw.slice(0, 2);
  const dd = raw.slice(2, 4);
  const yyyy = raw.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

function parseZip(raw) {
  if (!raw) return '';
  // Zips are padded to 9 chars with trailing zeros or dashes
  const clean = raw.replace(/-/g, '').replace(/0+$/, '');
  return clean.slice(0, 5);
}

/**
 * Extract fields from a raw AAMVA string.
 *
 * Strategy:
 *   1. Split on newlines, parse each line as "CODE value" — skip header lines.
 *   2. If we get ≥ 3 key fields, use those results.
 *   3. Otherwise fall back to concatenated regex scan.
 */
function extractFields(raw) {
  const result = {};

  // --- Pass 1: newline-delimited ---
  // Each AAMVA field line starts with exactly 3 uppercase letters followed by the value.
  // Header lines (like "@\n", "ANSI ...", subfile designators) won't match this pattern.
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    // A valid field line: starts with exactly 3 uppercase letters, then at least 1 char
    if (line.length < 4) continue;
    const code = line.slice(0, 3);
    if (!/^[A-Z]{3}$/.test(code)) continue;
    if (!(code in FIELD_MAP)) continue;
    const value = line.slice(3).trim();
    if (value && value !== 'NONE') {
      result[FIELD_MAP[code]] = value;
    }
  }

  // Count how many KEY fields we found
  const keyCount = KEY_FIELDS.filter(f => result[f]).length;
  if (keyCount >= 3) {
    console.log('[parseDL] newline parse succeeded, key fields:', keyCount);
    return result;
  }

  console.log('[parseDL] newline parse weak (' + keyCount + ' key fields), trying concatenated fallback');

  // --- Pass 2: concatenated format (TX and others) ---
  // Strip everything before the "DL" subfile marker
  const dlIdx = raw.indexOf('\nDL');
  const workStr = dlIdx >= 0 ? raw.slice(dlIdx + 3) : raw;

  // Match pattern: 3 uppercase letters followed by value up to next 3-letter code
  // Values can contain spaces, digits, slashes, dashes, periods — but NOT newlines
  const codePattern = /([A-Z]{3})([^\r\n]{1,40}?)(?=[A-Z]{3}[A-Z0-9]|\r|\n|$)/g;
  let match;
  while ((match = codePattern.exec(workStr)) !== null) {
    const code = match[1];
    if (!(code in FIELD_MAP)) continue;
    const value = match[2].trim();
    if (value && value !== 'NONE' && value !== 'ANSI') {
      // Don't overwrite a field already found by newline parse
      if (!result[FIELD_MAP[code]]) {
        result[FIELD_MAP[code]] = value;
      }
    }
  }

  return result;
}

export function parseDLBarcode(raw) {
  if (!raw) return null;

  // Must look like an AAMVA barcode
  const looksLikeDL =
    raw.includes('@') ||
    raw.includes('ANSI') ||
    raw.includes('AAMVA') ||
    /\n[A-Z]{3}/.test(raw);          // has newline-prefixed field codes

  if (!looksLikeDL) return null;

  console.log('[parseDL] raw length:', raw.length, '| first 80:', JSON.stringify(raw.slice(0, 80)));

  const result = extractFields(raw);
  console.log('[parseDL] extracted fields:', result);

  if (Object.keys(result).length === 0) return null;

  // Normalize name — some states put full name in DAA as "LAST,FIRST MIDDLE"
  if (result.fullName && !result.lastName) {
    const commaIdx = result.fullName.indexOf(',');
    if (commaIdx > 0) {
      result.lastName = result.fullName.slice(0, commaIdx).trim();
      const given = result.fullName.slice(commaIdx + 1).trim().split(/\s+/);
      result.firstName = given[0] || '';
      result.middleName = given.slice(1).join(' ') || '';
    } else {
      // No comma — treat whole thing as full name
      const parts = result.fullName.trim().split(/\s+/);
      result.lastName = parts[parts.length - 1] || '';
      result.firstName = parts.slice(0, -1).join(' ') || '';
    }
  }

  // DCT may contain "FIRST MIDDLE" combined
  if (result.firstName && result.firstName.includes(' ') && !result.middleName) {
    const parts = result.firstName.trim().split(/\s+/);
    result.firstName = parts[0];
    result.middleName = parts.slice(1).join(' ');
  }

  // Build display name
  const first = result.firstName || '';
  const middle = result.middleName ? ` ${result.middleName}` : '';
  const last = result.lastName || '';
  const fullName = last ? `${first}${middle} ${last}`.trim() : result.fullName || '';

  // Parse dates
  const dob = parseDate(result.dob);
  const expiry = parseDate(result.expiry);

  // DL number — keep full for reference, store last 4 separately
  const dlNumber = result.dlNumber || '';
  const dlLast4 = dlNumber.slice(-4);

  // Check expiry
  const isExpired = expiry ? new Date(expiry) < new Date() : false;

  return {
    fullName,
    firstName: first,
    lastName: last,
    middleName: result.middleName || '',
    address: result.address || '',
    city: result.city || '',
    state: result.state || '',
    zip: parseZip(result.zip || ''),
    dob,
    expiry,
    isExpired,
    dlLast4,
    dlNumber,
    country: result.country || 'USA',
    sex: result.sex === '1' ? 'M' : result.sex === '2' ? 'F' : '',
    height: result.height || '',
    eyeColor: result.eyeColor || '',
  };
}