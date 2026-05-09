import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RECORD_SIZE = 552;  // Fixed CPro customer record size (bytes)
const CHUNK_SIZE = 5 * 1024 * 1024;  // 5MB chunks

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

function extractCustomerFromRecord(bytes, recordOffset, recordIndex, globalByteOffset) {
  if (recordOffset + RECORD_SIZE > bytes.length) return null;

  // Field layout discovered via Prober:
  const fullName = cleanName(extractTextRun(bytes, recordOffset + 205, 21));
  const address = cleanName(extractTextRun(bytes, recordOffset + 228, 17));
  const cityStateZipPhone = bytesToString(bytes, recordOffset + 255, recordOffset + 255 + 44);

  if (!fullName || fullName.length < 2) return null;

  // Parse city, state, zip, phone from the combined field
  const cityMatch = cityStateZipPhone.match(/^([A-Z\s]+),\s+([A-Z]{2})\s+(\d{5})\s+([\d\-\(\)]+)/);
  const city = cityMatch ? cityMatch[1].trim() : '';
  const state = cityMatch ? cityMatch[2].trim() : '';
  const zipCode = cityMatch ? cityMatch[3].trim() : '';
  const phone = cityMatch ? cityMatch[4].replace(/[^\d\-\(\)]/g, '') : '';

  return {
    fullName,
    phone,
    address,
    city,
    state,
    zipCode,
    accountNumber: '',
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
    const globalByteOffset = chunkIndex * CHUNK_SIZE;

    while (recordStartInChunk + RECORD_SIZE <= bytes.length) {
      const customer = extractCustomerFromRecord(bytes, recordStartInChunk, globalRecordIndex, globalByteOffset + recordStartInChunk);
      totalAttempted++;
      if (customer) {
        customer.migrationSessionId = sessionId;
        customers.push(customer);
      }
      recordStartInChunk += RECORD_SIZE;
      globalRecordIndex++;
    }

    console.log(`[Chunk ${chunkIndex}] Attempted ${totalAttempted} records, extracted ${customers.length}`);

    // Insert all records with retry logic and throttling
    let insertedCount = 0;
    if (customers.length > 0) {
      const batchSize = 25;  // Very small batches to avoid timeouts
      const minDelayMs = 2000;  // 2s between each batch
      
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        
        let retries = 0;
        let success = false;
        while (retries < 3 && !success) {
          try {
            await base44.entities.CproContact.bulkCreate(batch);
            insertedCount += batch.length;
            success = true;
          } catch (err) {
            retries++;
            console.error(`Batch ${Math.floor(i / batchSize) + 1} attempt ${retries} failed: ${err.message}`);
            if (retries < 3) {
              const backoffMs = minDelayMs * Math.pow(2, retries);
              await new Promise(r => setTimeout(r, backoffMs));
            }
          }
        }
        
        if (!success) {
          throw new Error(`Failed to insert batch after 3 retries at record ${i}`);
        }
        
        // Delay before next batch
        if (i + batchSize < customers.length) {
          await new Promise(r => setTimeout(r, minDelayMs));
        }
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