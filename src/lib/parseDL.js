/**
 * AAMVA PDF417 Driver's License Parser
 * Parses the raw string output from a 2D barcode scanner reading a US/Canada DL.
 * AAMVA standard: https://www.aamva.org/identity/aamva-dl-id-card-design-standard/
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
  DAR: 'vehicleClass',
  DAS: 'restrictions',
  DAT: 'endorsements',
  DBC: 'sex',            // 1=Male, 2=Female
  DAU: 'height',
  DAY: 'eyeColor',
};

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

export function parseDLBarcode(raw) {
  if (!raw) return null;

  // Detect AAMVA header
  if (!raw.includes('@') && !raw.includes('ANSI')) return null;

  const result = {};

  // Split on newlines or carriage returns
  const lines = raw.split(/[\r\n]+/);

  for (const line of lines) {
    const code = line.slice(0, 3);
    const value = line.slice(3).trim();
    if (FIELD_MAP[code] && value) {
      result[FIELD_MAP[code]] = value;
    }
  }

  if (Object.keys(result).length === 0) return null;

  // Normalize name — some states put full name in DAA
  if (result.fullName && !result.lastName) {
    const parts = result.fullName.split(',');
    if (parts.length >= 2) {
      result.lastName = parts[0].trim();
      const givenParts = parts[1].trim().split(' ');
      result.firstName = givenParts[0] || '';
      result.middleName = givenParts.slice(1).join(' ') || '';
    }
  }

  // Build display name
  const first = result.firstName || '';
  const middle = result.middleName ? ` ${result.middleName}` : '';
  const last = result.lastName || '';
  const fullName = last ? `${first}${middle} ${last}`.trim() : result.fullName || '';

  // Parse dates
  const dob = parseDate(result.dob);
  const expiry = parseDate(result.expiry);

  // DL number — store last 4 only for security
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
    zip: parseZip(result.zip),
    dob,
    expiry,
    isExpired,
    dlLast4,
    dlNumber,         // full number — only store last4 in DB
    country: result.country || 'USA',
    sex: result.sex === '1' ? 'M' : result.sex === '2' ? 'F' : '',
    height: result.height || '',
    eyeColor: result.eyeColor || '',
  };
}