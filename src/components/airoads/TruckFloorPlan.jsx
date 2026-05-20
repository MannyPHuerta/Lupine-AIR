import { useMemo } from 'react';

// Truck interior dimensions in feet
const TRUCK_DIMS = {
  '18wheeler': { width: 8.5, length: 53 },
  '26ft':      { width: 8,   length: 26 },
  '24ft':      { width: 8,   length: 24 },
  'sprinter':  { width: 5.5, length: 11 },
};

// Approximate footprint in feet for equipment categories
function getFootprint(item) {
  const name = (item.equipmentName || item.name || '').toLowerCase();
  const cat  = (item.category || '').toLowerCase();

  if (cat === 'tent'    || name.includes('tent'))          return { w: item.widthFt || 20, l: item.lengthFt || 20, label: 'Tent (folded)', color: '#6366f1' };
  if (cat === 'staging' || name.includes('staging'))       return { w: 4, l: 8, label: 'Stage Section', color: '#8b5cf6' };
  if (cat === 'table'   || name.includes('table'))         return { w: 3, l: 6, label: 'Table', color: '#3b82f6' };
  if (cat === 'chair'   || name.includes('chair'))         return { w: 1.5, l: 1.5, label: 'Chair Stack', color: '#06b6d4', stackSize: 10 };
  if (name.includes('generator'))                          return { w: 4, l: 6, label: 'Generator', color: '#f59e0b' };
  if (name.includes('light tower'))                        return { w: 3, l: 7, label: 'Light Tower', color: '#f97316' };
  if (cat === 'dance floor' || name.includes('dance'))     return { w: 4, l: 4, label: 'Dance Floor Panel', color: '#ec4899', stackSize: 5 };
  return { w: 2, l: 3, label: item.equipmentName || item.name, color: '#64748b' };
}

// Simple shelf-based 2D bin packing (strip packing)
function packItems(items, truckW, truckL) {
  const placements = [];
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;
  const PADDING = 0.2;

  for (const item of items) {
    const fp = getFootprint(item);
    const qty = item.quantity || 1;
    const stackSize = fp.stackSize || 1;
    const stacks = Math.ceil(qty / stackSize);

    for (let s = 0; s < stacks; s++) {
      const w = fp.w + PADDING;
      const l = fp.l + PADDING;

      // Try to fit in current row
      if (curX + w > truckW) {
        // Move to next row
        curX = 0;
        curY += rowHeight + PADDING;
        rowHeight = 0;
      }

      if (curY + l <= truckL) {
        placements.push({
          x: curX,
          y: curY,
          w: fp.w,
          l: fp.l,
          color: fp.color,
          label: fp.label,
          qty: Math.min(stackSize, qty - s * stackSize),
          totalQty: qty,
          stacks,
        });
        curX += w;
        rowHeight = Math.max(rowHeight, l);
      }
    }
  }

  return placements;
}

export default function TruckFloorPlan({ truck, truckType }) {
  const dims = TRUCK_DIMS[truckType] || TRUCK_DIMS['26ft'];
  const SCALE = 10; // pixels per foot
  const W = dims.width * SCALE;
  const L = dims.length * SCALE;

  const placements = useMemo(() => {
    if (!truck.items?.length) return [];
    return packItems(truck.items, dims.width, dims.length);
  }, [truck.items, dims]);

  const usedLength = placements.length > 0
    ? Math.max(...placements.map(p => p.y + p.l))
    : 0;
  const fillPct = Math.round((usedLength / dims.length) * 100);

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-gray-900">{truck.name}</div>
          <div className="text-xs text-gray-500">{dims.width}ft wide × {dims.length}ft long · {fillPct}% floor used</div>
        </div>
        <div className="text-xs text-gray-400 italic">Top-down view — cab at top</div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative inline-block" style={{ width: W + 24, height: L + 24 }}>
          {/* Truck outline */}
          <svg width={W + 24} height={L + 24} className="absolute inset-0">
            {/* Cab indicator */}
            <rect x={8} y={2} width={W} height={12} rx={3} fill="#374151" />
            <text x={8 + W / 2} y={11} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">CAB</text>
            {/* Truck bed */}
            <rect x={8} y={16} width={W} height={L} rx={2} fill="#f8fafc" stroke="#94a3b8" strokeWidth={2} />
            {/* Grid lines every 5 ft */}
            {Array.from({ length: Math.floor(dims.length / 5) }).map((_, i) => (
              <line
                key={i}
                x1={8} y1={16 + (i + 1) * 5 * SCALE}
                x2={8 + W} y2={16 + (i + 1) * 5 * SCALE}
                stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3"
              />
            ))}
            {/* Distance labels */}
            {Array.from({ length: Math.floor(dims.length / 5) + 1 }).map((_, i) => (
              <text key={i} x={4} y={16 + i * 5 * SCALE + 4} fill="#94a3b8" fontSize={6} textAnchor="end">
                {i * 5}ft
              </text>
            ))}
            {/* Placed items */}
            {placements.map((p, idx) => (
              <g key={idx}>
                <rect
                  x={8 + p.x * SCALE}
                  y={16 + p.y * SCALE}
                  width={p.w * SCALE}
                  height={p.l * SCALE}
                  rx={2}
                  fill={p.color}
                  fillOpacity={0.85}
                  stroke="white"
                  strokeWidth={1}
                />
                {/* Label if wide enough */}
                {p.w * SCALE > 20 && p.l * SCALE > 12 && (
                  <>
                    <text
                      x={8 + p.x * SCALE + (p.w * SCALE) / 2}
                      y={16 + p.y * SCALE + (p.l * SCALE) / 2 - 3}
                      textAnchor="middle"
                      fill="white"
                      fontSize={7}
                      fontWeight="bold"
                    >
                      {p.label.length > 12 ? p.label.slice(0, 11) + '…' : p.label}
                    </text>
                    {p.stacks > 1 && (
                      <text
                        x={8 + p.x * SCALE + (p.w * SCALE) / 2}
                        y={16 + p.y * SCALE + (p.l * SCALE) / 2 + 7}
                        textAnchor="middle"
                        fill="white"
                        fontSize={6}
                      >
                        ×{p.qty}
                      </text>
                    )}
                  </>
                )}
              </g>
            ))}
            {/* Unused space indicator */}
            {usedLength < dims.length && (
              <rect
                x={8} y={16 + usedLength * SCALE}
                width={W} height={(dims.length - usedLength) * SCALE}
                fill="#f0fdf4" fillOpacity={0.5}
                stroke="#86efac" strokeWidth={1} strokeDasharray="4,4"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[...new Map(placements.map(p => [p.color, p])).values()].map(p => (
          <div key={p.color} className="flex items-center gap-1 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}