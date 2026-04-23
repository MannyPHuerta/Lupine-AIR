import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// deno-lint-ignore no-undef
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { base64Data } = await req.json();
    if (!base64Data) {
      return Response.json({ error: 'base64Data required' }, { status: 400 });
    }

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Analyze binary structure
    const fields = detectFieldBoundaries(bytes);
    const samples = extractSamples(bytes, fields);

    return Response.json({
      success: true,
      totalBytes: bytes.length,
      fields,
      samples,
      hexPreview: bytes.slice(0, 256).map(b => b.toString(16).padStart(2, '0')).join(' '),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function detectFieldBoundaries(bytes) {
  const fields = [];
  let currentFieldStart = 0;
  let nullSequence = 0;
  const nullThreshold = 4; // 4+ consecutive nulls = field boundary

  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      nullSequence++;
      if (nullSequence === nullThreshold && currentFieldStart < i - nullThreshold) {
        // Field boundary detected
        fields.push({
          startOffset: currentFieldStart,
          endOffset: i - nullThreshold,
          size: i - nullThreshold - currentFieldStart,
          content: extractText(bytes, currentFieldStart, i - nullThreshold),
        });
        currentFieldStart = i;
        nullSequence = 0;
      }
    } else {
      nullSequence = 0;
    }
  }

  // Remaining data
  if (currentFieldStart < bytes.length) {
    fields.push({
      startOffset: currentFieldStart,
      endOffset: bytes.length,
      size: bytes.length - currentFieldStart,
      content: extractText(bytes, currentFieldStart, bytes.length),
    });
  }

  return fields;
}

function extractText(bytes, start, end) {
  try {
    const slice = bytes.slice(start, end);
    const text = new TextDecoder('utf-8', { fatal: false }).decode(slice);
    return text.replace(/[^\x20-\x7E\n\r\t]/g, '?').trim();
  } catch {
    return '(binary)';
  }
}

function extractSamples(bytes, fields) {
  return fields.slice(0, 10).map((field, i) => ({
    fieldIndex: i,
    preview: field.content.substring(0, 50),
    size: field.size,
    offset: field.startOffset,
  }));
}