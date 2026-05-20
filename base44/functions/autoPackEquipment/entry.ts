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

    const spec = TRUCK_SPECS[truckType] || TRUCK_SPECS['18wheeler'];
    const n = Math.max(1, numTrucks || 1);

    // Sort by weight descending for better bin-packing
    const sorted = [...items].sort((a, b) => (b.weight || 100) - (a.weight || 100));

    // Initialize trucks
    const trucks = Array.from({ length: n }, (_, i) => ({
      id: `truck-${Date.now()}-${i}`,
      name: `Truck ${i + 1}`,
      type: truckType,
      items: [],
      usedWeight: 0,
      usedVolume: 0,
    }));

    // Bin-packing: place each item in the lightest truck that can fit it
    for (const item of sorted) {
      const qty = item.quantity || 1;
      const itemWeight = (item.weight || 100) * qty;
      const itemVolume = (item.volume || 5) * qty;

      let bestTruck = null;
      let lowestWeight = Infinity;

      for (const truck of trucks) {
        const canFitWeight = truck.usedWeight + itemWeight <= spec.weightCapacity;
        const canFitVolume = truck.usedVolume + itemVolume <= spec.volumeCapacity;

        if (canFitWeight && canFitVolume && truck.usedWeight < lowestWeight) {
          lowestWeight = truck.usedWeight;
          bestTruck = truck;
        }
      }

      if (!bestTruck) {
        // Overflow: just add to the truck with the most remaining capacity
        bestTruck = trucks.reduce((best, t) =>
          (spec.weightCapacity - t.usedWeight) > (spec.weightCapacity - best.usedWeight) ? t : best
        , trucks[0]);
      }

      bestTruck.items.push({ ...item, quantity: qty });
      bestTruck.usedWeight += itemWeight;
      bestTruck.usedVolume += itemVolume;
    }

    const loads = trucks.map(truck => ({
      ...truck,
      weightPercent: Math.round((truck.usedWeight / spec.weightCapacity) * 100),
      volumePercent: Math.round((truck.usedVolume / spec.volumeCapacity) * 100),
    }));

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