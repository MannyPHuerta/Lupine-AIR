import { GripVertical, X } from 'lucide-react';

export default function EquipmentItem({ item, onDragStart, isDragging = false, onRemove }) {
  const vol = item.volume || 10;
  const isPlaceholder = !item.volume;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-move transition flex-shrink-0 group ${
        isDragging
          ? 'opacity-50 border-gray-300'
          : isPlaceholder
          ? 'bg-gray-100 border-gray-300 hover:bg-gray-200 hover:border-gray-400'
          : 'bg-indigo-100 border-indigo-300 hover:bg-indigo-200 hover:border-indigo-400'
      }`}
      title={isPlaceholder ? 'Default dimensions (edit to customize)' : ''}
    >
      <GripVertical className="w-3 h-3 flex-shrink-0" style={{ color: isPlaceholder ? '#9ca3af' : '#6366f1' }} />
      <div className="text-xs font-medium text-gray-900 whitespace-nowrap truncate max-w-24">
        {item.equipmentName || item.name}
        {item.quantity > 1 && <span className="ml-1 text-indigo-600">×{item.quantity}</span>}
      </div>
      <span className={`text-xs flex-shrink-0 ${isPlaceholder ? 'text-gray-400' : 'text-gray-500'}`}>
        {vol * (item.quantity || 1)}cf {isPlaceholder && '(est)'}
      </span>
      {onRemove && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(item); }}
          onMouseDown={e => e.stopPropagation()}
          className="ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
          title="Remove from truck"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}