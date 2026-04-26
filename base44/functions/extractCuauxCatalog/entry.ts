import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EQUIPMENT_KEYWORDS = [
  'GENERATOR', 'COMPRESSOR', 'WELDER', 'WELDING',
  'LIFT', 'SCISSOR', 'BOOM LIFT', 'FORKLIFT', 'TELEHANDLER',
  'EXCAVATOR', 'BACKHOE', 'LOADER', 'SKID STEER', 'BULLDOZER', 'GRADER', 'DOZER',
  'TRENCHER', 'COMPACTOR', 'ROLLER', 'PAVER', 'SCREED',
  'TRAILER', 'DUMP TRUCK',
  'PUMP', 'TRASH PUMP',
  'LIGHT TOWER', 'LIGHT PLANT',
  'SAW', 'BLADE',
  'MIXER',
  'PLATE COMPACTOR', 'TAMPER', 'RAMMER',
  'PRESSURE WASHER',
  'GRINDER', 'FLOOR GRINDER', 'FLOOR SANDER',
  'CHIPPER', 'STUMP GRINDER',
  'AUGER', 'DRILL', 'BIT ',
  'HEATER', 'DEHUMIDIFIER',
  'SANDBLASTER',
  'SPRAYER', 'SPREADER',
  'MOWER', 'AERATOR', 'TILLER',
  'SCAFFOLDING', 'LADDER', 'PLANK',
  'TABLE', 'CHAIR', 'TENT', 'CANOPY', 'STAGING',
  'TRACTOR', 'SKIDSTEER',
  'BREAKER', 'JACKHAMMER',
  'CUTTER', 'STRIPPER',
  'VIBRATOR', 'POKER',
  'EDGER', 'BLOWER',
  'DETECTOR', 'LOCATOR',
  'WINCH',
  'TORCH',
  'FLOAT',
  'NAILER', 'STAPLER',
  'GLOVES', 'HELMET', 'HARNESS', 'GOGGLES',
  'CARBIDE', 'DIAMOND',
  'CHAIN SAW', 'CHAINSAW',
  'JIGSAW', 'SAWZALL',
  'CONCRETE SAW', 'DEMO SAW',
  'AIR COMPRESSOR', 'AIR MOVER',
  'WATER PUMP', 'SUBMERSIBLE',
];

function extractTextRuns(bytes) {
  const MIN_RUN = 6;
  const runs = [];
  let run = '';
  for (let i = 0; i < bytes.length; i++) {
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

// Strip leading junk chars (., -, +, ', (, space) and trailing junk (single char suffixes, trailing spaces, parens)
function cleanName(s) {
  // Strip leading non-alpha chars
  let cleaned = s.replace(/^[^A-Z0-9]+/, '');
  // Strip trailing: whitespace, then optional single non-word char(s) like ")", "-", "1", "5", "E", etc.
  cleaned = cleaned.replace(/\s+[\)\-\(\.,\d\w]{0,3}$/, '').trim();
  return cleaned;
}

function isEquipmentName(s) {
  if (!s || s.length < 4 || s.length > 100) return false;

  // No lowercase letters
  if (/[a-z]/.test(s)) return false;

  // No sentence/contact punctuation
  if (/[!?@#$%^&*=<>{}\[\]\\|~`_]/.test(s)) return false;

  // No address-like start (digits + space + word)
  if (/^\d+\s+[A-Z]/.test(s)) return false;

  // Not digit-heavy (phone/CC numbers)
  const digits = (s.match(/\d/g) || []).length;
  if (digits > 6) return false;

  // Must contain an equipment keyword
  const hasKeyword = EQUIPMENT_KEYWORDS.some(kw => s.includes(kw));
  if (!hasKeyword) return false;

  // Must be mostly letters
  const letters = (s.match(/[A-Z]/g) || []).length;
  if (letters / s.length < 0.45) return false;

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

    const runs = extractTextRuns(bytes);

    // Deduplicate on cleaned name
    const cleanedSet = new Map(); // cleaned -> best raw version

    for (const run of runs) {
      const parts = run.split(/\s{2,}|\t|\|/).map(p => p.trim()).filter(Boolean);
      const candidates = parts.length > 1 ? parts : [run];

      for (const part of candidates) {
        const cleaned = cleanName(part);
        if (isEquipmentName(cleaned)) {
          // Keep the shortest version (least trailing junk)
          if (!cleanedSet.has(cleaned) || part.length < cleanedSet.get(cleaned).length) {
            cleanedSet.set(cleaned, part);
          }
        }
      }
    }

    return Response.json({
      success: true,
      chunkByteOffset: chunkByteOffset || 0,
      names: Array.from(cleanedSet.keys()).sort(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});