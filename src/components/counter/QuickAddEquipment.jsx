import { useState, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function QuickAddEquipment({ equipment, onAdd }) {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  const filtered = equipment
    .filter(e => e.status !== 'retired' && (e.unitStatus || 'available') === 'available')
    .filter(e =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase()) ||
      e.assetNumber?.toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 8);

  const handleAdd = (item) => {
    onAdd(item);
    setSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          placeholder="Add equipment... (type name)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {search && filtered.length > 0 && (
        <div className="border rounded-lg bg-white max-h-48 overflow-y-auto shadow-md">
          {filtered.map(item => (
            <button
              key={item.id}
              onClick={() => handleAdd(item)}
              className="w-full text-left p-2 text-xs border-b last:border-0 hover:bg-indigo-50 transition flex items-start justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-gray-600 text-xs mt-0.5">
                  ${item.dailyRate}/day · {item.category}
                </div>
              </div>
              <Plus className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0 mt-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}