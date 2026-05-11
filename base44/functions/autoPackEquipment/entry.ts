import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TRUCK_SPECS = {
  '18wheeler': { weightCapacity: 80000, volumeCapacity: 3000 },
  '26ft': { weightCapacity: 26000, volumeCapacity: 1400 },
  '24ft': { weightCapacity: 24000, volumeCapacity: 1200 },
  'sprinter': { weightCapacity: 5000, volumeCapacity: 300 },
};

Deno.serve(async (req) => {
  try {
    const { equipment, numTrucks, truckType } = await req.json();
    
    if (!equipment || !Array.isArray(equipment)) {
      return Response.json({ error: 'Equipment must be an array' }, { status: 400 });
    }

    const spec = TRUCK_SPECS[truckType] || TRUCK_SPECS['18wheeler'];
    
    // Sort by weight descending for better balance
    const sorted = [...equipment].sort((a, b) => (b.weight || 500) - (a.weight || 500));
    
    // Initialize trucks
    const trucks = Array.from({ length: numTrucks }, (_, i) => ({
      id: `truck-${Date.now()}-${i}`,
      name: `Truck ${i + 1}`,
      type: truckType,
      items: [],
      usedWeight: 0,
      usedVolume: 0,
    }));
    
    // Load-leveling algorithm: place each item in the truck with lowest current weight
    // while respecting capacity constraints
    for (const item of sorted) {
      const itemWeight = item.weight || 500;
      const itemVolume = item.volume || 10;
      
      // Find truck with lowest weight that can still fit this item
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
      
      // Add to best truck (most balanced)
      if (bestTruck) {
        bestTruck.items.push(item);
        bestTruck.usedWeight += itemWeight;
        bestTruck.usedVolume += itemVolume;
      }
    }
    
    // Calculate metrics
    const loads = trucks.map(truck => ({
      ...truck,
      weightPercent: Math.round((truck.usedWeight / spec.weightCapacity) * 100),
      volumePercent: Math.round((truck.usedVolume / spec.volumeCapacity) * 100),
    }));
    
    // Calculate balance score (lower is better)
    const weights = loads.map(t => t.usedWeight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
    const balanceScore = Math.sqrt(variance);
    
    return Response.json({ loads, balanceScore, success: true });
  } catch (error) {
    console.error('autoPackEquipment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});