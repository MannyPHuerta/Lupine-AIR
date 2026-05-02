/**
 * RouteOptimizer — shows nearest-neighbor optimized stop order for a single driver.
 * Used in the Dispatch Board's driver groups.
 */
import { useState } from 'react';
import { Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { optimizeRoute } from '@/lib/routeOptimizer';

export default function RouteOptimizer({ items, driverLocation, onSelectItem, type }) {
  const [open, setOpen] = useState(false);

  // Only items with geocoded coords can be optimized
  const geocoded = items.filter(i => i._lat && i._lng);
  if (geocoded.length < 2) return null;

  const origin = driverLocation
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
    : null;

  const stops = geocoded.map(i => ({ ...i, lat: i._lat, lng: i._lng }));
  const optimized = optimizeRoute(stops, origin);

  return (
    <div className="border-t border-dashed border-indigo-200 bg-indigo-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
      >
        <Navigation className="w-3.5 h-3.5" />
        Suggested Route ({geocoded.length} stops)
        {open ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
      </button>

      {open && (
        <ol className="px-4 pb-3 space-y-1">
          {optimized.map((stop, idx) => (
            <li key={stop.id}>
              <button
                onClick={() => onSelectItem(stop)}
                className="w-full text-left flex items-center gap-2 py-1.5 hover:text-indigo-800 transition"
              >
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-gray-900 truncate">{stop.customerName}</div>
                  <div className="text-xs text-gray-500">{stop.customerCity}</div>
                </div>
                {stop._distFromPrev !== undefined && (
                  <span className="text-xs text-indigo-400 flex-shrink-0">
                    +{stop._distFromPrev} mi
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}