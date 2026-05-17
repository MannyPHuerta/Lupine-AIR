import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, CheckCircle, Truck, Clock, User, ArrowRightLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];

export default function DeliveryAssignment() {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Rental.list('-created_date', 500),
      base44.entities.Delivery.list('-created_date', 500),
      base44.entities.User.list(),
      base44.auth.me(),
    ]).then(([rents, dels, usrs, me]) => {
      setRentals(rents);
      setDeliveries(dels);
      setUsers(usrs);
      setCurrentUser(me);
      setLoading(false);
    });
  }, []);

  // Find rentals that need company delivery (assigned or not)
  const pendingDeliveries = useMemo(() => {
    return rentals.filter(r => {
      if (r.deliveryMethod !== 'company_delivery') return false;
      if (r.status === 'cancelled' || r.status === 'completed' || r.status === 'quote') return false;
      if (branchFilter && r.branch !== branchFilter) return false;
      return true;
    }).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  }, [rentals, deliveries, branchFilter]);

  // Cross-branch transfer deliveries (auto-created, need driver assignment)
  const pendingTransfers = useMemo(() => {
    return deliveries.filter(d => {
      if (!d.isCrossTransfer) return false;
      if (d.status === 'cancelled' || d.status === 'completed') return false;
      if (branchFilter && d.branch !== branchFilter) return false;
      return true;
    }).sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''));
  }, [deliveries, branchFilter]);

  const handleCreateDelivery = async (rental, teamDriverIds) => {
    setCreating(true);
    try {
      const now = new Date().toISOString();
      const me = await base44.auth.me();
      const teamDrivers = teamDriverIds.map(id => {
        const u = users.find(u => u.id === id);
        return { driverId: u.email, driverName: u.full_name };
      });
      const primary = teamDrivers[0];

      await base44.entities.Delivery.create({
        rentalId: rental.id,
        customerId: rental.customerId,
        customerName: rental.customerName,
        customerPhone: rental.customerPhone,
        customerAddress: rental.customerAddress,
        customerCity: rental.customerCity,
        customerState: rental.customerState,
        customerZip: rental.customerZip,
        driverId: primary.driverId,
        driverName: primary.driverName,
        teamDrivers,
        assignedAt: now,
        assignedBy: me?.email || 'manager',
        branch: rental.branch || '01 McAllen',
        status: 'scheduled',
        items: [{ equipmentId: rental.equipmentId, equipmentName: rental.equipmentName, quantity: 1, checked: false }],
        scheduledDate: rental.startDate || new Date().toISOString().split('T')[0],
        notes: rental.notes || '',
      });

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
            <div className="text-indigo-300 text-xs">
              {pendingDeliveries.filter(r => !deliveries.some(d => d.rentalId === r.id)).length} unassigned deliveries · {pendingTransfers.filter(d => !d.driverId).length} unassigned transfers
              {currentUser && <span className="ml-2 opacity-70">· Assigning as {currentUser.full_name}</span>}
            </div>
          </div>
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="h-8 text-xs px-2 rounded bg-indigo-800 text-white border-0"
          >
            <option value="">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Cross-Branch Transfers */}
        {pendingTransfers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5">
                ⇄ Cross-Branch Transfers ({pendingTransfers.length})
              </span>
              <span className="text-xs text-gray-500">Equipment that needs to move between branches before the rental start date</span>
            </div>
            <div className="space-y-3">
              {pendingTransfers.map(delivery => (
                <TransferAssignmentCard
                  key={delivery.id}
                  delivery={delivery}
                  drivers={users.filter(u => ['driver', 'field_crew', 'user'].includes(u.role))}
                  isCreating={creating}
                  onAssign={async (deliveryId, teamDriverIds) => {
                    setCreating(true);
                    try {
                      const me = await base44.auth.me();
                      const teamDrivers = teamDriverIds.map(id => {
                        const u = users.find(u => u.id === id);
                        return { driverId: u.email, driverName: u.full_name };
                      });
                      const primary = teamDrivers[0];
                      await base44.entities.Delivery.update(deliveryId, {
                        driverId: primary.driverId,
                        driverName: primary.driverName,
                        teamDrivers,
                        assignedAt: new Date().toISOString(),
                        assignedBy: me?.email || 'manager',
                      });
                      const dels = await base44.entities.Delivery.list('-created_date', 500);
                      setDeliveries(dels);
                    } catch (err) { alert(`Error: ${err.message}`); }
                    finally { setCreating(false); }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Customer Deliveries */}
        {pendingDeliveries.length === 0 && pendingTransfers.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div className="text-lg font-medium">All deliveries assigned</div>
          </div>
        ) : pendingDeliveries.length > 0 && (
          <div>
            {pendingTransfers.length > 0 && (
              <div className="text-sm font-bold text-gray-700 mb-3">📦 Customer Deliveries ({pendingDeliveries.length})</div>
            )}
            <div className="space-y-3">
              {pendingDeliveries.map(rental => (
                <DeliveryAssignmentCard
                  key={rental.id}
                  rental={rental}
                  drivers={users.filter(u => ['driver', 'field_crew', 'user'].includes(u.role))}
                  deliveries={deliveries}
                  onAssign={handleCreateDelivery}
                  isCreating={creating}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TransferAssignmentCard({ delivery, drivers, onAssign, isCreating }) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const toggleDriver = (id) => setSelectedDrivers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const alreadyAssigned = !!delivery.driverId;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-bold text-gray-900 text-sm">
              {delivery.branch} → {delivery.destinationBranch}
            </span>
            <span className="text-xs bg-amber-200 text-amber-800 font-semibold px-1.5 py-0.5 rounded">Transfer</span>
          </div>
          <div className="text-xs text-gray-700 mt-1">
            {delivery.items?.map(i => i.equipmentName).join(', ')}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            For: <strong>{delivery.customerName}</strong> · Needed by {delivery.scheduledDate}
          </div>
          {delivery.notes && <div className="text-xs text-gray-400 mt-0.5 italic truncate">{delivery.notes}</div>}
          {alreadyAssigned && (
            <div className="text-xs text-green-700 flex items-center gap-1 mt-1">
              <Truck className="w-3 h-3" /> Assigned: {delivery.driverName}
              {delivery.teamDrivers?.length > 1 && ` +${delivery.teamDrivers.length - 1} more`}
            </div>
          )}
        </div>
        <div className="w-full md:w-72">
          <label className="text-xs font-medium text-gray-600 block mb-1">Assign Driver(s)</label>
          <div className="border rounded max-h-28 overflow-y-auto divide-y text-xs bg-white">
            {drivers.map(d => (
              <label key={d.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedDrivers.includes(d.id)} onChange={() => toggleDriver(d.id)} disabled={isCreating} className="accent-indigo-600" />
                <span className="font-medium">{d.full_name}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => { if (selectedDrivers.length === 0) { alert('Select at least one driver'); return; } onAssign(delivery.id, selectedDrivers); }}
            disabled={isCreating || selectedDrivers.length === 0}
            className="mt-2 w-full h-8 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
            {alreadyAssigned ? 'Reassign' : `Assign Transfer`}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveryAssignmentCard({ rental, drivers, deliveries, onAssign, isCreating }) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const existingDelivery = deliveries.find(d => d.rentalId === rental.id);

  const toggleDriver = (id) => {
    setSelectedDrivers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAssign = () => {
    if (selectedDrivers.length === 0) { alert('Select at least one driver'); return; }
    onAssign(rental, selectedDrivers);
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-gray-900">{rental.customerName}</div>
          <div className="text-xs text-gray-600 mt-1">
            {rental.customerAddress}, {rental.customerCity}, {rental.customerState} {rental.customerZip}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Invoice: <strong>{rental.invoiceNumber || rental.id}</strong> · {rental.startDate}
          </div>
          {existingDelivery && (
            <div className="space-y-0.5 mt-1">
              <div className="text-xs text-green-700 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Assigned: {existingDelivery.driverName}
                {existingDelivery.teamDrivers?.length > 1 && ` +${existingDelivery.teamDrivers.length - 1} more`}
                {existingDelivery.assignedAt && (
                  <span className="text-green-500 ml-1 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {format(parseISO(existingDelivery.assignedAt), 'MM/dd HH:mm')}
                  </span>
                )}
                {existingDelivery.receivedAt && (
                  <span className="text-indigo-600 ml-1">· Confirmed {format(parseISO(existingDelivery.receivedAt), 'HH:mm')}</span>
                )}
              </div>
              {(existingDelivery.recommendedCrew || existingDelivery.recommendedVehicles) && (
                <div className="text-[10px] text-indigo-600 flex items-center gap-2 bg-indigo-50 rounded px-2 py-0.5">
                  {existingDelivery.recommendedCrew && <span>👥 {existingDelivery.recommendedCrew} crew</span>}
                  {existingDelivery.recommendedVehicles && <span>🚛 {existingDelivery.recommendedVehicles} {existingDelivery.recommendedVehicleType || 'vehicle'}</span>}
                  {existingDelivery.recommendedDeliveryFee && <span className="text-green-700 font-semibold">${existingDelivery.recommendedDeliveryFee} fee</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full md:w-72">
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Assign Team (select one or more)
          </label>
          <div className="border rounded max-h-28 overflow-y-auto divide-y text-xs">
            {drivers.map(d => (
              <label key={d.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDrivers.includes(d.id)}
                  onChange={() => toggleDriver(d.id)}
                  disabled={isCreating}
                  className="accent-indigo-600"
                />
                <span className="font-medium">{d.full_name}</span>
                <span className="text-gray-400 text-[10px]">{d.email}</span>
              </label>
            ))}
          </div>
          <button
            onClick={handleAssign}
            disabled={isCreating || selectedDrivers.length === 0}
            className="mt-2 w-full h-8 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
          >
            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
            {existingDelivery ? 'Reassign' : `Assign${selectedDrivers.length > 1 ? ` Team (${selectedDrivers.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}