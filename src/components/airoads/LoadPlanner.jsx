import { useState } from 'react';
import { Package, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VisualTruckContainer from './VisualTruckContainer';
import EquipmentItem from './EquipmentItem';
import ShippingLabelPrinter from './ShippingLabelPrinter';
import LoadScanner from './LoadScanner';
import TruckFloorPlan from './TruckFloorPlan';

export default function LoadPlanner({
  eventEquipment,
  loads,
  truckSpecs,
  onLoadsChange,
  onEquipmentChange,
  onRemoveTruck,
  onTruckTypeChange,
}) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [scannerTruck, setScannerTruck] = useState(null);

  const handleDragStart = (e, item, sourceType, sourceId) => {
    setDraggedItem({ item, sourceType, sourceId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnTruck = (e, truckId) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { item, sourceType, sourceId } = draggedItem;

    // Remove from source
    if (sourceType === 'unassigned') {
      onEquipmentChange(eventEquipment.filter(e => e.id !== item.id));
    } else {
      onLoadsChange(
        loads.map(t =>
          t.id === sourceId
            ? { ...t, items: t.items.filter(i => i.id !== item.id) }
            : t
        )
      );
    }

    // Add to target truck
    onLoadsChange(
      loads.map(t =>
        t.id === truckId ? { ...t, items: [...(t.items || []), item] } : t
      )
    );

    setDraggedItem(null);
  };

  const handleDropOnUnassigned = (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { item, sourceType, sourceId } = draggedItem;

    if (sourceType === 'unassigned') return; // Already unassigned

    // Remove from truck
    onLoadsChange(
      loads.map(t =>
        t.id === sourceId
          ? { ...t, items: t.items.filter(i => i.id !== item.id) }
          : t
      )
    );

    // Add to unassigned
    onEquipmentChange([...eventEquipment, item]);

    setDraggedItem(null);
  };

  const getTruckStats = (truck) => {
    const spec = truckSpecs[truck.type] || truckSpecs['18wheeler'];
    const weight = truck.items?.reduce((s, e) => s + (e.weight || 0) * (e.quantity || 1), 0) || 0;
    const volume = truck.items?.reduce((s, e) => s + (e.volume || 0) * (e.quantity || 1), 0) || 0;
    const weightPct = spec.weightCapacity ? ((weight / spec.weightCapacity) * 100).toFixed(0) : 0;
    const volumePct = spec.volumeCapacity ? ((volume / spec.volumeCapacity) * 100).toFixed(0) : 0;

    return { weight, volume, weightPct, volumePct, spec };
  };

  return (
    <div className="space-y-6">
      <>
      {/* Unassigned equipment */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDropOnUnassigned}
        className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 min-h-64"
      >
        <div className="flex items-center gap-2 font-bold text-gray-900 mb-4">
          <Package className="w-5 h-5 text-gray-600" />
          Unassigned Equipment ({eventEquipment.reduce((s, e) => s + (e.quantity || 1), 0)} units, {eventEquipment.length} line{eventEquipment.length !== 1 ? 's' : ''})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {eventEquipment.length === 0 ? (
            <p className="text-sm text-gray-400 col-span-full">Drag items here or add equipment</p>
          ) : (
            eventEquipment.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={e => handleDragStart(e, item, 'unassigned')}
                className="bg-gray-50 border rounded-lg p-3 cursor-move hover:bg-gray-100 hover:border-indigo-300 transition group"
              >
                <div className="flex gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {item.equipmentName || item.name}
                      {item.quantity > 1 && <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 rounded px-1">×{item.quantity}</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.weight && <span>{((item.weight * (item.quantity || 1)) / 1000).toFixed(1)}k lbs</span>}
                      {item.weight && item.volume && <span className="mx-1">•</span>}
                      {item.volume && <span>{item.volume * (item.quantity || 1)} cu ft</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trucks with Visual Containers */}
      <div className="grid grid-cols-1 gap-6">
        {loads.map(truck => {
          const { weight, volume, weightPct, volumePct, spec } = getTruckStats(truck);

          return (
            <div key={truck.id} className="space-y-3">
              <VisualTruckContainer
                truck={truck}
                spec={spec}
                weight={weight}
                volume={volume}
                weightPct={weightPct}
                volumePct={volumePct}
                onDragOver={handleDragOver}
                onDrop={e => handleDropOnTruck(e, truck.id)}
                onRemove={loads.length > 1 ? () => onRemoveTruck(truck.id) : null}
                onTypeChange={onTruckTypeChange}
              >
                {truck.items?.length === 0 ? null : (
                  <div className="w-full flex flex-wrap gap-2">
                    {truck.items?.map((item, idx) => (
                      <EquipmentItem
                        key={item.id || `${truck.id}-item-${idx}`}
                        item={item}
                        onDragStart={e => handleDragStart(e, item, 'truck', truck.id)}
                      />
                    ))}
                  </div>
                )}
              </VisualTruckContainer>

              {/* Truck-specific controls */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setScannerTruck(scannerTruck?.id === truck.id ? null : truck)}
                  variant={scannerTruck?.id === truck.id ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                >
                  {scannerTruck?.id === truck.id ? '✓ Scanner Active' : 'Open Scanner'}
                </Button>
                <Button
                  onClick={() => setScannerTruck(truck)}
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1"
                >
                  Print Labels
                </Button>
              </div>

              {/* Scanner */}
              {scannerTruck?.id === truck.id && (
                <LoadScanner truck={truck} onStatusUpdate={(update) => console.log('Status:', update)} />
              )}
            </div>
          );
        })}
      </div>

      {/* Floating label printer for selected truck */}
      {scannerTruck && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-lg border p-4 max-w-sm print:hidden">
          <ShippingLabelPrinter truck={scannerTruck} />
        </div>
      )}
      </>
    </div>
  );
}