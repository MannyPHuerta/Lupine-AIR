import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TRUCK_SPECS = {
  '18wheeler': { weightCapacity: 80000, volumeCapacity: 3000 },
  '26ft': { weightCapacity: 26000, volumeCapacity: 1400 },
  '24ft': { weightCapacity: 24000, volumeCapacity: 1200 },
  'sprinter': { weightCapacity: 5000, volumeCapacity: 300 },
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { numTrucks, truckType } = body;

    // Use summarized (grouped) items if provided, otherwise fall back to full list
    let items = body.summarized || body.equipment;

    if (!items || !Array.isArray(items)) {
      return Response.json({ error: 'Equipment must be an array' }, { status: 400 });
    }

    const n = Math.max(1, numTrucks || 1);

    // Explode grouped items into individual units for proper per-unit distribution
    const units = [];
    for (const item of items) {
      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) {
        units.push({ ...item, quantity: 1, _unitIndex: i });
      }
    }

    // Sort by weight descending for better bin-packing
    units.sort((a, b) => (b.weight || 100) - (a.weight || 100));

    // Initialize trucks — use truckConfigs if provided to preserve user names/types
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
      };
    });

    // Round-robin distribute individual units across trucks, respecting capacity
    let truckIndex = 0;
    const overflow = [];

    for (const unit of units) {
      const unitWeight = unit.weight || 100;
      const unitVolume = unit.volume || 5;
      let placed = false;

      // Try placing starting at current round-robin position, cycle through all trucks
      for (let attempt = 0; attempt < trucks.length; attempt++) {
        const truck = trucks[(truckIndex + attempt) % trucks.length];
        const spec = truck._spec;
        const weightOk = (truck.usedWeight + unitWeight) <= spec.weightCapacity;
        const volumeOk = (truck.usedVolume + unitVolume) <= spec.volumeCapacity;

        if (weightOk && volumeOk) {
          // Merge with existing entry for same item on this truck if present
          const existing = truck.items.find(i => (i.equipmentName || i.name) === (unit.equipmentName || unit.name));
          if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
          } else {
            truck.items.push({
              ...unit,
              quantity: 1,
              id: `${unit.equipmentName || unit.name}-${truck.id}-${Math.random()}`,
            });
          }
          truck.usedWeight += unitWeight;
          truck.usedVolume += unitVolume;
          placed = true;
          truckIndex = (truckIndex + 1) % trucks.length;
          break;
        }
      }

      if (!placed) {
        overflow.push(unit);
      }
    }

    // Overflow: force-assign to least loaded truck
    for (const unit of overflow) {
      const truck = trucks.reduce((least, t) => t.usedWeight < least.usedWeight ? t : least, trucks[0]);
      const existing = truck.items.find(i => (i.equipmentName || i.name) === (unit.equipmentName || unit.name));
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        truck.items.push({
          ...unit,
          quantity: 1,
          id: `${unit.equipmentName || unit.name}-${truck.id}-${Math.random()}`,
        });
      }
      truck.usedWeight += unit.weight || 100;
      truck.usedVolume += unit.volume || 5;
    }

    const loads = trucks.map(truck => {
      const spec = truck._spec;
      const { _spec, ...rest } = truck;
      // Strip internal _unitIndex from items
      const cleanItems = rest.items.map(({ _unitIndex, ...item }) => item);
      return {
        ...rest,
        items: cleanItems,
        weightPercent: Math.round((truck.usedWeight / spec.weightCapacity) * 100),
        volumePercent: Math.round((truck.usedVolume / spec.volumeCapacity) * 100),
      };
    });

    const weights = loads.map(t => t.usedWeight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
    const balanceScore = Math.round(Math.sqrt(variance));

    console.log(`[autoPackEquipment] ${items.length} item types → ${n} trucks. Balance score: ${balanceScore}`);

    return Response.json({ loads, balanceScore, success: true });
  } catch (error) {
    console.error('autoPackEquipment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});