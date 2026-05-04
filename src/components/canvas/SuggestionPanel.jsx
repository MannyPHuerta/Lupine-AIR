import { useMemo, useState } from 'react';
import { Lightbulb, Plus, ChevronDown, Zap, Thermometer, Shield, Wine, Moon, AlertCircle } from 'lucide-react';
import { generateSuggestions, getAnchoringRequirements, deduplicateSuggestions } from '@/lib/eventSuggestions';

const CATEGORY_ICONS = {
  power: <Zap className="w-4 h-4 text-yellow-600" />,
  comfort: <Thermometer className="w-4 h-4 text-blue-600" />,
  lighting: <Moon className="w-4 h-4 text-purple-600" />,
  safety: <Shield className="w-4 h-4 text-red-600" />,
  bar: <Wine className="w-4 h-4 text-amber-600" />,
};

export default function SuggestionPanel({ canvasItems, eventData, equipment, onAddItem, onAnchoringAdd }) {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const suggestions = useMemo(() => {
    const raw = generateSuggestions(canvasItems, eventData, equipment);
    return deduplicateSuggestions(raw);
  }, [canvasItems, eventData, equipment]);

  const anchoringReqs = useMemo(() => {
    const hasTent = canvasItems.some(i => i.category === 'Tent' || i.equipmentName?.toLowerCase().includes('tent'));
    return getAnchoringRequirements(eventData?.venueSurface || 'unknown', hasTent);
  }, [canvasItems, eventData?.venueSurface]);

  const groupedSuggestions = useMemo(() => {
    const groups = {};
    suggestions.forEach(s => {
      if (!groups[s.category]) groups[s.category] = [];
      groups[s.category].push(s);
    });
    return groups;
  }, [suggestions]);

  const handleAddSuggestion = (suggestion) => {
    if (onAddItem) {
      onAddItem(suggestion.equipmentId, suggestion.equipmentName, suggestion.quantity);
    }
  };

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setCollapsed(false)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 shadow-lg flex items-center gap-2 transition-all"
          title="Show suggestions"
        >
          <Lightbulb className="w-5 h-5" />
          <span className="text-sm font-semibold">{suggestions.length}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white border border-gray-200 rounded-xl shadow-lg w-80 max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-3 flex items-center justify-between border-b border-indigo-700">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          <span className="font-bold">Smart Suggestions</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-white hover:bg-indigo-800 p-1 rounded transition"
          title="Collapse"
        >
          <ChevronDown className="w-4 h-4 rotate-180" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Anchoring Requirements */}
        {anchoringReqs.autoAdd.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="font-semibold text-amber-900 text-xs mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Anchoring for {eventData?.venueSurface || 'surface'}
            </div>
            <div className="text-xs text-amber-800 mb-2">{anchoringReqs.method}</div>
            <div className="space-y-1">
              {anchoringReqs.autoAdd.map((item, i) => {
                const eq = equipment.find(e => e.name === item.name);
                return (
                  <div key={i} className="flex items-center justify-between bg-white rounded p-2 border border-amber-100">
                    <div>
                      <div className="text-xs font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.reason}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (onAnchoringAdd) onAnchoringAdd(eq, item.quantity);
                        if (onAddItem && eq) onAddItem(eq.id, eq.name, item.quantity);
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-2 py-1 rounded transition"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            {anchoringReqs.warnings.length > 0 && (
              <div className="mt-2 text-xs text-amber-700 border-t border-amber-200 pt-2">
                {anchoringReqs.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Equipment Suggestions */}
        {suggestions.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            All set! No additional suggestions at this time.
          </div>
        ) : (
          Object.entries(groupedSuggestions).map(([category, items]) => (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[category]}
                  <span className="font-medium text-xs text-gray-800 capitalize">{category}</span>
                  <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full font-semibold">
                    {items.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 transition ${expandedCategory === category ? '' : '-rotate-90'}`}
                />
              </button>
              {expandedCategory === category && (
                <div className="px-3 py-2 space-y-2 bg-white">
                  {items.map((suggestion) => (
                    <div key={suggestion.equipmentId} className="flex items-start gap-2 pb-2 border-b border-gray-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900">{suggestion.equipmentName}</div>
                        <div className="text-xs text-gray-500 leading-snug">{suggestion.reason}</div>
                        {suggestion.quantity > 1 && (
                          <div className="text-xs text-indigo-600 font-semibold mt-1">Qty: {suggestion.quantity}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddSuggestion(suggestion)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-2 py-1 rounded whitespace-nowrap transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}