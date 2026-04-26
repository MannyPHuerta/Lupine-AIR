import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EQUIPMENT_KEYWORDS = [
  'GENERATOR', 'COMPRESSOR', 'WELDER', 'WELDING',
  'SCISSOR LIFT', 'BOOM LIFT', 'FORKLIFT', 'TELEHANDLER', 'LIFT,',
  'EXCAVATOR', 'BACKHOE', 'LOADER', 'SKID STEER', 'BULLDOZER', 'GRADER', 'DOZER',
  'TRENCHER', 'COMPACTOR', 'ROLLER', 'PAVER', 'SCREED',
  'TRAILER,', 'DUMP TRUCK',
  'PUMP,', 'TRASH PUMP', 'DIAPHRAGM PUMP', 'DIAPH. PUMP',
  'LIGHT TOWER', 'LIGHT PLANT',
  'SAW,', 'SAWZALL', 'CHAINSAW', 'CHAIN SAW', 'CONCRETE SAW', 'DEMO SAW', 'JIGSAW',
  'BLADE,', 'BLADE -',
  'MIXER,',
  'TAMPER', 'RAMMER', 'PLATE COMPACTOR',
  'PRESSURE WASHER',
  'GRINDER,', 'FLOOR GRINDER', 'FLOOR SANDER',
  'CHIPPER', 'STUMP GRINDER',
  'AUGER,', 'AUGER EXT', 'DRILL,', 'BIT CARB', 'BIT,',
  'HEATER,', 'DEHUMIDIFIER',
  'SANDBLASTER',
  'SPRAYER,', 'SPREADER,',
  'MOWER,', 'AERATOR,', 'TILLER,',
  'SCAFFOLDING', 'LADDER,', 'PLANK,',
  'TABLE,', 'CHAIR,', 'TENT,', 'CANOPY,', 'STAGING',
  'TRACTOR,', 'SKIDSTEER',
  'BREAKER,', 'JACKHAMMER',
  'CUTTER,', 'STRIPPER,',
  'VIBRATOR,', 'POKER,',
  'EDGER,', 'BLOWER,',
  'DETECTOR,', 'LOCATOR,',
  'WINCH,',
  'TORCH,',
  'FLOAT,',
  'NAILER,', 'STAPLER,',
  'GLOVES,', 'HELMET,', 'HARNESS,', 'GOGGLES,',
  'CARBIDE BLADE', 'DIAMOND BLOCK',
  'AIR COMPRESSOR', 'AIR ANGLE', 'AIR TAMPER', 'AIR, ', 'AIR COMP',
  'SUBMERSIBLE PUMP',
  'INFLATABLE', 'ARCH, INFLATABLE',
  'AIRLESS SPRAYER',
  'EXTENSION CORD', 'GENERATOR SET',
  'WALK BEHIND', 'RIDING',
  'CONCRETE MIXER', 'MORTAR MIXER',
  'TILE STRIPPER', 'CERAMIC TILE',
  'CRACK CHASER', 'ROCK DRILL', 'SCALER',
  'FLOOR SAW', 'WALL SAW',
  'CORE DRILL', 'DIAMOND BLADE',
  'SCISSOR,', 'BOOM,',
  'ROTARY HAMMER', 'SDS MAX', 'SDS PLUS',
  'SANDER,', 'POLISHER,',
];

// Exact-match reject list — strings that contain keywords but are NOT equipment
const REJECT_PHRASES = [
  'BANK DEBIT', 'DEBIT CARD', 'CREDIT CARD',
  'DO NOT RENT', 'DO NOT ACCEPT',
  'ACCOUNT MADE', 'ACCOUNT CLOSED',
  'ABANDONED', 'ACCORDING TO',
  'CONTRACTOR', 'ACCOUNTANT',
  'ADDRESS CHGD', 'ADDRESS CHG',
  'PHONE:', '2ND PHONE',
  'ORDERED', 'JOBSITE',
  'ONSITE', 'MINDWINDER',
  'AVILA WELDING', // specific business name, not equipment
  'WELDING SHOP', 'WELDING SERVICE',
  'BABY HI CHAIR', // furniture, not rental equipment
  'BAR, BROWN PORTABLE',
  'BATTER UP', 'BASEBALL',
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

function cleanName(s) {
  // Strip leading non-alpha chars (digits, ., -, +, ', (, space, etc.)
  let cleaned = s.replace(/^[^A-Z]+/, '');
  // Strip trailing: whitespace then optional junk (single/double char suffix like " -", " 1", " )", " Q'")
  cleaned = cleaned.replace(/\s+[-\)\(\.,'\d\w]{0,3}$/, '').trim();
  // Strip trailing comma with nothing after
  cleaned = cleaned.replace(/,\s*$/, '').trim();
  return cleaned;
}

function isEquipmentName(s) {
  if (!s || s.length < 6 || s.length > 100) return false;

  // No lowercase
  if (/[a-z]/.test(s)) return false;

  // No sentence/contact punctuation
  if (/[!?@#$%^&*=<>{}\[\]\\|~`_]/.test(s)) return false;

  // No colon (phone/address labels)
  if (s.includes(':')) return false;

  // No address-like start
  if (/^\d+\s+[A-Z]/.test(s)) return false;

  // Not digit-heavy
  const digits = (s.match(/\d/g) || []).length;
  if (digits > 6) return false;

  // Reject known non-equipment phrases
  for (const phrase of REJECT_PHRASES) {
    if (s.includes(phrase)) return false;
  }

  // Must contain an equipment keyword
  const hasKeyword = EQUIPMENT_KEYWORDS.some(kw => s.includes(kw));
  if (!hasKeyword) return false;

  // Must end with a letter, digit, quote, or closing paren — not a hanging comma/dash
  if (/[,\-\s]$/.test(s)) return false;

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
    // Map from cleaned name -> shortest raw occurrence
    const cleanedMap = new Map();

    for (const run of runs) {
      const parts = run.split(/\s{2,}|\t|\|/).map(p => p.trim()).filter(Boolean);
      const candidates = parts.length > 1 ? parts : [run];

      for (const part of candidates) {
        const cleaned = cleanName(part);
        if (isEquipmentName(cleaned)) {
          if (!cleanedMap.has(cleaned) || cleaned.length < cleanedMap.get(cleaned).length) {
            cleanedMap.set(cleaned, cleaned);
          }
        }
      }
    }

    return Response.json({
      success: true,
      chunkByteOffset: chunkByteOffset || 0,
      names: Array.from(cleanedMap.keys()).sort(),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});