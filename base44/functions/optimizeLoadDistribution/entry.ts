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
    
    // Sort equipment by volume descending (First Fit Decreasing)
    const sorted = [...equipment].sort((a, b) => (b.volume || 10) - (a.volume || 10));
    
    // Initialize trucks
    const trucks = Array.from({ length: numTrucks }, (_, i) => ({
      id: `truck-${Date.now()}-${i}`,
      name: `Truck ${i + 1}`,
      type: truckType,
      items: [],
      usedWeight: 0,
      usedVolume: 0,
    }));
    
    // Greedy allocation with quantity support: distribute quantities across trucks
    for (const item of sorted) {
      const totalQty = item.quantity || 1;
      const unitWeight = item.weight || 500;
      const unitVolume = item.volume || 10;
      
      let remaining = totalQty;
      
      while (remaining > 0) {
        // Find best truck (most remaining capacity that still fits this item)
        let bestTruck = null;
        let bestRemainingCapacity = -1;
        
        for (const truck of trucks) {
          const canFitWeight = truck.usedWeight + unitWeight <= spec.weightCapacity;
          const canFitVolume = truck.usedVolume + unitVolume <= spec.volumeCapacity;
          
          if (canFitWeight && canFitVolume) {
            const remainingCapacity = 
              (spec.weightCapacity - truck.usedWeight) + 
              (spec.volumeCapacity - truck.usedVolume);
            
            if (remainingCapacity > bestRemainingCapacity) {
              bestRemainingCapacity = remainingCapacity;
              bestTruck = truck;
            }
          }
        }
        
        if (bestTruck) {
          // Calculate how many units can fit in this truck
          const weightRoom = Math.max(0, spec.weightCapacity - bestTruck.usedWeight);
          const volumeRoom = Math.max(0, spec.volumeCapacity - bestTruck.usedVolume);
          const canFitByWeight = unitWeight > 0 ? Math.floor(weightRoom / unitWeight) : remaining;
          const canFitByVolume = unitVolume > 0 ? Math.floor(volumeRoom / unitVolume) : remaining;
          const canFit = Math.min(canFitByWeight, canFitByVolume, remaining);
          
          const assignQty = canFit > 0 ? canFit : 1;
          bestTruck.items.push({
            ...item,
            quantity: assignQty,
            id: `${item.equipmentName || item.name}-${bestTruck.id}-${Math.random()}`,
          });
          bestTruck.usedWeight += unitWeight * assignQty;
          bestTruck.usedVolume += unitVolume * assignQty;
          remaining -= assignQty;
        } else {
          // No truck can fit - force assign to least loaded truck (overflow)
          const targetTruck = trucks.reduce((best, t) => t.usedWeight < best.usedWeight ? t : best, trucks[0]);
          targetTruck.items.push({
            ...item,
            quantity: remaining,
            id: `${item.equipmentName || item.name}-${targetTruck.id}-${Math.random()}`,
          });
          targetTruck.usedWeight += unitWeight * remaining;
          targetTruck.usedVolume += unitVolume * remaining;
          remaining = 0;
        }
      }
    }
    
    // Calculate utilization metrics
    const loads = trucks.map(truck => ({
      ...truck,
      weightPercent: Math.round((truck.usedWeight / spec.weightCapacity) * 100),
      volumePercent: Math.round((truck.usedVolume / spec.volumeCapacity) * 100),
    }));
    
    return Response.json({ loads, success: true });
  } catch (error) {
    console.error('optimizeLoadDistribution error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});