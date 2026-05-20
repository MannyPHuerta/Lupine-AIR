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

    // Balanced bin-packing: split large quantities across trucks evenly
    for (const item of sorted) {
      const totalQty = item.quantity || 1;
      const unitWeight = item.weight || 100;
      const unitVolume = item.volume || 5;

      let remaining = totalQty;

      while (remaining > 0) {
        // Always pick the truck with the least used weight (most room)
        const targetTruck = trucks.reduce((best, t) => t.usedWeight < best.usedWeight ? t : best, trucks[0]);

        // Figure out how many units can fit in this truck
        const weightRoom = Math.max(0, spec.weightCapacity - targetTruck.usedWeight);
        const volumeRoom = Math.max(0, spec.volumeCapacity - targetTruck.usedVolume);
        const canFitByWeight = unitWeight > 0 ? Math.floor(weightRoom / unitWeight) : remaining;
        const canFitByVolume = unitVolume > 0 ? Math.floor(volumeRoom / unitVolume) : remaining;
        const canFit = Math.min(canFitByWeight, canFitByVolume, remaining);

        const assignQty = canFit > 0 ? canFit : remaining; // overflow: force assign
        targetTruck.items.push({
          ...item,
          quantity: assignQty,
          id: `${item.equipmentName || item.name}-${targetTruck.id}-${Math.random()}`,
        });
        targetTruck.usedWeight += unitWeight * assignQty;
        targetTruck.usedVolume += unitVolume * assignQty;
        remaining -= assignQty;
      }
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