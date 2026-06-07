import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TRUCK_SPECS = {
  '18wheeler': { weightCapacity: 80000, volumeCapacity: 3000 },
  '26ft':      { weightCapacity: 26000, volumeCapacity: 1400 },
  '24ft':      { weightCapacity: 24000, volumeCapacity: 1200 },
  'sprinter':  { weightCapacity: 5000,  volumeCapacity: 300  },
};

const CATEGORY_PRIORITY = {
  'Tent': 1, 'Staging': 1, 'Dance Floor': 1,
  'Generator': 2, 'Light Tower': 2, 'Forklift': 2, 'Pallet Jack': 2,
  'Table': 3, 'Chair': 4, 'Linen': 5, 'Inflatable': 5,
  'default': 3,
};

const ASSEMBLY_KEYWORDS = [
  'tent', 'pole', 'stake', 'sidewall', 'liner', 'leg', 'frame',
  'stage', 'deck', 'riser', 'step', 'stair',
  'dance floor', 'dance', 'panel', 'truss', 'beam', 'crossbar',
];

const FLOOR_ITEMS = ['generator', 'compressor', 'forklift', 'pallet jack', 'light tower', 'bulldozer', 'excavator'];

function getCategoryPriority(item) {
  const cat = (item.category || '').trim();
  if (CATEGORY_PRIORITY[cat] !== undefined) return CATEGORY_PRIORITY[cat];
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

function getSetKey(item) {
  const name = (item.name || item.equipmentName || '').toLowerCase();
  for (const kw of ASSEMBLY_KEYWORDS) {
    if (name.includes(kw)) return kw;
  }
  return item.category || 'misc';
}

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
        _sets: {},
      };
    });

    // ── 4. Assembly-set cohesion pass (First Fit Decreasing) ─────────────────
    const setGroups = {};
    for (const unit of units) {
      const key = getSetKey(unit);
      if (!setGroups[key]) setGroups[key] = [];
      setGroups[key].push(unit);
    }

    function bestTruckForSet(setUnits) {
      const totalWeight = setUnits.reduce((s, u) => s + (u.weight || 100), 0);
      const totalVolume = setUnits.reduce((s, u) => s + (u.volume || 5), 0);
      let best = null;
      let bestScore = Infinity;
      for (const truck of trucks) {
        const spec = truck._spec;
        if ((truck.usedWeight + totalWeight) > spec.weightCapacity) continue;
        if ((truck.usedVolume + totalVolume) > spec.volumeCapacity) continue;
        const cohesionBonus = (truck._sets[getSetKey(setUnits[0])] || 0) * 5000;
        const score = (spec.weightCapacity - truck.usedWeight - totalWeight +
                       spec.volumeCapacity - truck.usedVolume - totalVolume) - cohesionBonus;
        if (score < bestScore) { bestScore = score; best = truck; }
      }
      return best;
    }

    // TRUE overflow — items that genuinely don't fit in any truck
    const overflow = [];

    const sortedSets = Object.values(setGroups).sort((a, b) => {
      const wa = a.reduce((s, u) => s + (u.weight || 100), 0);
      const wb = b.reduce((s, u) => s + (u.weight || 100), 0);
      return wb - wa;
    });

    for (const setUnits of sortedSets) {
      const truck = bestTruckForSet(setUnits);
      if (truck) {
        for (const unit of setUnits) placeUnit(unit, truck);
        const setKey = getSetKey(setUnits[0]);
        truck._sets[setKey] = (truck._sets[setKey] || 0) + setUnits.length;
      } else {
        // Try unit-by-unit for this set
        for (const unit of setUnits) {
          const t = bestTruckForUnit(unit, trucks);
          if (t) {
            placeUnit(unit, t);
          } else {
            // Genuinely doesn't fit — add to overflow, do NOT force-assign
            overflow.push(unit);
          }
        }
      }
    }

    // ── 5. Build response ─────────────────────────────────────────────────────
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

    // ── 6. Compute overflow summary and truck recommendation ──────────────────
    // Re-group overflow back into named items with quantities
    const overflowGrouped = {};
    for (const unit of overflow) {
      const key = unit.equipmentName || unit.name;
      if (!overflowGrouped[key]) {
        overflowGrouped[key] = { ...unit, quantity: 0 };
        delete overflowGrouped[key]._unitIndex;
      }
      overflowGrouped[key].quantity += 1;
    }
    const overflowItems = Object.values(overflowGrouped);

    // Estimate how many additional trucks of the most common type would be needed
    const defaultType = configs[0]?.type || truckType || '18wheeler';
    const defaultSpec = TRUCK_SPECS[defaultType] || TRUCK_SPECS['18wheeler'];
    const overflowWeight = overflow.reduce((s, u) => s + (u.weight || 100), 0);
    const overflowVolume = overflow.reduce((s, u) => s + (u.volume || 5), 0);
    const trucksNeededByWeight = Math.ceil(overflowWeight / defaultSpec.weightCapacity);
    const trucksNeededByVolume = Math.ceil(overflowVolume / defaultSpec.volumeCapacity);
    const additionalTrucksNeeded = Math.max(trucksNeededByWeight, trucksNeededByVolume);

    const weights = loads.map(t => t.usedWeight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
    const balanceScore = Math.round(Math.sqrt(variance));

    console.log(`[autoPackEquipment] ${items.length} types → ${n} trucks. Overflow: ${overflow.length} units. Balance: ${balanceScore}`);

    return Response.json({
      loads,
      balanceScore,
      overflow: overflowItems,
      overflowUnitCount: overflow.length,
      additionalTrucksNeeded,
      success: true,
    });
  } catch (error) {
    console.error('autoPackEquipment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});