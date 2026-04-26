import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';

const CATEGORIES = [
  'Air Compressor', 'Backhoe', 'Boom Lift', 'Bulldozer', 'Chair', 'Chipper/Shredder',
  'Compactor', 'Concrete Equipment', 'Dance Floor', 'Dump Truck', 'Excavator',
  'Floor Sander', 'Forklift', 'Generator', 'Grader', 'Inflatable', 'Light Tower',
  'Loader', 'Pallet Jack', 'Paving Equipment', 'Plate Compactor', 'Pressure Washer',
  'Sandblaster', 'Scissor Lift', 'Skid Steer', 'Staging', 'Stump Grinder', 'Table',
  'Telehandler', 'Tent', 'Tile Stripper', 'Trailer', 'Trencher', 'Water Pump',
  'Welder', 'Zero Turn Mower', 'Fleet Vehicle', 'Tool', 'Other',
];

export default function CatalogCategorizer({ items, onCategorized }) {
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState({});
  const [applying, setApplying] = useState(false);

  const suggestCategories = async () => {
    setSuggesting(true);
    const suggestions_map = {};

    for (const item of items) {
      try {
        const description = `${item.description1 || ''} ${item.description2 || ''}`.trim();
        if (!description) {
          suggestions_map[item.id] = 'Other';
          continue;
        }

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Given this equipment description, choose the SINGLE BEST category from this list: ${CATEGORIES.join(', ')}\n\nDescription: "${description}"\n\nRespond with ONLY the category name, nothing else.`,
          response_json_schema: { type: 'object', properties: { category: { type: 'string' } } },
        });

        const suggested = result.category || 'Other';
        const normalized = CATEGORIES.find(c => c.toLowerCase() === suggested.toLowerCase()) || 'Other';
        suggestions_map[item.id] = normalized;
      } catch {
        suggestions_map[item.id] = 'Other';
      }
    }

    setSuggestions(suggestions_map);
    setSuggesting(false);
  };

  const applySuggestions = async () => {
    setApplying(true);
    const updates = items
      .filter(item => suggestions[item.id])
      .map(item => base44.entities.InventoryItem.update(item.id, { category: suggestions[item.id], reviewStatus: 'approved' }));

    await Promise.all(updates);
    setSuggestions({});
    onCategorized();
    setApplying(false);
  };

  const hasSuggestions = Object.keys(suggestions).length > 0;

  return (
    <div className="space-y-3">
      {!hasSuggestions ? (
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
          onClick={suggestCategories}
          disabled={suggesting || items.length === 0}
        >
          {suggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {suggesting ? `Analyzing ${items.length} items...` : `Suggest Categories (${items.length} items)`}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-sm font-medium text-purple-900 mb-2">Category Suggestions:</div>
            <div className="space-y-1 max-h-48 overflow-y-auto text-xs text-gray-700">
              {items.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="truncate flex-1">{item.description1 || '(no name)'}</span>
                  <span className="text-purple-700 font-semibold ml-2">{suggestions[item.id]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setSuggestions({})}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
              onClick={applySuggestions}
              disabled={applying}
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
              {applying ? 'Applying...' : `Apply to ${items.length} items`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}