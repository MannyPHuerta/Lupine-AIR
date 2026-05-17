import { useState, useEffect, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Plus, Loader2, Link2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// equipmentItem = the full Equipment record (has .dependencies[])
// equipment = full catalog list (to resolve dependency names/rates)
// rentals = all rental records to check conflicts
// startDate, endDate = current line's rental dates
// branch = customer's branch for multi-branch availability
function AISuggestions({ equipmentId, equipmentName, equipmentItem, equipment = [], onAddToCart, rentals = [], startDate = '', endDate = '', branch = '' }) {
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [reasoning, setReasoning] = useState('');
  const [loading, setLoading] = useState(false);

  // Resolve catalog dependencies from the equipment record
  const dependencies = (equipmentItem?.dependencies || []).map(dep => {
    const eq = equipment.find(e => e.id === dep.equipmentId);
    if (!eq) return null;
    return { ...eq, reason: dep.reason, minQuantity: dep.minQuantity || 1 };
  }).filter(Boolean);

  // IDs already covered by dependencies — don't duplicate in AI section
  const depIds = new Set(dependencies.map(d => d.id));

  // Check availability for a suggestion given current rental dates
  const getAvailability = (suggestionId) => {
    if (!startDate || !endDate) return { status: 'unknown', conflicts: [] };
    const conflicts = rentals.filter(r => {
      if (r.equipmentId !== suggestionId) return false;
      if (['cancelled', 'completed'].includes(r.status)) return false;
      // Only check same branch
      if (branch && r.branch !== branch) return false;
      return !(endDate < r.startDate || startDate > r.endDate);
    });
    return { status: conflicts.length === 0 ? 'available' : 'booked', conflicts };
  };

  useEffect(() => {
    if (!equipmentId) { setAiSuggestions([]); setReasoning(''); return; }

    setLoading(true);
    base44.functions.invoke('suggestBundles', { equipmentId, equipmentName })
      .then(res => {
        const suggs = (res.data.suggestions || []).filter(s => !depIds.has(s.id));
        setAiSuggestions(suggs);
        setReasoning(res.data.reasoning || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [equipmentId, equipmentName]);

  if (!equipmentId) return null;

  if (dependencies.length === 0 && loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Generating suggestions…
      </div>
    );
  }
  if (dependencies.length === 0 && aiSuggestions.length === 0 && !loading) return null;

  return (
    <div className="mt-3 border-t pt-3 space-y-3">
      {/* Required dependencies */}
      {dependencies.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Link2 className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-700">Required / Recommended Items</span>
          </div>
          <div className="space-y-1.5">
            {dependencies.map(dep => (
              <div key={dep.id} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs">
                <div>
                  <div className="font-medium text-gray-900">{dep.name}</div>
                  <div className="text-gray-500">
                    ${dep.dailyRate}/day
                    {dep.reason && <span className="ml-1 italic text-blue-600">· {dep.reason}</span>}
                    {dep.minQuantity > 1 && <span className="ml-1 text-gray-400">(min {dep.minQuantity})</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddToCart(dep)}
                  className="h-7 text-xs gap-1 border-blue-300 hover:bg-blue-100"
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI history-based suggestions */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading AI suggestions…
        </div>
      )}
      {!loading && aiSuggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-700">Customers Also Rented</span>
          </div>
          {reasoning && <p className="text-xs text-gray-600 mb-2 italic">"{reasoning}"</p>}
          <div className="space-y-1.5">
            {aiSuggestions.map(sugg => {
              const avail = getAvailability(sugg.id);
              const isBooked = avail.status === 'booked';
              return (
                <div key={sugg.id} className={`flex items-center justify-between border rounded-lg px-3 py-2 text-xs ${
                  isBooked ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{sugg.name}</div>
                    <div className="text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>${sugg.dailyRate}/day</span>
                      {!startDate || !endDate ? (
                        <span className="text-gray-400">Set dates to check availability</span>
                      ) : isBooked ? (
                        <span className="flex items-center gap-1 text-red-600 font-medium">
                          <AlertTriangle className="w-3 h-3" /> Booked {avail.conflicts.length > 0 && `(${avail.conflicts[0].customerName})`}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle className="w-3 h-3" /> Available
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAddToCart(sugg)}
                    disabled={isBooked}
                    className={`h-7 text-xs gap-1 shrink-0 ml-2 ${
                      isBooked ? 'opacity-40 cursor-not-allowed' : 'border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(AISuggestions);