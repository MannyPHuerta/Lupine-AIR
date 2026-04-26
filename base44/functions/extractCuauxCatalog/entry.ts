import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Extract runs of printable ASCII (min length 8) from a byte slice
function extractTextRuns(bytes, start, len) {
  const MIN_RUN = 8;
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

// Clean a raw text run into candidate equipment name tokens
function cleanAndSplit(raw) {
  // Strip leading > or . prefix chars
  const cleaned = raw.replace(/^[>.]+/, '').trim();

  // Split on sequences of non-name chars (control suffixes like " 5", " 1", " -", " %", " e", " i", etc.)
  // We split on: trailing single char + optional whitespace at boundaries between names
  // Names are separated by a short suffix char followed by whitespace or end
  const parts = cleaned.split(/\s+[a-z%\-\d]{1,3}\s+(?=[A-Z])/);

  const results = [];
  for (const part of parts) {
    // Remove trailing junk: single chars, numbers, punctuation at end
    const trimmed = part.replace(/\s+[a-z%\-\d]{1,6}$/, '').trim();
    // Must be mostly uppercase, at least 6 chars, contain a letter
    if (
      trimmed.length >= 6 &&
      /[A-Z]/.test(trimmed) &&
      // At least 60% uppercase letters or spaces or digits or common punct
      (trimmed.match(/[A-Z0-9 ',\-\.\/\(\)"#]/g) || []).length / trimmed.length > 0.6
    ) {
      results.push(trimmed);
    }
  }
  return results;
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

    // Extract all text runs from the entire chunk
    const runs = extractTextRuns(bytes, 0, bytes.length);

    const names = new Set();
    for (const run of runs) {
      const candidates = cleanAndSplit(run);
      for (const c of candidates) {
        names.add(c);
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