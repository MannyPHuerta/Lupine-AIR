import { useMemo } from 'react';
import { Printer } from 'lucide-react';

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
// Each item entry (which may have qty > 1) becomes one labeled block showing its count
function packItems(items, truckW, truckL) {
  const placements = [];
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;
  const PADDING = 0.3;

  for (const item of items) {
    const fp = getFootprint(item);
    const qty = item.quantity || 1;

    // Each distinct item line is one block, scaled slightly for high quantities
    const scale = qty > 10 ? Math.min(1.5, 1 + (qty - 10) * 0.02) : 1;
    const w = fp.w * scale + PADDING;
    const l = fp.l * scale + PADDING;

    // Try to fit in current row
    if (curX + w > truckW) {
      curX = 0;
      curY += rowHeight + PADDING;
      rowHeight = 0;
    }

    if (curY + l <= truckL) {
      placements.push({
        x: curX,
        y: curY,
        w: fp.w * scale,
        l: fp.l * scale,
        color: fp.color,
        label: fp.label,
        qty,
      });
      curX += w;
      rowHeight = Math.max(rowHeight, l);
    } else {
      // Overflow: force into last row at bottom
      placements.push({
        x: 0,
        y: Math.max(curY, truckL - fp.l * scale),
        w: fp.w * scale,
        l: fp.l * scale,
        color: fp.color,
        label: fp.label,
        qty,
        overflow: true,
      });
    }
  }

  return placements;
}

function printFloorPlan(truck, dims, fillPct, svgContent, legendItems) {
  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Floor Plan – ${truck.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
        .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; font-size: 12px; }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-swatch { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
        .footer { margin-top: 24px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
        @media print { body { padding: 12px; } }
      </style>
    </head>
    <body>
      <h1>${truck.name} – Load Floor Plan</h1>
      <div class="meta">${dims.width}ft wide × ${dims.length}ft long · ${fillPct}% floor used · Top-down view, cab at top</div>
      ${svgContent}
      <div class="legend">
        ${legendItems.map(p => `<div class="legend-item"><div class="legend-swatch" style="background:${p.color}"></div>${p.label}</div>`).join('')}
      </div>
      <div class="footer">Printed ${new Date().toLocaleString()} · AIRoads Load Planner</div>
      <script>window.onload = () => { window.print(); }<\/script>
    </body>
    </html>
  `);
  win.document.close();
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

  const legendItems = [...new Map(placements.map(p => [p.color, p])).values()];

  const handlePrint = () => {
    const svgEl = document.getElementById(`floorplan-svg-${truck.id}`);
    const svgContent = svgEl ? svgEl.outerHTML : '';
    printFloorPlan(truck, dims, fillPct, svgContent, legendItems);
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-bold text-gray-900">{truck.name}</div>
          <div className="text-xs text-gray-500">{dims.width}ft wide × {dims.length}ft long · {fillPct}% floor used</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400 italic">Top-down view — cab at top</div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative inline-block" style={{ width: W + 24, height: L + 24 }}>
          {/* Truck outline */}
          <svg id={`floorplan-svg-${truck.id}`} width={W + 24} height={L + 24} className="absolute inset-0">
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
                {p.w * SCALE > 16 && p.l * SCALE > 10 && (
                  <>
                    <text
                      x={8 + p.x * SCALE + (p.w * SCALE) / 2}
                      y={16 + p.y * SCALE + (p.l * SCALE) / 2 - (p.qty > 1 ? 4 : 0)}
                      textAnchor="middle"
                      fill="white"
                      fontSize={7}
                      fontWeight="bold"
                    >
                      {p.label.length > 12 ? p.label.slice(0, 11) + '…' : p.label}
                    </text>
                    {p.qty > 1 && (
                      <text
                        x={8 + p.x * SCALE + (p.w * SCALE) / 2}
                        y={16 + p.y * SCALE + (p.l * SCALE) / 2 + 7}
                        textAnchor="middle"
                        fill="white"
                        fontSize={8}
                        fontWeight="bold"
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
        {legendItems.map(p => (
          <div key={p.color} className="flex items-center gap-1 text-xs text-gray-600">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}