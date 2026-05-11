import { GripVertical } from 'lucide-react';

export default function EquipmentItem({ item, onDragStart, isDragging = false }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-move transition flex-shrink-0 ${
        isDragging
          ? 'opacity-50 border-gray-300'
          : 'bg-indigo-100 border-indigo-300 hover:bg-indigo-200 hover:border-indigo-400'
      }`}
    >
      <GripVertical className="w-3 h-3 text-indigo-500 flex-shrink-0" />
      <div className="text-xs font-medium text-gray-900 whitespace-nowrap truncate max-w-24">
        {item.name}
      </div>
      <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
        {item.volume}cf
      </span>
    </div>
  );
}