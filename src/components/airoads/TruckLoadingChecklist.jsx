import { useState, useMemo } from 'react';
import { CheckCircle2, Circle, Printer, RotateCcw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Industry-standard loading checklist for a single truck.
 * - Tap any item row to mark it as loaded (green) / unloaded (gray)
 * - Progress bar shows % loaded
 * - Print button generates a foreman-ready crew sheet
 */
export default function TruckLoadingChecklist({ truck, mode = 'load' }) {
  const items = truck.items || [];

  // Each item gets N individual unit slots to check off
  // e.g. 3 generators = 3 checkboxes, 100 chairs = 100 chairs but grouped by 10s
  const slots = useMemo(() => {
    const result = [];
    for (const item of items) {
      const qty = item.quantity || 1;
      const name = item.equipmentName || item.name;
      const cat = (item.category || '').toLowerCase();
      const isStackable = cat === 'chair' || cat === 'dance floor' || name.toLowerCase().includes('chair');
      const groupSize = isStackable ? 10 : 1;
      const numGroups = Math.ceil(qty / groupSize);
      for (let g = 0; g < numGroups; g++) {
        const count = Math.min(groupSize, qty - g * groupSize);
        result.push({
          id: `${item.id || name}-${g}`,
          name,
          count,
          label: count === 1 ? name : `${name} (×${count})`,
          isStackable,
          category: item.category,
        });
      }
    }
    return result;
  }, [items]);

  const [checked, setChecked] = useState({});

  const toggle = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const reset = () => setChecked({});

  const totalSlots = slots.length;
  const loadedSlots = Object.values(checked).filter(Boolean).length;
  const pct = totalSlots === 0 ? 0 : Math.round((loadedSlots / totalSlots) * 100);
  const allDone = totalSlots > 0 && loadedSlots === totalSlots;

  const handlePrint = () => {
    const rows = slots.map(s => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 8px; font-size:14px;">${s.label}</td>
        <td style="padding:10px 8px; text-align:center;">
          <div style="width:20px;height:20px;border:2px solid #374151;border-radius:3px;display:inline-block;${checked[s.id] ? 'background:#16a34a;' : ''}"></div>
        </td>
        <td style="padding:10px 8px; font-size:12px; color:#9ca3af;">_________________________</td>
      </tr>
    `).join('');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Loading Crew Sheet – ${truck.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 2px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 6px; }
        .mode-badge { display:inline-block; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:bold;
          background:${mode === 'return' ? '#fef3c7' : '#dbeafe'}; color:${mode === 'return' ? '#92400e' : '#1e40af'}; margin-bottom:16px; }
        table { width:100%; border-collapse:collapse; }
        th { text-align:left; padding:8px; background:#f3f4f6; font-size:12px; color:#6b7280; border-bottom:2px solid #e5e7eb; }
        .footer { margin-top:24px; font-size:10px; color:#9ca3af; border-top:1px solid #eee; padding-top:8px; }
        .sig { margin-top:32px; display:flex; gap:48px; }
        .sig-line { flex:1; border-top:1px solid #374151; padding-top:4px; font-size:11px; color:#6b7280; }
        @media print { body { padding:12px; } }
      </style></head><body>
      <h1>${truck.name} – ${mode === 'return' ? '🔁 Return Load' : '📦 Load'} Crew Sheet</h1>
      <div class="meta">Printed ${new Date().toLocaleString()}</div>
      <div class="mode-badge">${mode === 'return' ? 'RETURN TRIP' : 'OUTBOUND TRIP'}</div>
      <table>
        <thead><tr>
          <th>Item</th><th style="text-align:center;width:60px;">✓ Done</th><th>Notes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="sig">
        <div class="sig-line">Foreman Signature</div>
        <div class="sig-line">Driver Signature</div>
        <div class="sig-line">Date / Time</div>
      </div>
      <div class="footer">AIRoads Load Planner · ${totalSlots} line items</div>
      <script>window.onload=()=>{window.print();}<\/script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div>
          <div className="font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            {truck.name}
            {mode === 'return' && (
              <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">RETURN TRIP</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{totalSlots} line items · tap to confirm loaded</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Crew Sheet
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2 border-b bg-white">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">{loadedSlots} of {totalSlots} confirmed</span>
          <span className={`font-bold ${allDone ? 'text-green-600' : 'text-indigo-600'}`}>{pct}%</span>
        </div>
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${allDone ? 'bg-green-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && (
          <div className="mt-1.5 text-xs font-bold text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> All items confirmed — truck ready!
          </div>
        )}
      </div>

      {/* Checklist rows */}
      <div className="divide-y">
        {slots.map(slot => {
          const done = !!checked[slot.id];
          return (
            <button
              key={slot.id}
              onClick={() => toggle(slot.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                done ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-gray-50'
              }`}
            >
              {done
                ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              }
              <span className={`text-sm font-medium flex-1 ${done ? 'text-green-800 line-through decoration-green-400' : 'text-gray-800'}`}>
                {slot.label}
              </span>
              {slot.isStackable && (
                <span className="text-xs text-gray-400 italic">stacked</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}