import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function DeliveryAssignment() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Rental.list('-created_date', 500),
      base44.entities.Delivery.list('-created_date', 500),
      base44.entities.User.list(),
    ]).then(([rents, dels, usrs]) => {
      setRentals(rents);
      setDeliveries(dels);
      setUsers(usrs);
      setLoading(false);
    });
  }, []);

  // Find rentals that need company delivery but don't have a delivery record yet
  const pendingDeliveries = useMemo(() => {
    return rentals.filter(r => {
      if (r.deliveryMethod !== 'company_delivery') return false;
      if (r.status === 'cancelled' || r.status === 'quote') return false;
      const hasDelivery = deliveries.some(d => d.rentalId === r.id);
      return !hasDelivery;
    });
  }, [rentals, deliveries]);

  const handleCreateDelivery = async (rental, driverId, driverName) => {
    setCreating(true);
    try {
      await base44.entities.Delivery.create({
        rentalId: rental.id,
        customerId: rental.customerId,
        customerName: rental.customerName,
        customerPhone: rental.customerPhone,
        customerAddress: rental.customerAddress,
        customerCity: rental.customerCity,
        customerState: rental.customerState,
        customerZip: rental.customerZip,
        driverId,
        driverName,
        branch: rental.branch || '01 McAllen',
        status: 'scheduled',
        items: [], // Will be populated from rental items
        scheduledDate: new Date().toISOString().split('T')[0],
        deliveryMethod: 'company_delivery',
        returnMethod: rental.returnMethod || 'company_pickup',
      });

      // Refresh deliveries
      const dels = await base44.entities.Delivery.list('-created_date', 500);
      setDeliveries(dels);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/manager')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">📦 Delivery Assignment</div>
            <div className="text-indigo-300 text-xs">{pendingDeliveries.length} rental(s) need delivery</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {pendingDeliveries.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div className="text-lg font-medium">All deliveries assigned</div>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDeliveries.map(rental => (
              <DeliveryAssignmentCard
                key={rental.id}
                rental={rental}
                drivers={users.filter(u => u.role !== 'admin')}
                onAssign={handleCreateDelivery}
                isCreating={creating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryAssignmentCard({ rental, drivers, onAssign, isCreating }) {
  const [selectedDriver, setSelectedDriver] = useState('');

  const handleAssign = () => {
    if (!selectedDriver) {
      alert('Select a driver');
      return;
    }
    const driver = drivers.find(d => d.id === selectedDriver);
    onAssign(rental, driver.email, driver.full_name);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="min-w-0">
          <div className="font-bold text-gray-900">{rental.customerName}</div>
          <div className="text-xs text-gray-600 mt-1">
            {rental.customerAddress}, {rental.customerCity}, {rental.customerState} {rental.customerZip}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Invoice: <strong>{rental.invoiceNumber || rental.id}</strong>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Assign Driver</label>
          <select
            value={selectedDriver}
            onChange={e => setSelectedDriver(e.target.value)}
            disabled={isCreating}
            className="w-full h-8 border border-input rounded px-2 text-xs bg-white"
          >
            <option value="">— Select driver —</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.full_name} ({d.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            onClick={handleAssign}
            disabled={isCreating || !selectedDriver}
            className="w-full h-8 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Create Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
}