import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const STATUS_DOT_COLORS = {
  scheduled: '#3b82f6',
  departed: '#6366f1',
  arrived: '#f59e0b',
  setup_complete: '#a855f7',
  signed: '#14b8a6',
  completed: '#22c55e',
  photos_captured: '#a855f7',
  loaded: '#6366f1',
  returned_to_branch: '#14b8a6',
  cancelled: '#9ca3af',
};

function makeIcon(color, label) {
  return L.divIcon({
    className: '',
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `
      <div style="
        background:${color};
        border:2px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        width:28px;height:28px;
        box-shadow:0 2px 6px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:11px;color:white;font-weight:700;">${label}</span>
      </div>`,
  });
}

function makeDriverIcon(initials) {
  return L.divIcon({
    className: '',
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="
        background:#1e3a8a;
        border:3px solid white;
        border-radius:50%;
        width:36px;height:36px;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        display:flex;align-items:center;justify-content:center;
        font-size:12px;color:white;font-weight:700;
      ">${initials}</div>
      <div style="
        position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);
        width:0;height:0;
        border-left:5px solid transparent;
        border-right:5px solid transparent;
        border-top:6px solid #1e3a8a;
      "></div>`,
  });
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [positions, map]);
  return null;
}

/**
 * DispatchMap now receives pre-geocoded pins (items with lat/lng already set).
 * Geocoding is owned by DispatchBoard so coords can be shared with route optimizer.
 */
export default function DispatchMap({ pins = [], geocoding = false, driverLocations = [], onSelectDelivery, onSelectRecovery, defaultCenter = [26.2034, -98.2300] }) {
  const allPositions = [
    ...pins,
    ...driverLocations.filter(d => d.latitude && d.longitude).map(d => ({ lat: d.latitude, lng: d.longitude })),
  ];

  return (
    <div className="relative" style={{ height: 'calc(100vh - 120px)' }}>
      {geocoding && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-gray-200 shadow-md rounded-full px-4 py-1.5 text-xs text-gray-600 flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
          Geocoding addresses…
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 left-3 z-[1000] bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs space-y-1">
        <div className="font-semibold text-gray-700 mb-1">Legend</div>
        {[['Delivery', '#3b82f6'], ['Recovery', '#f43f5e'], ['Completed', '#22c55e'], ['Driver', '#1e3a8a']].map(([label, color]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      <MapContainer center={defaultCenter} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds positions={allPositions} />

        {/* Driver dots */}
        {driverLocations.filter(d => d.latitude && d.longitude).map(driver => {
          const initials = (driver.driverName || driver.driverEmail || '?')
            .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const ageMinutes = driver.updatedAt
            ? Math.round((Date.now() - new Date(driver.updatedAt).getTime()) / 60000)
            : null;
          return (
            <Marker
              key={`driver-${driver.driverEmail}`}
              position={[driver.latitude, driver.longitude]}
              icon={makeDriverIcon(initials)}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[140px]">
                  <div className="font-semibold">🚗 {driver.driverName || driver.driverEmail}</div>
                  {ageMinutes !== null && (
                    <div className="text-xs text-gray-500">
                      Updated {ageMinutes < 1 ? 'just now' : `${ageMinutes}m ago`}
                    </div>
                  )}
                  {driver.accuracy && (
                    <div className="text-xs text-gray-400">±{Math.round(driver.accuracy)}m accuracy</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Stop pins */}
        {pins.map(pin => {
          const isDelivery = pin._type === 'delivery';
          const color = pin.status === 'completed'
            ? '#22c55e'
            : isDelivery ? (STATUS_DOT_COLORS[pin.status] || '#3b82f6') : '#f43f5e';
          const label = isDelivery ? 'D' : 'R';
          return (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={makeIcon(color, label)}>
              <Popup>
                <div className="text-sm space-y-1 min-w-[160px]">
                  <div className="font-semibold">{pin.customerName}</div>
                  <div className="text-gray-600 text-xs">{pin.customerAddress}</div>
                  <div className="text-gray-600 text-xs">{pin.customerCity}, {pin.customerState}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium" style={{ background: color }}>
                      {pin.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gray-400 text-xs">{isDelivery ? '🚚 Delivery' : '🔄 Recovery'}</span>
                  </div>
                  {pin.scheduledTime && <div className="text-xs text-gray-500">⏰ {pin.scheduledTime}</div>}
                  <button
                    onClick={() => isDelivery ? onSelectDelivery(pin.id) : onSelectRecovery(pin.id)}
                    className="mt-2 w-full text-center text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
                  >
                    Open details →
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}