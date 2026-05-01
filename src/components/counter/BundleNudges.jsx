import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Lightbulb, Plus, Loader2 } from 'lucide-react';

export default function BundleNudges({ cart, startDate, endDate, onAddBundle }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cart.length === 0 || !startDate || !endDate) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    base44.functions.invoke('suggestBundles', {
      selectedItems: cart.map(c => ({ id: c.id, name: c.name, category: c.category })),
    })
      .then(res => setSuggestions(res?.data?.suggestions || []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [cart, startDate, endDate]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading suggestions…
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-amber-50 px-3 py-2 rounded border border-amber-200">
        <Lightbulb className="w-3.5 h-3.5" /> Smart Suggestions
      </div>
      {suggestions.map((sugg, idx) => (
        <div key={idx} className="text-xs bg-white border rounded p-2 flex items-start justify-between gap-2">
          <div>
            <div className="font-medium text-gray-900">{sugg.name}</div>
            {sugg.reason && <div className="text-gray-600 mt-0.5">{sugg.reason}</div>}
          </div>
          <button
            onClick={() => onAddBundle(sugg)}
            className="text-indigo-600 hover:text-indigo-800 font-medium flex-shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      ))}
    </div>
  );
}