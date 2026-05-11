import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VisualTruckContainer({
  truck,
  spec,
  weight,
  volume,
  weightPct,
  volumePct,
  onDragOver,
  onDrop,
  onDragStart,
  onRemove,
  children,
}) {
  const weightStatus = weightPct > 100 ? 'red' : weightPct > 85 ? 'amber' : 'green';
  const volumeStatus = volumePct > 100 ? 'red' : volumePct > 85 ? 'amber' : 'green';

  const statusColors = {
    red: { bg: 'bg-red-500', light: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
    amber: { bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600' },
    green: { bg: 'bg-green-500', light: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
  };

  const weightColor = statusColors[weightStatus];
  const volumeColor = statusColors[volumeStatus];

  // Truck aspect ratio approximation
  const truckWidth = 250; // px
  const truckHeight = 150; // px

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header with truck info */}
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="font-bold text-lg">{truck.name}</div>
          <div className="text-xs text-slate-400">{spec.name}</div>
        </div>
        {onRemove && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Visual truck bounding box */}
      <div className="p-6 bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="flex flex-col gap-4">
          {/* Truck container visual */}
          <div className="flex gap-4">
            {/* Container visualization */}
            <div
              onDragOver={onDragOver}
              onDrop={onDrop}
              className="border-4 border-slate-400 bg-white rounded-lg flex-1 relative overflow-hidden"
              style={{ minHeight: `${truckHeight}px`, position: 'relative' }}
            >
              {/* Grid background */}
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(0deg, #000 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Capacity fill indicator */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                <div
                  className={`h-full ${volumeStatus === 'red' ? 'bg-red-500' : volumeStatus === 'amber' ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(volumePct, 100)}%` }}
                />
              </div>

              {/* Equipment items in container */}
              <div className="relative p-3 h-full flex flex-wrap gap-2 items-start content-start overflow-y-auto max-h-40">
                {children && children.length > 0 ? (
                  children
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
                    Drop items here
                  </div>
                )}
              </div>
            </div>

            {/* Stats sidebar */}
            <div className="flex flex-col gap-3 w-40 text-xs">
              {/* Weight */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-gray-600 font-medium">Weight</span>
                  <span className={`font-bold ${weightColor.text}`}>{weightPct}%</span>
                </div>
                <div className="bg-gray-200 rounded h-3 overflow-hidden">
                  <div
                    className={weightColor.bg}
                    style={{ width: `${Math.min(weightPct, 100)}%` }}
                  />
                </div>
                <div className="text-gray-500 mt-1 text-xs">
                  {(weight / 1000).toFixed(1)}k / {(spec.weightCapacity / 1000).toFixed(0)}k lbs
                </div>
              </div>

              {/* Volume */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-gray-600 font-medium">Volume</span>
                  <span className={`font-bold ${volumeColor.text}`}>{volumePct}%</span>
                </div>
                <div className="bg-gray-200 rounded h-3 overflow-hidden">
                  <div
                    className={volumeColor.bg}
                    style={{ width: `${Math.min(volumePct, 100)}%` }}
                  />
                </div>
                <div className="text-gray-500 mt-1 text-xs">
                  {volume} / {spec.volumeCapacity} cu ft
                </div>
              </div>

              {/* Efficiency score */}
              <div className="bg-slate-100 rounded p-2 text-center mt-auto">
                <div className="text-gray-600 text-xs font-semibold">
                  {volumePct > 0 ? Math.round((volume / spec.volumeCapacity) * 100) : 0}% Full
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}