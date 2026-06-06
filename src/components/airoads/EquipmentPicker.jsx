import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Plus, X, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAIEquipmentSearch } from '@/hooks/useAIEquipmentSearch';

export default function EquipmentPicker({ equipment, onAdd, allEquipment = [] }) {
  const [search, setSearch] = useState('');
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [qty, setQty] = useState(1);
  const timerRef = useRef(null);
  const { aiSuggestions, isSearching, triggerAISearch, clearAISuggestions } = useAIEquipmentSearch(allEquipment);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    return allEquipment
      .filter(e => !equipment.some(eq => eq.id === e.id))
      .filter(e => e.name?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [search, allEquipment, equipment]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (search.trim().length >= 3 && filtered.length === 0) {
      timerRef.current = setTimeout(() => triggerAISearch(search.trim()), 600);
    } else {
      clearAISuggestions();
    }
    return () => clearTimeout(timerRef.current);
  }, [search, filtered.length]);

  const handleAddCatalogItem = (item) => {
    const hasRealDims = item.footprintWidth && item.footprintLength;
    const count = Math.max(1, parseInt(qty) || 1);
    for (let i = 0; i < count; i++) {
      onAdd({
        id: `${item.id}-${Date.now()}-${i}`,
        name: item.name,
        weight: hasRealDims ? ((item.footprintWidth * item.footprintLength) / 100) * 1500 : 500,
        volume: hasRealDims ? item.footprintWidth * item.footprintLength : 10,
      });
    }
    setSearch('');
    setQty(1);
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return;
    const count = Math.max(1, parseInt(qty) || 1);
    for (let i = 0; i < count; i++) {
      onAdd({
        id: `manual-${Date.now()}-${i}`,
        name: manualName,
        weight: parseInt(weight) || 500,
        volume: parseInt(volume) || 10,
      });
    }
    setManualName('');
    setWeight('');
    setVolume('');
    setQty(1);
    setShowManual(false);
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">Add Equipment</h3>
        <div className="flex items-center gap-3">
          {/* Quantity selector */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span className="text-xs text-gray-600 font-semibold">Qty:</span>
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-base font-bold shadow-sm"
            >−</button>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 h-7 border border-gray-300 rounded text-center text-base font-bold text-gray-900 bg-white"
            />
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-base font-bold shadow-sm"
            >+</button>
          </div>
          <button onClick={() => setShowManual(!showManual)} className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold">
            {showManual ? 'Search Catalog' : 'Enter Manually'}
          </button>
        </div>
      </div>

      {!showManual ? (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 pointer-events-none z-10" />
          <Input
            placeholder="Search catalog..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
          {(filtered.length > 0 || isSearching || aiSuggestions.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
              {filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddCatalogItem(item)}
                  className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b last:border-b-0 transition flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.category || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {qty > 1 && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                        Adding {qty}×
                      </span>
                    )}
                    <div className="w-8 h-8 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-indigo-600" />
                    </div>
                  </div>
                </button>
              ))}
                    {filtered.length === 0 && isSearching && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-indigo-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching by alternate names…
                </div>
              )}
              {filtered.length === 0 && !isSearching && aiSuggestions.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border-b">
                    <Sparkles className="w-3 h-3" /> Did you mean…
                  </div>
                  {aiSuggestions.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddCatalogItem(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b last:border-b-0 transition flex items-center justify-between group"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.category || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {qty > 1 && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                            Adding {qty}×
                          </span>
                        )}
                        <div className="w-8 h-8 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-indigo-600" />
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
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
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
            <span className="text-xs text-amber-800 font-semibold">Quantity:</span>
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-7 h-7 rounded bg-white border border-amber-300 flex items-center justify-center text-amber-700 hover:bg-amber-100 text-base font-bold"
            >−</button>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 h-7 border border-amber-300 rounded text-center text-base font-bold text-amber-900 bg-white"
            />
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-7 h-7 rounded bg-white border border-amber-300 flex items-center justify-center text-amber-700 hover:bg-amber-100 text-base font-bold"
            >+</button>
            {qty > 1 && <span className="text-xs text-amber-700 font-semibold ml-1">({qty} items will be added)</span>}
          </div>
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
              Add {qty > 1 ? `${qty} Items` : 'Item'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}