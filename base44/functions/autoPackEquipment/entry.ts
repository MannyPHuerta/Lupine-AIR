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

    // Sort by weight descending for better bin-packing
    const sorted = [...items].sort((a, b) => (b.weight || 100) - (a.weight || 100));

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

    // Balanced distribution: spread items evenly across all trucks by weight percentage
    for (const item of sorted) {
      const totalQty = item.quantity || 1;
      const unitWeight = item.weight || 100;
      const unitVolume = item.volume || 5;

      // Distribute evenly: split quantity across trucks proportionally, then assign leftovers
      const basePerTruck = Math.floor(totalQty / trucks.length);
      const remainder = totalQty % trucks.length;

      for (let i = 0; i < trucks.length; i++) {
        const truck = trucks[i];
        const assignQty = basePerTruck + (i < remainder ? 1 : 0);
        if (assignQty <= 0) continue;

        const spec = truck._spec;
        const weightRoom = Math.max(0, spec.weightCapacity - truck.usedWeight);
        const volumeRoom = Math.max(0, spec.volumeCapacity - truck.usedVolume);
        const canFitByWeight = unitWeight > 0 ? Math.floor(weightRoom / unitWeight) : assignQty;
        const canFitByVolume = unitVolume > 0 ? Math.floor(volumeRoom / unitVolume) : assignQty;
        const actualQty = Math.min(assignQty, canFitByWeight, canFitByVolume, assignQty);

        if (actualQty > 0) {
          truck.items.push({
            ...item,
            quantity: actualQty,
            id: `${item.equipmentName || item.name}-${truck.id}-${Math.random()}`,
          });
          truck.usedWeight += unitWeight * actualQty;
          truck.usedVolume += unitVolume * actualQty;
        }
      }
    }

    const loads = trucks.map(truck => {
      const spec = truck._spec;
      const { _spec, ...rest } = truck;
      return {
        ...rest,
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