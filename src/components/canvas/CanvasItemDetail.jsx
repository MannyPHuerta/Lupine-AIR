import { RotateCw, Trash2, Copy, Minus, Plus } from 'lucide-react';

export default function CanvasItemDetail({ item, onUpdate, onDelete, onDuplicate }) {
  if (!item) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/20 rounded-xl shadow-2xl px-5 py-3 flex items-center gap-5 z-10">
      {/* Item name */}
      <div>
        <div className="text-white font-semibold text-sm">{item.equipmentName}</div>
        <div className="text-white/40 text-xs">{item.widthFt}×{item.lengthFt} ft · {item.category}</div>
      </div>

      {/* Quantity */}
      <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
        <span className="text-white/40 text-xs mr-1">Qty</span>
        <button onClick={() => onUpdate({ ...item, quantity: Math.max(1, (item.quantity || 1) - 1) })}
          className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
          <Minus className="w-3 h-3" />
        </button>
        <span className="text-white text-sm w-6 text-center">{item.quantity || 1}</span>
        <button onClick={() => onUpdate({ ...item, quantity: (item.quantity || 1) + 1 })}
          className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Rotation */}
      <div className="border-l border-white/10 pl-4">
        <button
          onClick={() => onUpdate({ ...item, rotation: ((item.rotation || 0) + 90) % 360 })}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition"
        >
          <RotateCw className="w-4 h-4" />
          Rotate
        </button>
      </div>

      {/* Notes */}
      <div className="border-l border-white/10 pl-4">
        <input
          className="bg-slate-700 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/30 w-36"
          placeholder="Notes..."
          value={item.notes || ''}
          onChange={e => onUpdate({ ...item, notes: e.target.value })}
        />
      </div>

      {/* Price */}
      {item.dailyRate && (
        <div className="border-l border-white/10 pl-4 text-right">
          <div className="text-cyan-400 font-bold text-sm">${(item.dailyRate * (item.quantity || 1)).toFixed(2)}/day</div>
          <div className="text-white/30 text-[10px]">× {item.quantity || 1} unit{(item.quantity || 1) !== 1 ? 's' : ''}</div>
        </div>
      )}

      {/* Actions */}
      <div className="border-l border-white/10 pl-4 flex gap-1">
        <button onClick={() => onDuplicate(item)}
          className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition" title="Duplicate">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(item.id)}
          className="p-1.5 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}