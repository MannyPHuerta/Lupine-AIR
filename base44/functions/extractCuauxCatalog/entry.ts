import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Equipment names in CPro follow a very specific format:
// "CATEGORY, DESCRIPTOR SPECS" e.g. "GENERATOR, 20KW DIESEL" or "LIFT, BOOM 40'"
// The key signal is: ALL CAPS word(s), comma, then more ALL CAPS descriptor
// Sometimes no comma but still a recognizable equipment category word

const EQUIPMENT_KEYWORDS = [
  'GENERATOR', 'COMPRESSOR', 'WELDER', 'WELDING',
  'LIFT', 'SCISSOR', 'BOOM', 'FORKLIFT', 'TELEHANDLER',
  'EXCAVATOR', 'BACKHOE', 'LOADER', 'SKID', 'BULLDOZER', 'GRADER', 'DOZER',
  'TRENCHER', 'COMPACTOR', 'ROLLER', 'PAVER', 'SCREEDER',
  'TRAILER', 'TRUCK', 'DUMP',
  'PUMP', 'WATER PUMP', 'TRASH PUMP',
  'LIGHT TOWER', 'TOWER', 'LIGHT PLANT',
  'SAW', 'CONCRETE SAW', 'CHAIN SAW', 'DEMO SAW',
  'MIXER', 'CONCRETE MIXER',
  'PLATE', 'TAMPER', 'RAMMER',
  'PRESSURE WASHER', 'POWER WASHER',
  'GRINDER', 'FLOOR GRINDER', 'FLOOR SANDER',
  'CHIPPER', 'SHREDDER', 'STUMP GRINDER',
  'AUGER', 'DRILL',
  'HEATER', 'DEHUMIDIFIER', 'FAN', 'AIR MOVER',
  'SANDBLASTER', 'BLASTER',
  'SPRAYER', 'SPREADER',
  'MOWER', 'AERATOR', 'TILLER',
  'SCAFFOLDING', 'LADDER', 'PLANK',
  'TABLE', 'CHAIR', 'TENT', 'CANOPY',
  'GENERATOR SET', 'GENSET',
  'SPRINKLER', 'IRRIGATION',
  'TRACTOR', 'SKIDSTEER',
  'FORK', 'PALLET',
  'BREAKER', 'JACKHAMMER', 'HAMMER',
  'CUTTER', 'STRIPPER',
  'VIBRATOR', 'POKER',
  'EDGER', 'BLOWER',
  'DETECTOR', 'LOCATOR',
  'WINCH', 'PULLER',
  'TORCH', 'CUTTER',
  'FLOAT', 'SCREED',
  'NAILER', 'STAPLER',
  'MIXER, ', 'PUMP, ', 'SAW, ',
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
      if (run.length >= MIN_RUN) runs.push(run.trim());
      run = '';
    }
  }
  if (run.length >= MIN_RUN) runs.push(run.trim());
  return runs;
}

// A candidate string must:
// 1. Contain at least one known equipment keyword
// 2. Be entirely uppercase (no lowercase letters at all)
// 3. Not contain email/phone/address-like patterns
// 4. Be 4-100 chars
// 5. Contain no sentence punctuation (!, ?, @, #, $, %)
function isEquipmentName(s) {
  if (!s || s.length < 4 || s.length > 100) return false;

  // No lowercase letters at all
  if (/[a-z]/.test(s)) return false;

  // No sentence-breaking characters
  if (/[!?@#$%^&*=<>{}\[\]\\|~`_]/.test(s)) return false;

  // No digit-heavy strings (phone numbers, addresses)
  const digits = (s.match(/\d/g) || []).length;
  if (digits > 8) return false;

  // No patterns that look like road/address (digits + space + letters at start)
  if (/^\d+\s+[A-Z]/.test(s)) return false;

  // Must not be just initials or a short code without a space
  if (s.length < 8 && !/,/.test(s)) return false;

  // Must contain at least one known equipment keyword
  const upper = s.toUpperCase();
  const hasKeyword = EQUIPMENT_KEYWORDS.some(kw => upper.includes(kw));
  if (!hasKeyword) return false;

  // Must be at least 60% letters (not symbol-heavy)
  const letters = (s.match(/[A-Z]/g) || []).length;
  if (letters / s.length < 0.5) return false;

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
    const names = new Set();

    for (const run of runs) {
      // Split packed runs on multiple spaces or pipe chars
      const parts = run.split(/\s{2,}|\t|\|/).map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (isEquipmentName(part)) names.add(part);
      }
      if (isEquipmentName(run)) names.add(run);
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