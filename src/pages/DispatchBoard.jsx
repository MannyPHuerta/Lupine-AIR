import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, RefreshCw, Loader2, Truck, RotateCcw, Map } from 'lucide-react';
import DispatchMap from '@/components/dispatch/DispatchMap';
import RouteOptimizer from '@/components/dispatch/RouteOptimizer';
import { getCached, setCached } from '@/lib/geocodeCache';

const DELIVERY_STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-800',
  departed: 'bg-indigo-100 text-indigo-800',
  arrived: 'bg-amber-100 text-amber-800',
  setup_complete: 'bg-purple-100 text-purple-800',
  signed: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const RECOVERY_STATUS_COLORS = {
  scheduled: 'bg-orange-100 text-orange-800',
  departed: 'bg-rose-100 text-rose-800',
  arrived: 'bg-amber-100 text-amber-800',
  photos_captured: 'bg-purple-100 text-purple-800',
  loaded: 'bg-indigo-100 text-indigo-800',
  returned_to_branch: 'bg-teal-100 text-teal-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

// Geocode a single address via Nominatim, with localStorage caching
async function geocode(address, city, state, zip) {
  const cached = getCached(address, city, state, zip);
  if (cached) return cached;

  const q = encodeURIComponent(`${address}, ${city}, ${state} ${zip}`);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  if (data[0]) {
    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    setCached(address, city, state, zip, coords);
    return coords;
  }
  return null;
}

export default function DispatchBoard() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [recoveries, setRecoveries] = useState([]);
  const [users, setUsers] = useState([]);
  const [driverLocations, setDriverLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('map');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Geocoded pins shared between map and list
  const [pins, setPins] = useState([]);
  const [geocoding, setGeocoding] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Delivery.list('-scheduledDate', 200),
      base44.entities.Recovery.list('-scheduledDate', 200),
      base44.entities.User.list(),
      base44.entities.DriverLocation.list('-updatedAt', 50),
    ]).then(([dels, recs, usrs, locs]) => {
      setDeliveries(dels);
      setRecoveries(recs);
      setUsers(usrs);
      setDriverLocations(locs);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const filteredDeliveries = deliveries.filter(d => !dateFilter || d.scheduledDate === dateFilter);
  const filteredRecoveries = recoveries.filter(r => !dateFilter || r.scheduledDate === dateFilter);

  // Geocode filtered items whenever date filter or data changes
  useEffect(() => {
    const items = [
      ...filteredDeliveries.filter(d => d.customerAddress).map(d => ({ ...d, _type: 'delivery' })),
      ...filteredRecoveries.filter(r => r.customerAddress).map(r => ({ ...r, _type: 'recovery' })),
    ];
    if (items.length === 0) { setPins([]); return; }

    setGeocoding(true);
    let cancelled = false;

    (async () => {
      const results = [];
      for (const item of items) {
        if (cancelled) break;
        // Only throttle uncached requests to respect Nominatim rate limit
        const isCached = !!getCached(item.customerAddress, item.customerCity, item.customerState, item.customerZip);
        if (!isCached) await new Promise(r => setTimeout(r, 250));
        const coords = await geocode(item.customerAddress, item.customerCity, item.customerState, item.customerZip);
        if (coords) results.push({ ...item, lat: coords.lat, lng: coords.lng, _lat: coords.lat, _lng: coords.lng });
      }
      if (!cancelled) { setPins(results); setGeocoding(false); }
    })();

    return () => { cancelled = true; };
  }, [filteredDeliveries.length, filteredRecoveries.length, dateFilter]);

  const driverName = (driverId) => {
    const u = users.find(u => u.email === driverId || u.id === driverId);
    return u ? u.full_name : driverId;
  };

  // Enrich items with geocoded coords so RouteOptimizer can use them
  const enrichWithCoords = (items) =>
    items.map(item => {
      const pin = pins.find(p => p.id === item.id);
      return pin ? { ...item, _lat: pin._lat, _lng: pin._lng } : item;
    });

  const groupByDriver = (items) => {
    const map = {};
    items.forEach(item => {
      const key = item.driverId || 'Unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  };

  const deliveryGroups = groupByDriver(enrichWithCoords(filteredDeliveries));
  const recoveryGroups = groupByDriver(enrichWithCoords(filteredRecoveries));

  const activeItems = tab === 'deliveries' ? filteredDeliveries : filteredRecoveries;
  const inProgress = activeItems.filter(i => !['completed', 'cancelled'].includes(i.status)).length;
  const completed = activeItems.filter(i => i.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/manager')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Dispatch Board</div>
            <div className="text-indigo-300 text-xs">{inProgress} in progress · {completed} completed</div>
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="h-8 text-xs px-2 rounded bg-indigo-800 text-white border-0"
          />
          <button onClick={load} className="p-2 rounded-lg hover:bg-indigo-800">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2 flex gap-2 max-w-6xl mx-auto">
          <button
            onClick={() => setTab('deliveries')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${tab === 'deliveries' ? 'bg-white text-indigo-900' : 'text-indigo-300 hover:text-white'}`}
          >
            🚚 Deliveries ({filteredDeliveries.length})
          </button>
          <button
            onClick={() => setTab('recoveries')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${tab === 'recoveries' ? 'bg-white text-indigo-900' : 'text-indigo-300 hover:text-white'}`}
          >
            🔄 Recoveries ({filteredRecoveries.length})
          </button>
          <button
            onClick={() => setTab('map')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1 ${tab === 'map' ? 'bg-white text-indigo-900' : 'text-indigo-300 hover:text-white'}`}
          >
            <Map className="w-3 h-3" /> Map
          </button>
        </div>
      </div>

      {tab === 'map' && !loading && (
        <DispatchMap
          pins={pins}
          geocoding={geocoding}
          deliveries={filteredDeliveries}
          recoveries={filteredRecoveries}
          driverLocations={driverLocations}
          onSelectDelivery={(id) => navigate(`/delivery/${id}`)}
          onSelectRecovery={(id) => navigate(`/recovery/${id}`)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : tab === 'map' ? null : (
          <div className="space-y-6">
            {tab === 'deliveries' && (
              Object.keys(deliveryGroups).length === 0 ? (
                <EmptyState label="No deliveries" />
              ) : (
                Object.entries(deliveryGroups).map(([driverId, items]) => (
                  <DriverGroup
                    key={driverId}
                    driverName={driverId === 'Unassigned' ? 'Unassigned' : driverName(driverId)}
                    driverId={driverId}
                    items={items}
                    type="delivery"
                    driverLocations={driverLocations}
                    onSelect={(item) => navigate(`/delivery/${item.id}`)}
                    statusColors={DELIVERY_STATUS_COLORS}
                  />
                ))
              )
            )}
            {tab === 'recoveries' && (
              Object.keys(recoveryGroups).length === 0 ? (
                <EmptyState label="No recoveries" />
              ) : (
                Object.entries(recoveryGroups).map(([driverId, items]) => (
                  <DriverGroup
                    key={driverId}
                    driverName={driverId === 'Unassigned' ? 'Unassigned' : driverName(driverId)}
                    driverId={driverId}
                    items={items}
                    type="recovery"
                    driverLocations={driverLocations}
                    onSelect={(item) => navigate(`/recovery/${item.id}`)}
                    statusColors={RECOVERY_STATUS_COLORS}
                  />
                ))
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DriverGroup({ driverName, driverId, items, type, driverLocations, onSelect, statusColors }) {
  const completed = items.filter(i => i.status === 'completed').length;
  const driverLoc = driverLocations.find(d => d.driverEmail === driverId);

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'delivery' ? <Truck className="w-4 h-4 text-indigo-600" /> : <RotateCcw className="w-4 h-4 text-rose-600" />}
          <span className="font-semibold text-gray-900">{driverName}</span>
          {driverLoc && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">📍 Live</span>
          )}
        </div>
        <span className="text-xs text-gray-500">{completed}/{items.length} done</span>
      </div>
      <div className="divide-y">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-medium text-sm text-gray-900">{item.customerName}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {item.customerCity}, {item.customerState}
                {item.scheduledTime ? ` · ${item.scheduledTime}` : ''}
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>
              {item.status.replace(/_/g, ' ')}
            </span>
          </button>
        ))}
      </div>
      {/* Route optimizer — only shows if ≥2 stops have geocoded coords */}
      <RouteOptimizer
        items={items}
        driverLocation={driverLoc}
        onSelectItem={onSelect}
        type={type}
      />
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="text-center text-gray-400 py-16 text-sm">{label} scheduled for this date</div>
  );
}