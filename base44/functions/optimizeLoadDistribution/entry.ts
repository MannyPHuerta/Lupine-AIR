/**
 * Optimizes equipment distribution across trucks using a bin-packing algorithm.
 * Balances by weight and volume capacity.
 */
Deno.serve(async (req) => {
  try {
    const { equipment, numTrucks, truckType } = await req.json();

    if (!equipment || !Array.isArray(equipment)) {
      return Response.json({ error: 'Invalid equipment data' }, { status: 400 });
    }

    if (!numTrucks || numTrucks < 1) {
      return Response.json({ error: 'Invalid truck count' }, { status: 400 });
    }

    // Truck specs
    const TRUCK_SPECS = {
      '18wheeler': { weightCapacity: 80000, volumeCapacity: 3000 },
      '26ft': { weightCapacity: 26000, volumeCapacity: 1400 },
      '24ft': { weightCapacity: 24000, volumeCapacity: 1200 },
      'sprinter': { weightCapacity: 5000, volumeCapacity: 300 },
    };

    const spec = TRUCK_SPECS[truckType] || TRUCK_SPECS['18wheeler'];

    // Initialize trucks
    const trucks = Array.from({ length: numTrucks }).map((_, i) => ({
      id: `truck-${i}`,
      name: `Truck ${i + 1}`,
      type: truckType,
      items: [],
      weight: 0,
      volume: 0,
    }));

    // Sort equipment by weight (descending) for better packing
    const sorted = [...equipment].sort((a, b) => (b.weight || 0) - (a.weight || 0));

    // First-fit decreasing bin packing
    for (const item of sorted) {
      const itemWeight = item.weight || 0;
      const itemVolume = item.volume || 0;

      // Find best truck (lowest utilization that can still fit the item)
      let bestTruck = null;
      let bestScore = Infinity;

      for (const truck of trucks) {
        const canFitWeight = truck.weight + itemWeight <= spec.weightCapacity;
        const canFitVolume = truck.volume + itemVolume <= spec.volumeCapacity;

        if (canFitWeight && canFitVolume) {
          // Score: lower weight utilization is better (spreads load)
          const score = truck.weight + itemWeight;
          if (score < bestScore) {
            bestScore = score;
            bestTruck = truck;
          }
        }
      }

      // If no truck can fit it, force onto least-full truck (overload warning)
      if (!bestTruck) {
        bestTruck = trucks.reduce((min, t) =>
          (t.weight + itemWeight) < (min.weight + itemWeight) ? t : min
        );
      }

      bestTruck.items.push(item);
      bestTruck.weight += itemWeight;
      bestTruck.volume += itemVolume;
    }

    return Response.json({ loads: trucks });
  } catch (error) {
    console.error('[optimizeLoadDistribution]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});