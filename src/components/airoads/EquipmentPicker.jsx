import { useState, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function EquipmentPicker({ equipment, onAdd, allEquipment = [] }) {
  const [search, setSearch] = useState('');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    return allEquipment
      .filter(e => !equipment.some(eq => eq.id === e.id))
      .filter(e => e.name?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [search, allEquipment, equipment]);

  const handleAddCatalogItem = (item) => {
    onAdd({
      id: item.id,
      name: item.name,
      weight: item.footprintWidth && item.footprintLength ? ((item.footprintWidth * item.footprintLength) / 100) * 1500 : 0,
      volume: item.footprintWidth && item.footprintLength ? item.footprintWidth * item.footprintLength : 0,
    });
    setSearch('');
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return;
    onAdd({
      id: `manual-${Date.now()}`,
      name: manualName,
      weight: parseInt(weight) || 0,
      volume: parseInt(volume) || 0,
    });
    setManualName('');
    setWeight('');
    setVolume('');
    setShowManual(false);
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Add Equipment</h3>
        <button onClick={() => setShowManual(!showManual)} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
          {showManual ? 'Search Catalog' : 'Enter Manually'}
        </button>
      </div>

      {!showManual ? (
        <div className="relative">
          <Input
            placeholder="Search catalog..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            icon={<Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />}
          />
          {filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddCatalogItem(item)}
                  className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b last:border-b-0 transition flex items-center justify-between group"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.category || '—'}</div>
                  </div>
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            placeholder="Equipment name (e.g. Tent 20x30)"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1 font-semibold">Weight (lbs)</label>
              <Input
                type="number"
                placeholder="0"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1 font-semibold">Volume (cu ft)</label>
              <Input
                type="number"
                placeholder="0"
                value={volume}
                onChange={e => setVolume(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowManual(false)} className="flex-1">
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddManual} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              Add Item
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}