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
  DAR: 'vehicleClass',
  DAS: 'restrictions',
  DAT: 'endorsements',
  DBC: 'sex',            // 1=Male, 2=Female
  DAU: 'height',
  DAY: 'eyeColor',
  DCA: 'vehicleClass',
  DCB: 'restrictions',
  DCD: 'endorsements',
  DDK: 'organDonor',
  DDF: 'complianceType',
  DDG: 'placeOfBirth',
};

// All known 3-letter AAMVA field codes (used to split concatenated strings)
const ALL_CODES = Object.keys(FIELD_MAP).concat([
  'DDA','DDB','DDC','DDD','DDE','DDH','DDI','DDJ','DDL','DDM','DDN','DDO','DDP',
  'DCH','DCI','DCJ','DCK','DCL','DCM','DCN','DCO','DCP','DCQ','DCR','DCU','DCV','DCW','DCX','DCY','DCZ',
  'DAB','DAE','DAF','DAH','DAL','DAM','DAN','DAO','DAP','DAR','DAS','DAT','DAV','DAW','DAX',
  'DBB','DBC','DBD','DBE','DBF','DBG','DBH','DBI','DBJ','DBK','DBL','DBM','DBN','DBO','DBP','DBQ','DBR','DBS',
  'ZT','ZTA','ZTB','ZTC','ZTD','ZTE',
]);

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
 * Supports both:
 *   (a) newline-delimited: "DCS HUERTA\nDAC MANUEL\n..."
 *   (b) concatenated: "DCSHUERTADDACMANUEL..."
 */
function extractFields(raw) {
  const result = {};

  // First try newline-delimited parsing
  const lines = raw.split(/[\r\n]+/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 4) continue;
    const code = trimmed.slice(0, 3);
    const value = trimmed.slice(3).trim();
    if (FIELD_MAP[code] && value) {
      result[FIELD_MAP[code]] = value;
    }
  }

  // If we got some fields from line parsing, return (covers most states)
  if (Object.keys(result).length > 1) return result;

  // Fallback: parse concatenated format (TX and others)
  // Find the DL subfile start — look for "DL" header marker
  const dlStart = raw.indexOf('DL');
  const ztStart = raw.indexOf('ZT'); // state-specific subfile
  const workStr = dlStart >= 0 ? raw.slice(dlStart + 2) : raw;

  // Build a regex that matches any known 3-letter code followed by its value
  // Value ends at next 3-letter code boundary
  const codePattern = /([A-Z]{3})([A-Z0-9 \/\-\.]+?)(?=[A-Z]{3}[A-Z0-9]|$)/g;
  let match;
  while ((match = codePattern.exec(workStr)) !== null) {
    const code = match[1];
    const value = match[2].trim();
    if (FIELD_MAP[code] && value && value !== 'NONE' && value !== 'ANSI') {
      result[FIELD_MAP[code]] = value;
    }
  }

  return result;
}

export function parseDLBarcode(raw) {
  if (!raw) return null;

  // Detect AAMVA header — must contain @ (start), ANSI, or AAMVA
  // Also accept if it contains common AAMVA field codes near the start
  const looksLikeDL = raw.includes('@') || raw.includes('ANSI') || raw.includes('AAMVA') || /D[ABCRS][A-Z]/.test(raw.slice(0, 50));
  if (!looksLikeDL) return null;

  const result = extractFields(raw);

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