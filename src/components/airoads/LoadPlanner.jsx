import { useState } from 'react';
import { Truck, Package, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoadPlanner({
  eventEquipment,
  loads,
  truckSpecs,
  onLoadsChange,
  onEquipmentChange,
  onRemoveTruck,
}) {
  const [draggedItem, setDraggedItem] = useState(null);

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
    const spec = truckSpecs[truck.type] || {};
    const weight = truck.items?.reduce((s, e) => s + (e.weight || 0), 0) || 0;
    const volume = truck.items?.reduce((s, e) => s + (e.volume || 0), 0) || 0;
    const weightPct = spec.weightCapacity ? ((weight / spec.weightCapacity) * 100).toFixed(0) : 0;
    const volumePct = spec.volumeCapacity ? ((volume / spec.volumeCapacity) * 100).toFixed(0) : 0;

    return { weight, volume, weightPct, volumePct, spec };
  };

  return (
    <div className="space-y-6">
      {/* Unassigned equipment */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDropOnUnassigned}
        className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 min-h-64"
      >
        <div className="flex items-center gap-2 font-bold text-gray-900 mb-4">
          <Package className="w-5 h-5 text-gray-600" />
          Unassigned Equipment ({eventEquipment.length})
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
                    <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {item.weight && <span>{(item.weight / 1000).toFixed(1)}k lbs</span>}
                      {item.weight && item.volume && <span className="mx-1">•</span>}
                      {item.volume && <span>{item.volume} cu ft</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trucks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loads.map(truck => {
          const { weight, volume, weightPct, volumePct, spec } = getTruckStats(truck);
          const weightStatus = weightPct > 100 ? 'text-red-600' : weightPct > 85 ? 'text-amber-600' : 'text-green-600';
          const volumeStatus = volumePct > 100 ? 'text-red-600' : volumePct > 85 ? 'text-amber-600' : 'text-green-600';

          return (
            <div key={truck.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-indigo-50 border-b p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  <div>
                    <div className="font-bold text-gray-900">{truck.name}</div>
                    <div className="text-xs text-gray-500">{spec.name}</div>
                  </div>
                </div>
                {loads.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveTruck(truck.id)}
                    className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="border-b p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span className={`font-semibold ${weightStatus}`}>
                    {(weight / 1000).toFixed(1)}k / {(spec.weightCapacity / 1000).toFixed(0)}k lbs ({weightPct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${
                      weightPct > 100 ? 'bg-red-500' : weightPct > 85 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(weightPct, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600">Volume:</span>
                  <span className={`font-semibold ${volumeStatus}`}>
                    {volume} / {spec.volumeCapacity} cu ft ({volumePct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${
                      volumePct > 100 ? 'bg-red-500' : volumePct > 85 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(volumePct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Items */}
              <div
                onDragOver={handleDragOver}
                onDrop={e => handleDropOnTruck(e, truck.id)}
                className="p-4 space-y-2 min-h-48"
              >
                {truck.items?.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Drag items here</p>
                ) : (
                  truck.items?.map(item => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={e => handleDragStart(e, item, 'truck', truck.id)}
                      className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 cursor-move hover:bg-indigo-100 transition group"
                    >
                      <div className="flex gap-2">
                        <GripVertical className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {item.weight && <span>{(item.weight / 1000).toFixed(1)}k lbs</span>}
                            {item.weight && item.volume && <span className="mx-1">•</span>}
                            {item.volume && <span>{item.volume} cu ft</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}