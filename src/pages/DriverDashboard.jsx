import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Clock, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';

const STATUS_COLORS = {
  scheduled: 'bg-blue-50 border-blue-200 text-blue-900',
  departed: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  arrived: 'bg-amber-50 border-amber-200 text-amber-900',
  setup_complete: 'bg-purple-50 border-purple-200 text-purple-900',
  signed: 'bg-green-50 border-green-200 text-green-900',
  completed: 'bg-green-100 border-green-300 text-green-900',
};

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [recoveries, setRecoveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Delivery.list('-created_date', 50),
      base44.entities.Recovery.list('-created_date', 50),
    ]).then(([user, dels, recs]) => {
      setDriver(user);
      setDeliveries(dels.filter(d => d.driverId === user.email));
      setRecoveries(recs.filter(r => r.driverId === user.email));
      setLoading(false);

      // Auto-track location every 60 seconds while page is open
      if (!navigator.geolocation) return;

      const updateLocation = (position) => {
        base44.entities.DriverLocation.filter({ driverEmail: user.email }).then(existing => {
          const payload = {
            driverEmail: user.email,
            driverName: user.full_name,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            updatedAt: new Date().toISOString(),
          };
          if (existing.length > 0) {
            base44.entities.DriverLocation.update(existing[0].id, payload);
          } else {
            base44.entities.DriverLocation.create(payload);
          }
        });
      };

      navigator.geolocation.getCurrentPosition(updateLocation);
      const interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(updateLocation);
      }, 60000);

      return () => clearInterval(interval);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todaysDeliveries = deliveries.filter(d => d.scheduledDate === today);
  const upcomingDeliveries = deliveries.filter(d => d.scheduledDate > today);
  const completedDeliveries = deliveries.filter(d => d.status === 'completed');
  const todaysRecoveries = recoveries.filter(r => r.scheduledDate === today && r.status !== 'completed');
  const upcomingRecoveries = recoveries.filter(r => r.scheduledDate > today);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="text-lg font-bold">🚚 Driver Dashboard</div>
          <div className="text-indigo-300 text-xs mt-1">{driver?.full_name} • {driver?.email}</div>
          <div className="mt-2 text-sm text-indigo-200">
            {todaysDeliveries.length} deliveries · {todaysRecoveries.length} recoveries today
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Today's Deliveries */}
        {todaysDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Deliveries</h2>
            <div className="space-y-3">
              {todaysDeliveries.map(d => (
                <DeliveryCard key={d.id} delivery={d} onSelect={() => navigate(`/delivery/${d.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Deliveries */}
        {upcomingDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming Deliveries</h2>
            <div className="space-y-3">
              {upcomingDeliveries.map(d => (
                <DeliveryCard key={d.id} delivery={d} onSelect={() => navigate(`/delivery/${d.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Completed Deliveries */}
        {completedDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Completed</h2>
            <div className="space-y-3">
              {completedDeliveries.slice(0, 5).map(d => (
                <DeliveryCard key={d.id} delivery={d} onSelect={() => navigate(`/delivery/${d.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Today's Recoveries */}
        {todaysRecoveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" /> Today's Recoveries
            </h2>
            <div className="space-y-3">
              {todaysRecoveries.map(r => (
                <RecoveryCard key={r.id} recovery={r} onSelect={() => navigate(`/recovery/${r.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Recoveries */}
        {upcomingRecoveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-400" /> Upcoming Recoveries
            </h2>
            <div className="space-y-3">
              {upcomingRecoveries.map(r => (
                <RecoveryCard key={r.id} recovery={r} onSelect={() => navigate(`/recovery/${r.id}`)} />
              ))}
            </div>
          </section>
        )}

        {todaysDeliveries.length === 0 && upcomingDeliveries.length === 0 && todaysRecoveries.length === 0 && upcomingRecoveries.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-lg font-medium">No assignments for today</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryCard({ delivery, onSelect }) {
  const statusClass = STATUS_COLORS[delivery.status] || 'bg-gray-50 border-gray-200';
  
  return (
    <button
      onClick={onSelect}
      className={`w-full border rounded-lg p-4 text-left transition-all hover:shadow-md ${statusClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base">{delivery.customerName}</div>
          <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {delivery.customerCity}, {delivery.customerState}
          </div>
          <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {delivery.scheduledTime || delivery.scheduledDate}
          </div>
          <div className="text-xs opacity-75 mt-2">{delivery.items?.length || 0} item(s)</div>
        </div>
        
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge status={delivery.status} />
          {delivery.status === 'completed' && <CheckCircle className="w-5 h-5" />}
          {delivery.status === 'scheduled' && <AlertCircle className="w-5 h-5 opacity-50" />}
        </div>
      </div>
    </button>
  );
}

function RecoveryCard({ recovery, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className="w-full border rounded-lg p-4 text-left transition-all hover:shadow-md bg-rose-50 border-rose-200 text-rose-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            {recovery.customerName}
          </div>
          <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {recovery.customerCity}, {recovery.customerState}
          </div>
          <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {recovery.scheduledDate}
          </div>
          <div className="text-xs opacity-75 mt-2">{recovery.items?.length || 0} item(s) to recover</div>
        </div>
        <span className="text-xs font-medium bg-white bg-opacity-60 px-2 py-1 rounded flex-shrink-0">
          {recovery.status.replace(/_/g, ' ')}
        </span>
      </div>
    </button>
  );
}

function StatusBadge({ status }) {
  const labels = {
    scheduled: '📋 Scheduled',
    departed: '🚗 Departed',
    arrived: '📍 Arrived',
    setup_complete: '⚙️ Setup Complete',
    signed: '✍️ Signed',
    completed: '✅ Completed',
  };
  
  return <span className="text-xs font-medium bg-white bg-opacity-60 px-2 py-1 rounded">{labels[status] || status}</span>;
}