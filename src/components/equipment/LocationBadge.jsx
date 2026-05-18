/**
 * LocationBadge — Displays live GPS location for equipment with geo-fence status
 * Used on Equipment Detail page to show where the equipment is right now.
 */

import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, AlertTriangle, CheckCircle2, RotateCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatTime(isoStr) {
  if (!isoStr) return 'Never';
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default function LocationBadge({ equipment }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLocation = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('gpsQuery', { equipmentId: equipment.id });
      setResult(res.data);
    } catch (err) {
      setResult({ success: false, error: err.message, location: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on mount
    fetchLocation();
  }, [equipment.id]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLocation, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, equipment.id]);

  if (!result) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading location…
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="font-medium">GPS Tracking</span>
        </div>
        <div className="text-xs text-gray-500 mb-3">{result.error || 'No location data'}</div>
        <Button size="sm" variant="outline" onClick={fetchLocation} disabled={loading} className="text-xs">
          {loading ? 'Retrying…' : 'Try Again'}
        </Button>
      </div>
    );
  }

  const { location, device, provider, breach } = result;
  const mapsUrl = `https://www.google.com/maps/search/${location.latitude},${location.longitude}`;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-gray-900">Live Location</span>
          {provider && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              {provider.type}
            </span>
          )}
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`p-1.5 rounded transition ${autoRefresh ? 'bg-indigo-200 text-indigo-700' : 'bg-white/50 text-gray-400 hover:bg-white'}`}
          title={autoRefresh ? 'Stop auto-refresh' : 'Start auto-refresh'}
        >
          <RotateCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main location card */}
      <div className="bg-white rounded-lg p-3 space-y-2 border border-indigo-100">
        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Latitude</div>
            <div className="font-mono text-gray-900">{location.latitude?.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Longitude</div>
            <div className="font-mono text-gray-900">{location.longitude?.toFixed(4)}</div>
          </div>
        </div>

        {/* Address */}
        {location.address && (
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase">Address</div>
            <div className="text-sm text-gray-700">{location.address}</div>
          </div>
        )}

        {/* Speed & heading */}
        {(location.speed !== null || location.heading !== null) && (
          <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-100">
            {location.speed !== null && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Speed</div>
                <div className="text-gray-900">{location.speed?.toFixed(1) || '—'} mph</div>
              </div>
            )}
            {location.heading !== null && (
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">Heading</div>
                <div className="text-gray-900">{location.heading?.toFixed(0) || '—'}°</div>
              </div>
            )}
          </div>
        )}

        {/* Last seen */}
        <div className="text-xs text-gray-500 border-t border-gray-100 pt-2">
          Last seen: <span className="font-medium">{formatTime(location.timestamp)}</span>
        </div>
      </div>

      {/* Breach status */}
      {breach && (
        <div className={`rounded-lg p-2.5 text-sm flex items-start gap-2 ${breach.isBreached ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          {breach.isBreached ? (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            {breach.isBreached ? (
              <>
                <div className="font-semibold text-red-900">📍 Geo-fence Breach Detected</div>
                <div className="text-xs text-red-700 mt-0.5">
                  Equipment is {breach.radiusMiles} mi outside rental location ({breach.expectedAddress})
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-green-900">✓ Within Geo-fence</div>
                <div className="text-xs text-green-700 mt-0.5">
                  Equipment is within {breach.radiusMiles} mi of worksite
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={fetchLocation}
          disabled={loading}
          className="text-xs flex-1"
        >
          {loading ? 'Refreshing…' : 'Refresh Now'}
        </Button>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition font-medium">
          <ExternalLink className="w-3 h-3" /> View Map
        </a>
      </div>
    </div>
  );
}