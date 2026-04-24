import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Extract printable ASCII text runs from binary data
function extractTextRuns(bytes, minLength = 4) {
  const runs = [];
  let current = '';
  let startOffset = 0;

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    // Printable ASCII: 0x20-0x7E
    if (b >= 0x20 && b <= 0x7E) {
      if (current.length === 0) startOffset = i;
      current += String.fromCharCode(b);
    } else {
      if (current.length >= minLength) {
        runs.push({ text: current.trim(), offset: startOffset });
      }
      current = '';
    }
  }
  if (current.length >= minLength) {
    runs.push({ text: current.trim(), offset: startOffset });
  }
  return runs;
}

// Match a phone number pattern (7-digit local, 10-digit, or 11-digit with area code)
function isPhone(text) {
  return /^(\d{3}-\d{3}-\d{4}|\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\(\d{3}\)\s?\d{3}-\d{4}|\d{10,11}|[\d]{3}-[\d]{3,4})$/.test(text.trim());
}

// Match an ALL CAPS name (2+ words, letters only, possibly with spaces)
function isName(text) {
  const t = text.trim();
  // Must be at least 2 words, all uppercase letters/spaces/periods, reasonable length
  return /^[A-Z][A-Z\s\.\-]{4,39}$/.test(t) && t.split(/\s+/).length >= 2 && !/^\s*$/.test(t);
}

// Given a sorted list of (offset, text) runs, group nearby runs into records
// Records in TPS files tend to cluster — names and phones appear close together
function groupIntoContacts(runs) {
  if (runs.length === 0) return [];

  const contacts = [];
  let group = [runs[0]];

  for (let i = 1; i < runs.length; i++) {
    const prev = runs[i - 1];
    const curr = runs[i];
    // If within 600 bytes of previous run, same group
    if (curr.offset - (prev.offset + prev.text.length) < 600) {
      group.push(curr);
    } else {
      contacts.push(group);
      group = [curr];
    }
  }
  contacts.push(group);
  return contacts;
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

    // Decode base64 chunk
    const binaryString = atob(chunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i) & 0xff;
    }

    // Extract text runs
    const runs = extractTextRuns(bytes, 4);

    // Group into potential contact clusters
    const groups = groupIntoContacts(runs);

    // From each group, try to identify names and phones
    const contacts = [];
    for (const group of groups) {
      const texts = group.map(r => r.text.trim()).filter(t => t.length > 2);
      
      const names = texts.filter(isName);
      const phones = texts.filter(isPhone);

      if (names.length > 0 || phones.length > 0) {
        // Pick the longest name (most complete)
        const name = names.sort((a, b) => b.length - a.length)[0] || null;
        const phone = phones[0] || null;

        // Only add if we have at least a name or phone
        if (name || phone) {
          // Avoid duplicates within this chunk
          const key = `${name}|${phone}`;
          if (!contacts.find(c => `${c.fullName}|${c.phone}` === key)) {
            contacts.push({
              fullName: name || '',
              phone: phone || '',
              migrationSource: 'dbf_cpro',
              migrationSessionId: sessionId,
              notes: texts.filter(t => !isName(t) && !isPhone(t) && t.length > 3).slice(0, 3).join(' | '),
            });
          }
        }
      }
    }

    // Bulk insert contacts
    let insertedCount = 0;
    for (let i = 0; i < contacts.length; i += 50) {
      const batch = contacts.slice(i, i + 50);
      if (batch.length > 0) {
        const created = await base44.entities.CproContact.bulkCreate(batch);
        insertedCount += created.length;
      }
    }

    return Response.json({
      success: true,
      chunkIndex,
      totalChunks,
      runsFound: runs.length,
      contactsFound: contacts.length,
      insertedCount,
      isLastChunk: chunkIndex === totalChunks - 1,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});