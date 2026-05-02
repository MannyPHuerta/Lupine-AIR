/**
 * RouteOptimizer — shows nearest-neighbor optimized stop order for a single driver.
 * - Re-optimizes live from driver's GPS when available
 * - Each stop links to Google Maps for turn-by-turn navigation
 */
import { useState, useEffect } from 'react';
import { Navigation, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { optimizeRoute } from '@/lib/routeOptimizer';

function mapsUrl(address, city, state, zip) {
  const q = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving`;
}

export default function RouteOptimizer({ items, driverLocation, onSelectItem, type }) {
  const [open, setOpen] = useState(false);
  const [liveOrigin, setLiveOrigin] = useState(null);

  // Poll device GPS every 60s when panel is open to keep route fresh
  useEffect(() => {
    if (!open) return;
    if (!navigator.geolocation) return;

    const update = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        setLiveOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [open]);

  // Only items with geocoded coords can be optimized
  const geocoded = items.filter(i => i._lat && i._lng);
  if (geocoded.length < 2) return null;

  // Priority: live device GPS > driver's last known location from DB
  const origin = liveOrigin
    || (driverLocation ? { lat: driverLocation.latitude, lng: driverLocation.longitude } : null);

  const stops = geocoded.map(i => ({ ...i, lat: i._lat, lng: i._lng }));
  const optimized = optimizeRoute(stops, origin);

  const isLive = !!liveOrigin;

  return (
    <div className="border-t border-dashed border-indigo-200 bg-indigo-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition"
      >
        <Navigation className="w-3.5 h-3.5" />
        Suggested Route ({geocoded.length} stops)
        {isLive && (
          <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full font-medium">
            Live GPS
          </span>
        )}
        {open ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
      </button>

      {open && (
        <ol className="px-4 pb-3 space-y-1">
          {optimized.map((stop, idx) => (
            <li key={stop.id} className="flex items-center gap-2">
              <button
                onClick={() => onSelectItem(stop)}
                className="flex-1 text-left flex items-center gap-2 py-1.5 hover:text-indigo-800 transition min-w-0"
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

              {/* Google Maps deep-link */}
              <a
                href={mapsUrl(stop.customerAddress, stop.customerCity, stop.customerState, stop.customerZip)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 p-1.5 rounded text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition"
                title="Open in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}