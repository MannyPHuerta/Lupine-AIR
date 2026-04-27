import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AISuggestions({ equipmentId, equipmentName, onAddToCart }) {
  const [suggestions, setSuggestions] = useState([]);
  const [reasoning, setReasoning] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!equipmentId) {
      setSuggestions([]);
      setReasoning('');
      return;
    }

    setLoading(true);
    setError(null);
    base44.functions.invoke('suggestBundles', { equipmentId, equipmentName })
      .then(res => {
        setSuggestions(res.data.suggestions || []);
        setReasoning(res.data.reasoning || '');
      })
      .catch(() => setError('Could not load suggestions'))
      .finally(() => setLoading(false));
  }, [equipmentId, equipmentName]);

  if (!equipmentId) return null;
  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Generating suggestions…
      </div>
    );
  }
  if (error || suggestions.length === 0) return null;

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="text-xs font-semibold text-amber-700">AI Bundle Suggestion</span>
      </div>
      {reasoning && <p className="text-xs text-gray-600 mb-2 italic">"{reasoning}"</p>}
      <div className="space-y-1.5">
        {suggestions.map(sugg => (
          <div key={sugg.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
            <div>
              <div className="font-medium text-gray-900">{sugg.name}</div>
              <div className="text-gray-500">${sugg.dailyRate}/day</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddToCart(sugg)}
              className="h-7 text-xs gap-1 border-amber-300 hover:bg-amber-100"
            >
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}