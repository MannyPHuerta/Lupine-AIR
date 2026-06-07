import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TRUCK_SPECS = {
  '18wheeler': { weightCapacity: 80000, volumeCapacity: 3000 },
  '26ft':      { weightCapacity: 26000, volumeCapacity: 1400 },
  '24ft':      { weightCapacity: 24000, volumeCapacity: 1200 },
  'sprinter':  { weightCapacity: 5000,  volumeCapacity: 300  },
};

// ─── Industry-standard category weights ───────────────────────────────────────
// Higher priority = loaded LAST (comes off truck FIRST at the venue).
// This mirrors standard event-logistics "reverse-unload" sequencing.
const CATEGORY_PRIORITY = {
  // Structural / foundation — loaded first, heavy base
  'Tent':              1,
  'Staging':           1,
  'Dance Floor':       1,
  // Heavy machinery — loaded first, anchor the load
  'Generator':         2,
  'Light Tower':       2,
  'Forklift':          2,
  'Pallet Jack':       2,
  // Mid-weight support structures
  'Table':             3,
  'Chair':             4,
  // Décor / soft goods — loaded last, fragile on top
  'Linen':             5,
  'Inflatable':        5,
  // Default catch-all
  'default':           3,
};

// Items whose names contain these keywords belong to the same "assembly set"
// and should ride on the same truck together.
const ASSEMBLY_KEYWORDS = [
  'tent', 'pole', 'stake', 'sidewall', 'liner', 'leg', 'frame',
  'stage', 'deck', 'riser', 'step', 'stair',
  'dance floor', 'dance', 'panel',
  'truss', 'beam', 'crossbar',
];

// Items that must go on the BOTTOM of any load (never stacked under lighter things)
const FLOOR_ITEMS = ['generator', 'compressor', 'forklift', 'pallet jack', 'light tower', 'bulldozer', 'excavator'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryPriority(item) {
  const cat = (item.category || '').trim();
  if (CATEGORY_PRIORITY[cat] !== undefined) return CATEGORY_PRIORITY[cat];
  // Fallback: scan item name for known keywords
  const name = (item.name || item.equipmentName || '').toLowerCase();
  if (name.includes('tent') || name.includes('canopy')) return 1;
  if (name.includes('stage') || name.includes('staging') || name.includes('riser')) return 1;
  if (name.includes('dance floor') || name.includes('dance')) return 1;
  if (name.includes('generator') || name.includes('light tower')) return 2;
  if (name.includes('chair') || name.includes('seat')) return 4;
  if (name.includes('table')) return 3;
  return CATEGORY_PRIORITY['default'];
}

function isFloorItem(item) {
  const name = (item.name || item.equipmentName || '').toLowerCase();
  return FLOOR_ITEMS.some(kw => name.includes(kw));
}

// Derive a "set key" for assembly-cohesion grouping.
// Items sharing the same set key should ride on the same truck.
function getSetKey(item) {
  const name = (item.name || item.equipmentName || '').toLowerCase();
  for (const kw of ASSEMBLY_KEYWORDS) {
    if (name.includes(kw)) return kw; // crude but effective for event equipment
  }
  // Group by category as a fallback set
  return item.category || 'misc';
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { numTrucks, truckType } = body;

    let items = body.summarized || body.equipment;
    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'Equipment must be an array' }, { status: 400 });
    }

    const n = Math.max(1, numTrucks || 1);

    // ── 1. Explode grouped items into individual units ────────────────────────
    const units = [];
    for (const item of items) {
      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) {
        units.push({ ...item, quantity: 1, _unitIndex: i });
      }
    }

    // ── 2. Sort by industry loading order ─────────────────────────────────────
    // Primary: category priority ascending (low = load first = goes in back of truck)
    // Secondary: floor items go before non-floor items within same priority band
    // Tertiary: heavier items before lighter (stability)
    units.sort((a, b) => {
      const pa = getCategoryPriority(a);
      const pb = getCategoryPriority(b);
      if (pa !== pb) return pa - pb;
      const fa = isFloorItem(a) ? 0 : 1;
      const fb = isFloorItem(b) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      return (b.weight || 100) - (a.weight || 100);
    });

    // ── 3. Initialize trucks ──────────────────────────────────────────────────
    const configs = body.truckConfigs && body.truckConfigs.length > 0 ? body.truckConfigs : [];
    const trucks = Array.from({ length: n }, (_, i) => {
      const cfg = configs[i];
      const tType = cfg?.type || truckType || '18wheeler';
      return {
        id: cfg?.id || `truck-${Date.now()}-${i}`,
        name: cfg?.name || `Truck ${i + 1}`,
        type: tType,
        items: [],
        usedWeight: 0,
        usedVolume: 0,
        _spec: TRUCK_SPECS[tType] || TRUCK_SPECS['18wheeler'],
        // Track which set-keys are already on this truck for cohesion scoring
        _sets: {},
      };
    });

    // ── 4. Assembly-set cohesion pass ─────────────────────────────────────────
    // Group units by set key, then assign entire sets to the same truck.
    // This keeps tent poles + tent fabric + tent stakes on the same vehicle.
    const setGroups = {};
    for (const unit of units) {
      const key = getSetKey(unit);
      if (!setGroups[key]) setGroups[key] = [];
      setGroups[key].push(unit);
    }

    // Score trucks for best fit per set (least wasted capacity + cohesion bonus)
    function bestTruckForSet(setUnits) {
      const totalWeight = setUnits.reduce((s, u) => s + (u.weight || 100), 0);
      const totalVolume = setUnits.reduce((s, u) => s + (u.volume || 5), 0);
      let best = null;
      let bestScore = Infinity;
      for (const truck of trucks) {
        const spec = truck._spec;
        const afterWeight = truck.usedWeight + totalWeight;
        const afterVolume = truck.usedVolume + totalVolume;
        if (afterWeight > spec.weightCapacity || afterVolume > spec.volumeCapacity) continue;
        // Score = remaining capacity after placement (lower = tighter fit = better)
        const remainWeight = spec.weightCapacity - afterWeight;
        const remainVolume = spec.volumeCapacity - afterVolume;
        // Cohesion bonus: heavily reward trucks that already carry items from this set
        const cohesionBonus = (truck._sets[getSetKey(setUnits[0])] || 0) * 5000;
        const score = (remainWeight + remainVolume * 10) - cohesionBonus;
        if (score < bestScore) { bestScore = score; best = truck; }
      }
      return best;
    }

    const overflow = [];

    // Sort set groups: larger/heavier sets first (First Fit Decreasing)
    const sortedSets = Object.values(setGroups).sort((a, b) => {
      const wa = a.reduce((s, u) => s + (u.weight || 100), 0);
      const wb = b.reduce((s, u) => s + (u.weight || 100), 0);
      return wb - wa;
    });

    for (const setUnits of sortedSets) {
      const truck = bestTruckForSet(setUnits);
      if (truck) {
        for (const unit of setUnits) {
          placeUnit(unit, truck);
        }
        const setKey = getSetKey(setUnits[0]);
        truck._sets[setKey] = (truck._sets[setKey] || 0) + setUnits.length;
      } else {
        // Set doesn't fit anywhere as a whole — fall back to per-unit placement
        for (const unit of setUnits) {
          const t = bestTruckForUnit(unit, trucks);
          if (t) {
            placeUnit(unit, t);
          } else {
            overflow.push(unit);
          }
        }
      }
    }

    // ── 5. Overflow: force-assign to least-loaded truck ───────────────────────
    for (const unit of overflow) {
      const truck = trucks.reduce((least, t) => t.usedWeight < least.usedWeight ? t : least, trucks[0]);
      placeUnit(unit, truck);
    }

    // ── 6. Build response ─────────────────────────────────────────────────────
    const loads = trucks.map(truck => {
      const spec = truck._spec;
      const cleanItems = truck.items.map(({ _unitIndex, ...item }) => item);
      return {
        id: truck.id,
        name: truck.name,
        type: truck.type,
        items: cleanItems,
        usedWeight: truck.usedWeight,
        usedVolume: truck.usedVolume,
        weightPercent: Math.round((truck.usedWeight / spec.weightCapacity) * 100),
        volumePercent: Math.round((truck.usedVolume / spec.volumeCapacity) * 100),
      };
    });

    const weights = loads.map(t => t.usedWeight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
    const balanceScore = Math.round(Math.sqrt(variance));

    console.log(`[autoPackEquipment] ${items.length} item types → ${n} trucks. Balance: ${balanceScore}`);

    return Response.json({ loads, balanceScore, success: true });
  } catch (error) {
    console.error('autoPackEquipment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ─── Unit helpers (defined after Deno.serve for clarity) ─────────────────────

function placeUnit(unit, truck) {
  const existing = truck.items.find(i =>
    (i.equipmentName || i.name) === (unit.equipmentName || unit.name)
  );
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    truck.items.push({
      ...unit,
      quantity: 1,
      id: `${unit.equipmentName || unit.name}-${truck.id}-${Math.random()}`,
    });
  }
  truck.usedWeight += (unit.weight || 100);
  truck.usedVolume += (unit.volume || 5);
}

function bestTruckForUnit(unit, trucks) {
  const w = unit.weight || 100;
  const v = unit.volume || 5;
  let best = null;
  let bestScore = Infinity;
  for (const truck of trucks) {
    const spec = truck._spec;
    if ((truck.usedWeight + w) > spec.weightCapacity) continue;
    if ((truck.usedVolume + v) > spec.volumeCapacity) continue;
    const cohesionBonus = (truck._sets[getSetKey(unit)] || 0) * 5000;
    const score = (spec.weightCapacity - truck.usedWeight - w) - cohesionBonus;
    if (score < bestScore) { bestScore = score; best = truck; }
  }
  return best;
}