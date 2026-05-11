import { GripVertical } from 'lucide-react';

export default function EquipmentItem({ item, onDragStart, isDragging = false }) {
  const vol = item.volume || 10; // Default 10 cu ft placeholder
  const isPlaceholder = !item.volume;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-move transition flex-shrink-0 ${
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
        {item.name}
      </div>
      <span className={`text-xs ml-auto flex-shrink-0 ${isPlaceholder ? 'text-gray-400' : 'text-gray-500'}`}>
        {vol}cf {isPlaceholder && '(est)'}
      </span>
    </div>
  );
}