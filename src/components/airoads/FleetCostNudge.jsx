import { useState, useEffect } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const TRUCK_SPECS = {
  '18wheeler': { name: '18-Wheeler', weightCapacity: 80000, volumeCapacity: 3000, costPerMile: 3.5 },
  '26ft': { name: '26ft Box Truck', weightCapacity: 26000, volumeCapacity: 1400, costPerMile: 2.5 },
  '24ft': { name: '24ft Box Truck', weightCapacity: 24000, volumeCapacity: 1200, costPerMile: 2.2 },
  'sprinter': { name: 'Sprinter Van', weightCapacity: 5000, volumeCapacity: 300, costPerMile: 1.5 },
};

function trucksNeeded(totalWeight, totalVolume, type) {
  const spec = TRUCK_SPECS[type];
  const byWeight = Math.ceil(totalWeight / spec.weightCapacity);
  const byVolume = Math.ceil(totalVolume / spec.volumeCapacity);
  return Math.max(1, byWeight, byVolume);
}

function fleetCost(count, type, distance) {
  const spec = TRUCK_SPECS[type];
  return count * distance * 2 * spec.costPerMile;
}

export default function FleetCostNudge({ loads, eventEquipment, distance }) {
  const [expanded, setExpanded] = useState(false);

  // Calculate totals from all items (assigned + unassigned)
  const allItems = [...eventEquipment, ...loads.flatMap(t => t.items || [])];
  const totalWeight = allItems.reduce((s, e) => s + (e.weight || 0), 0);
  const totalVolume = allItems.reduce((s, e) => s + (e.volume || 0), 0);

  if (allItems.length === 0 || distance === 0) return null;

  // Build comparison for each truck type
  const options = Object.entries(TRUCK_SPECS).map(([key, spec]) => {
    const count = trucksNeeded(totalWeight, totalVolume, key);
    const cost = fleetCost(count, key, distance);
    return { key, name: spec.name, count, cost };
  }).sort((a, b) => a.cost - b.cost);

  const cheapest = options[0];
  const current = {
    cost: loads.reduce((sum, t) => {
      const spec = TRUCK_SPECS[t.type] || TRUCK_SPECS['18wheeler'];
      return sum + distance * 2 * spec.costPerMile;
    }, 0),
    summary: loads.length === 0
      ? 'No trucks yet'
      : loads.reduce((acc, t) => {
          const name = TRUCK_SPECS[t.type]?.name || t.type;
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {}),
  };

  const currentSummaryText = typeof current.summary === 'string'
    ? current.summary
    : Object.entries(current.summary).map(([name, cnt]) => `${cnt}× ${name}`).join(' + ');

  const savings = current.cost - cheapest.cost;
  const isOptimal = savings <= 0 || loads.length === 0;

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${isOptimal ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <Lightbulb className={`w-4 h-4 flex-shrink-0 ${isOptimal ? 'text-emerald-600' : 'text-amber-500'}`} />
        <span className={`flex-1 font-medium ${isOptimal ? 'text-emerald-800' : 'text-amber-800'}`}>
          {loads.length === 0
            ? `💡 Cheapest option for this load: ${cheapest.count}× ${cheapest.name} — $${cheapest.cost.toFixed(0)}`
            : isOptimal
            ? `✅ Your current fleet (${currentSummaryText}) is the most cost-effective at $${current.cost.toFixed(0)}`
            : `💡 Switch to ${cheapest.count}× ${cheapest.name} and save $${savings.toFixed(0)} vs your current setup ($${current.cost.toFixed(0)})`
          }
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-current border-opacity-20 pt-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">All options for {(totalWeight / 1000).toFixed(1)}k lbs / {totalVolume} cu ft:</div>
          {options.map((opt, i) => (
            <div key={opt.key} className="flex items-center justify-between text-xs">
              <span className={`${i === 0 ? 'font-bold text-emerald-700' : 'text-gray-600'}`}>
                {i === 0 ? '⭐ ' : ''}{opt.count}× {opt.name}
              </span>
              <span className={`font-mono ${i === 0 ? 'font-bold text-emerald-700' : 'text-gray-500'}`}>
                ${opt.cost.toFixed(0)}
              </span>
            </div>
          ))}
          <div className="text-xs text-gray-400 mt-2">Based on {distance} mi one-way • minimum trucks to fit weight &amp; volume</div>
        </div>
      )}
    </div>
  );
}