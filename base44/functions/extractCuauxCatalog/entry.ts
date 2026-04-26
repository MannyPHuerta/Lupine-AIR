import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Extract runs of printable ASCII (min length 6) from a byte slice
function extractTextRuns(bytes, start, len) {
  const MIN_RUN = 6;
  const runs = [];
  let run = '';

  for (let i = start; i < start + len && i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 0x20 && b <= 0x7E) {
      run += String.fromCharCode(b);
    } else {
      if (run.length >= MIN_RUN) runs.push(run);
      run = '';
    }
  }
  if (run.length >= MIN_RUN) runs.push(run);
  return runs;
}

// Equipment name patterns — must look like a real equipment catalog entry
// Format: starts with capital letter, mostly uppercase words, no digits-only,
// no credit card patterns, no sentence punctuation like ! ? . at start
function isEquipmentName(str) {
  const s = str.trim();

  // Must be 4–80 chars
  if (s.length < 4 || s.length > 80) return false;

  // Must start with an uppercase letter
  if (!/^[A-Z]/.test(s)) return false;

  // Reject if starts with common non-equipment words
  const badStarts = [
    'DO NOT', 'CALL ', 'CUSTOMER', 'ACCOUNT', 'PLEASE', 'NOTE',
    'CARD', 'PHONE', 'FAX', 'CREDIT', 'DEBIT', 'RENTAL', 'PAYMENT',
    'INVOICE', 'BALANCE', 'DEPOSIT', 'RECEIPT', 'CHARGE', 'TAX',
    'ADDRESS', 'CITY', 'STATE', 'ZIP', 'INSURANCE', 'PO BOX',
    'CONTACT', 'EMAIL', 'OWNER', 'MANAGER', 'DRIVER', 'EMPLOYEE',
    'OLD ', 'NEW ', 'SEE ', 'REF ', 'PER ', 'GET ', 'ASK ',
    'THIS ', 'THAT ', 'WHEN ', 'NEED ', 'SEND ', 'MAKE ', 'KEEP ',
    'MUST', 'WILL', 'DOES', 'THEY', 'ALSO', 'ONLY', 'EACH',
    'SAME', 'WITH', 'FROM', 'HAVE', 'BEEN', 'WERE', 'THEIR',
    'REAL ', 'FARM ', 'MEDIUM', 'SMALL', 'LARGE',
    'AMEX', 'VISA', 'MASTER', 'DISC',
    'MC ', 'VI ', 'AM ', 'DI ',
  ];
  for (const bad of badStarts) {
    if (s.toUpperCase().startsWith(bad)) return false;
  }

  // Reject if contains credit card-like patterns (4 groups of 4 digits)
  if (/\d{4}[-\s]\d{4}/.test(s)) return false;

  // Reject if contains sentence-ending punctuation or email/url
  if (/[!?@#$%^&*=<>]/.test(s)) return false;

  // Reject if it's mostly digits
  const digitCount = (s.match(/\d/g) || []).length;
  if (digitCount / s.length > 0.4) return false;

  // Reject if it contains too many lowercase words (it's a sentence/note)
  const words = s.split(/\s+/);
  const lowercaseWords = words.filter(w => /^[a-z]/.test(w));
  if (lowercaseWords.length > 1) return false;

  // Reject if it contains common English filler words mid-sentence
  const fillerWords = ['the ', ' is ', ' are ', ' was ', ' for ', ' and ', ' not ', ' per '];
  const lower = s.toLowerCase();
  for (const filler of fillerWords) {
    if (lower.includes(filler)) return false;
  }

  // Must contain at least one uppercase letter sequence (an actual word)
  if (!/[A-Z]{2,}/.test(s)) return false;

  // Must be mostly uppercase letters, spaces, digits, and common equipment punctuation
  const allowedChars = (s.match(/[A-Z0-9 ',\-\.\/\(\)"]/g) || []).length;
  if (allowedChars / s.length < 0.85) return false;

  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chunk, chunkByteOffset } = await req.json();
    if (!chunk) return Response.json({ error: 'chunk required' }, { status: 400 });

    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }

    const runs = extractTextRuns(bytes, 0, bytes.length);

    const names = new Set();
    for (const run of runs) {
      // Split on null-like separators that appear between packed entries
      // Each catalog entry is typically a short clean string
      const parts = run.split(/\s{2,}|\t|\|/).map(p => p.trim());
      for (const part of parts) {
        if (isEquipmentName(part)) {
          names.add(part);
        }
      }
      // Also try the full run itself
      if (isEquipmentName(run.trim())) {
        names.add(run.trim());
      }
    }

    return Response.json({
      success: true,
      chunkByteOffset: chunkByteOffset || 0,
      names: Array.from(names),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});