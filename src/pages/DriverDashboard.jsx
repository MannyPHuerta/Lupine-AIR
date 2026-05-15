import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, MapPin, Clock, CheckCircle, AlertCircle, RotateCcw, FileBarChart, Bell, Users, Printer } from 'lucide-react';
import { format, parseISO } from 'date-fns';

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
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [markingReceived, setMarkingReceived] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'status'
  const [filterDate, setFilterDate] = useState('');

  const handleMarkReceived = async (delivery) => {
    setMarkingReceived(delivery.id);
    try {
      const now = new Date().toISOString();
      await base44.entities.Delivery.update(delivery.id, {
        receivedAt: now,
        receivedBy: driver?.email,
      });
      setDeliveries(prev => prev.map(d =>
        d.id === delivery.id ? { ...d, receivedAt: now, receivedBy: driver?.email } : d
      ));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setMarkingReceived(null);
    }
  };

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Delivery.list('-created_date', 50),
      base44.entities.Recovery.list('-created_date', 50),
    ]).then(([user, dels, recs]) => {
      setDriver(user);
      // if admin/manager, show all deliveries; otherwise show only this driver's
      const filterByDriver = selectedDriver || (user.role === 'admin' ? null : user.email);
      
      if (filterByDriver) {
        setDeliveries(dels.filter(d =>
          d.driverId === filterByDriver ||
          d.teamDrivers?.some(t => t.driverId === filterByDriver)
        ));
        setRecoveries(recs.filter(r => r.driverId === filterByDriver));
      } else {
        setDeliveries(dels);
        setRecoveries(recs);
      }
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
  }, [selectedDriver]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const activeStatuses = ['scheduled', 'departed', 'arrived', 'setup_complete', 'signed'];

  // If filtering by date, show only that day's activities
  if (filterDate) {
    const filteredDeliveries = deliveries.filter(d => d.scheduledDate === filterDate);
    const filteredRecoveries = recoveries.filter(r => r.scheduledDate === filterDate);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
          <div className="px-4 py-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">🚚 Driver Dashboard</div>
              <button onClick={() => navigate('/driver-report')} className="p-2 rounded-lg hover:bg-indigo-800" title="Performance Report">
                <FileBarChart className="w-5 h-5" />
              </button>
            </div>
            <div className="text-indigo-300 text-xs mt-1">{driver?.full_name} • {driver?.email}</div>
            <div className="mt-2 text-sm text-indigo-200">
              {format(parseISO(filterDate), 'MMMM d, yyyy')} — {filteredDeliveries.length} deliveries · {filteredRecoveries.length} recoveries
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setFilterDate('')}
                className="px-3 py-1 bg-indigo-800 hover:bg-indigo-700 rounded text-xs text-indigo-200 transition"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1 bg-indigo-800 hover:bg-indigo-700 rounded text-xs text-indigo-200 transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {filteredDeliveries.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Deliveries</h2>
              <div className="space-y-3">
                {filteredDeliveries.map(d => (
                  <DeliveryCard key={d.id} delivery={d}
                    onSelect={() => navigate(`/delivery/${d.id}`)}
                    onMarkReceived={handleMarkReceived}
                    markingReceived={markingReceived}
                    currentDriver={driver}
                  />
                ))}
              </div>
            </section>
          )}
          {filteredRecoveries.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" /> Recoveries
              </h2>
              <div className="space-y-3">
                {filteredRecoveries.map(r => (
                  <RecoveryCard key={r.id} recovery={r} onSelect={() => navigate(`/recovery/${r.id}`)} />
                ))}
              </div>
            </section>
          )}
          {filteredDeliveries.length === 0 && filteredRecoveries.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              <div className="text-lg font-medium">No activities on {format(parseISO(filterDate), 'MMM d')}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sort deliveries by date or group by status
  const sortedDeliveries = [...deliveries].sort((a, b) => {
    if (sortBy === 'date') {
      return (a.scheduledDate || '').localeCompare(b.scheduledDate || '');
    } else {
      return (a.status || '').localeCompare(b.status || '');
    }
  });

  const todaysDeliveries = sortedDeliveries.filter(d => d.scheduledDate === today && activeStatuses.includes(d.status));
  const overdueDeliveries = sortedDeliveries.filter(d => d.scheduledDate < today && activeStatuses.includes(d.status));
  const upcomingDeliveries = sortedDeliveries.filter(d => d.scheduledDate > today && activeStatuses.includes(d.status));
  const completedDeliveries = sortedDeliveries.filter(d => d.status === 'completed');
  const todaysRecoveries = recoveries.filter(r => r.scheduledDate === today && r.status !== 'completed');
  const upcomingRecoveries = recoveries.filter(r => r.scheduledDate > today && r.status !== 'completed');

  const driversList = [...new Map(
    deliveries.concat(recoveries)
      .flatMap(d => d.teamDrivers || (d.driverId ? [{ driverId: d.driverId, driverName: d.driverName }] : []))
      .map(t => [t.driverId, t])
  ).values()].sort((a, b) => (a.driverName || '').localeCompare(b.driverName || ''));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold">🚚 Driver Dashboard</div>
            <button onClick={() => navigate('/driver-report')} className="p-2 rounded-lg hover:bg-indigo-800" title="Performance Report">
              <FileBarChart className="w-5 h-5" />
            </button>
          </div>
          <div className="text-indigo-300 text-xs mt-1">{driver?.full_name} • {driver?.email}</div>
          <div className="mt-2 text-sm text-indigo-200">
            {todaysDeliveries.length + overdueDeliveries.length} deliveries · {todaysRecoveries.length} recoveries today
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {driver?.role === 'admin' && driversList.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-indigo-300">Drivers:</span>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className={`text-xs px-2 py-1 rounded transition ${!selectedDriver ? 'bg-white text-indigo-900' : 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'}`}
                >
                  All
                </button>
                {driversList.map(d => (
                  <button
                    key={d.driverId}
                    onClick={() => setSelectedDriver(d.driverId)}
                    className={`text-xs px-2 py-1 rounded transition ${selectedDriver === d.driverId ? 'bg-white text-indigo-900' : 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'}`}
                  >
                    {d.driverName?.split(' ')[0]}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-300">Sort:</span>
              <button
                onClick={() => setSortBy('date')}
                className={`text-xs px-2 py-1 rounded transition ${sortBy === 'date' ? 'bg-white text-indigo-900' : 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'}`}
              >
                Date
              </button>
              <button
                onClick={() => setSortBy('status')}
                className={`text-xs px-2 py-1 rounded transition ${sortBy === 'status' ? 'bg-white text-indigo-900' : 'bg-indigo-800 hover:bg-indigo-700 text-indigo-200'}`}
              >
                Status
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-300">Filter by date:</span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="text-xs px-2 py-1 rounded bg-indigo-800 text-white border border-indigo-700 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overdue / Past-scheduled Deliveries */}
        {overdueDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">⚠️ Pending (Past Scheduled Date)</h2>
            <div className="space-y-3">
              {overdueDeliveries.map(d => (
                <DeliveryCard key={d.id} delivery={d}
                  onSelect={() => navigate(`/delivery/${d.id}`)}
                  onMarkReceived={handleMarkReceived}
                  markingReceived={markingReceived}
                  currentDriver={driver}
                />
              ))}
            </div>
          </section>
        )}

        {/* Today's Deliveries */}
        {todaysDeliveries.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Today's Deliveries</h2>
            <div className="space-y-3">
              {todaysDeliveries.map(d => (
                <DeliveryCard key={d.id} delivery={d}
                  onSelect={() => navigate(`/delivery/${d.id}`)}
                  onMarkReceived={handleMarkReceived}
                  markingReceived={markingReceived}
                  currentDriver={driver}
                />
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
                <DeliveryCard key={d.id} delivery={d}
                  onSelect={() => navigate(`/delivery/${d.id}`)}
                  onMarkReceived={handleMarkReceived}
                  markingReceived={markingReceived}
                  currentDriver={driver}
                />
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
                <DeliveryCard key={d.id} delivery={d} onSelect={() => navigate(`/delivery/${d.id}`)} currentDriver={driver} />
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

        {todaysDeliveries.length === 0 && overdueDeliveries.length === 0 && upcomingDeliveries.length === 0 && todaysRecoveries.length === 0 && upcomingRecoveries.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-lg font-medium">No assignments for today</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryCard({ delivery, onSelect, onMarkReceived, markingReceived, currentDriver }) {
  const statusClass = STATUS_COLORS[delivery.status] || 'bg-gray-50 border-gray-200';
  const isLoading = markingReceived === delivery.id;
  const alreadyReceived = !!delivery.receivedAt;
  const isTeamDelivery = delivery.teamDrivers?.length > 1;

  return (
    <div className={`border rounded-lg p-4 transition-all ${statusClass}`}>
      <button onClick={onSelect} className="w-full text-left">
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
            {isTeamDelivery && (
              <div className="text-xs opacity-75 mt-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Team: {delivery.teamDrivers.map(t => t.driverName).join(', ')}
              </div>
            )}
            {delivery.assignedAt && (
              <div className="text-xs opacity-60 mt-1 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Assigned {format(parseISO(delivery.assignedAt), 'MM/dd HH:mm')}
                {delivery.assignedBy && ` by ${delivery.assignedBy.split('@')[0]}`}
              </div>
            )}
            <div className="text-xs opacity-75 mt-1">{delivery.items?.length || 0} item(s)</div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <StatusBadge status={delivery.status} />
            {delivery.status === 'completed' && <CheckCircle className="w-5 h-5" />}
            {delivery.status === 'scheduled' && !alreadyReceived && <AlertCircle className="w-5 h-5 opacity-50" />}
          </div>
        </div>
      </button>

      {/* Mark as Received */}
      {delivery.status === 'scheduled' && onMarkReceived && (
        <div className="mt-3 pt-3 border-t border-current border-opacity-20">
          {alreadyReceived ? (
            <div className="text-xs text-green-700 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              Received {format(parseISO(delivery.receivedAt), 'MM/dd HH:mm')}
            </div>
          ) : (
            <button
              onClick={() => onMarkReceived(delivery)}
              disabled={isLoading}
              className="w-full py-1.5 text-xs font-semibold rounded bg-white bg-opacity-60 border border-current border-opacity-30 hover:bg-opacity-80 flex items-center justify-center gap-1.5 transition"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Mark as Received
            </button>
          )}
        </div>
      )}
    </div>
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