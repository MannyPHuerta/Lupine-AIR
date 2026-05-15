import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, X, Loader2, UserPlus, Truck, CheckCircle, Users, Sparkles } from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, parseISO
} from 'date-fns';
import { base44 } from '@/api/base44Client';

const STATUS_COLORS = {
  out:         { bg: 'bg-red-500',    label: 'Out' },
  contract:    { bg: 'bg-orange-400', label: 'Contract' },
  reservation: { bg: 'bg-blue-400',  label: 'Reserved' },
  quote:       { bg: 'bg-gray-300',   label: 'Quote' },
  returned:    { bg: 'bg-purple-400', label: 'Returned' },
  completed:   { bg: 'bg-green-400',  label: 'Completed' },
};

function dateInRange(date, startStr, endStr) {
  if (!startStr || !endStr) return false;
  const d = new Date(date); d.setHours(12);
  const s = parseISO(startStr); s.setHours(0);
  const e = parseISO(endStr);   e.setHours(23, 59);
  return d >= s && d <= e;
}

function AssignDeliveryPanel({ rental, users, deliveries, currentUser, onAssigned, onClose }) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [aiRec, setAiRec] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);

  const existingDelivery = deliveries.find(d => d.rentalId === rental.id);
  const drivers = users.filter(u => u.role !== 'admin');

  const fetchAIRec = async () => {
    setLoadingRec(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Equipment rental logistics: recommend crew and vehicles for delivering "${rental.equipmentName}" to ${rental.customerCity || 'local'}, ${rental.customerState || 'TX'}. Return JSON only.`,
        response_json_schema: {
          type: 'object',
          properties: {
            crewCount: { type: 'integer' },
            vehicleCount: { type: 'integer' },
            vehicleType: { type: 'string' },
            recommendedFee: { type: 'number' }
          }
        }
      });
      setAiRec(result);
    } catch (e) {
      setAiRec({ error: e.message });
    } finally {
      setLoadingRec(false);
    }
  };

  const toggleDriver = (driverId) => {
    setSelectedDrivers(prev =>
      prev.includes(driverId) ? prev.filter(id => id !== driverId) : [...prev, driverId]
    );
  };

  const handleAssign = async () => {
    if (selectedDrivers.length === 0) { alert('Select at least one driver'); return; }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const assignedDrivers = selectedDrivers.map(id => {
        const u = users.find(u => u.id === id);
        return { driverId: u.email, driverName: u.full_name };
      });

      const primaryDriver = assignedDrivers[0];
      const teamNote = assignedDrivers.length > 1
        ? `Team: ${assignedDrivers.map(d => d.driverName).join(', ')}`
        : '';

      const payload = {
        rentalId: rental.id,
        customerId: rental.customerId,
        customerName: rental.customerName,
        customerPhone: rental.customerPhone,
        customerAddress: rental.customerAddress,
        customerCity: rental.customerCity,
        customerState: rental.customerState,
        customerZip: rental.customerZip,
        driverId: primaryDriver.driverId,
        driverName: primaryDriver.driverName,
        branch: rental.branch || '01 McAllen',
        status: 'scheduled',
        items: [{ equipmentId: rental.equipmentId, equipmentName: rental.equipmentName, quantity: 1, checked: false }],
        scheduledDate: rental.startDate || new Date().toISOString().split('T')[0],
        notes: [rental.notes, teamNote].filter(Boolean).join('\n'),
        assignedAt: now,
        assignedBy: currentUser?.email || 'manager',
        teamDrivers: assignedDrivers,
        ...(aiRec && !aiRec.error ? {
          recommendedCrew: aiRec.crewCount,
          recommendedVehicles: aiRec.vehicleCount,
          recommendedVehicleType: aiRec.vehicleType,
          recommendedDeliveryFee: aiRec.recommendedFee,
        } : {}),
      };

      let result;
      if (existingDelivery) {
        result = await base44.entities.Delivery.update(existingDelivery.id, {
          driverId: primaryDriver.driverId,
          driverName: primaryDriver.driverName,
          teamDrivers: assignedDrivers,
          notes: payload.notes,
          assignedAt: now,
          assignedBy: currentUser?.email || 'manager',
          status: existingDelivery.status === 'completed' ? 'completed' : 'scheduled',
        });
      } else {
        result = await base44.entities.Delivery.create(payload);
      }

      onAssigned(result);
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t pt-3">
      <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
        <UserPlus className="w-3 h-3" />
        {existingDelivery ? 'Reassign Delivery Team' : 'Assign Delivery'}
      </div>
      {existingDelivery && (
        <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1 mb-2 flex items-center gap-1">
          <Truck className="w-3 h-3" />
          Currently: {existingDelivery.driverName || 'Unassigned'}
          {existingDelivery.assignedAt && (
            <span className="text-green-500 ml-1">
              · {format(parseISO(existingDelivery.assignedAt), 'MM/dd HH:mm')}
            </span>
          )}
        </div>
      )}
      <div className="max-h-28 overflow-y-auto space-y-1 mb-2">
        {drivers.length === 0 ? (
          <div className="text-xs text-gray-400">No drivers available</div>
        ) : drivers.map(d => (
          <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
            <input
              type="checkbox"
              checked={selectedDrivers.includes(d.id)}
              onChange={() => toggleDriver(d.id)}
              className="accent-indigo-600"
            />
            <span>{d.full_name}</span>
            <span className="text-gray-400">({d.email})</span>
          </label>
        ))}
      </div>
      {/* AI Crew Recommendation */}
      {!aiRec && !loadingRec && (
        <button
          onClick={fetchAIRec}
          className="w-full text-[10px] flex items-center justify-center gap-1 text-indigo-600 border border-indigo-200 rounded px-1 py-1 hover:bg-indigo-50 mb-1"
        >
          <Sparkles className="w-3 h-3" /> Get AI crew recommendation
        </button>
      )}
      {loadingRec && (
        <div className="flex items-center justify-center gap-1 text-[10px] text-indigo-500 py-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Analyzing…
        </div>
      )}
      {aiRec && !aiRec.error && (
        <div className="text-[10px] bg-indigo-50 border border-indigo-100 rounded px-2 py-1 mb-1 flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-0.5 text-indigo-700"><Users className="w-3 h-3" /> {aiRec.crewCount} crew</span>
          <span className="flex items-center gap-0.5 text-indigo-700"><Truck className="w-3 h-3" /> {aiRec.vehicleCount} {aiRec.vehicleType || 'vehicle'}</span>
          {aiRec.recommendedFee && <span className="text-green-700 font-semibold">${aiRec.recommendedFee} fee</span>}
        </div>
      )}
      <button
        onClick={handleAssign}
        disabled={saving || selectedDrivers.length === 0}
        className="w-full h-7 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        {saving ? 'Saving...' : `Assign ${selectedDrivers.length > 1 ? `Team (${selectedDrivers.length})` : 'Driver'}`}
      </button>
    </div>
  );
}

function RentalTooltip({ rental, deliveries, users, currentUser, isManager, onClose, onAssigned, onStatusChange }) {
  const [showAssign, setShowAssign] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  if (!rental) return null;
  const color = STATUS_COLORS[rental.status] || STATUS_COLORS.quote;

  const STATUS_TRANSITIONS = {
    quote:       [{ value: 'reservation', label: 'Mark Reserved' }, { value: 'contract', label: 'Mark Contract' }],
    reservation: [{ value: 'contract', label: 'Mark Contract' }, { value: 'out', label: 'Mark Out' }],
    contract:    [{ value: 'out', label: 'Mark Out' }, { value: 'reservation', label: 'Back to Reserved' }],
    out:         [{ value: 'returned', label: 'Mark Returned' }],
    returned:    [{ value: 'completed', label: 'Mark Completed' }],
  };

  const transitions = STATUS_TRANSITIONS[rental.status] || [];

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Change status to "${newStatus}"?`)) return;
    setChangingStatus(true);
    try {
      await base44.entities.Rental.update(rental.id, { status: newStatus });
      onStatusChange?.({ ...rental, status: newStatus });
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setChangingStatus(false);
    }
  };
  const delivery = deliveries?.find(d => d.rentalId === rental.id);
  const needsDelivery = rental.deliveryMethod === 'company_delivery';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-80 text-sm max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="font-semibold text-gray-900 leading-tight">{rental.customerName}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="space-y-1 text-xs text-gray-600">
          <div><span className="text-gray-400">Equipment:</span> {rental.equipmentName}</div>
          <div><span className="text-gray-400">Dates:</span> {rental.startDate} → {rental.endDate}</div>
          {rental.customerPhone && <div><span className="text-gray-400">Phone:</span> {rental.customerPhone}</div>}
          {rental.invoiceNumber && <div><span className="text-gray-400">Invoice:</span> {rental.invoiceNumber}</div>}
          {rental.branch && <div><span className="text-gray-400">Branch:</span> {rental.branch}</div>}
          {needsDelivery && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-indigo-500" />
                {delivery ? (
                  <span className="text-indigo-700 font-medium">
                    Assigned: {delivery.driverName}
                    {delivery.teamDrivers?.length > 1 && ` +${delivery.teamDrivers.length - 1} more`}
                    {delivery.assignedAt && (
                      <span className="text-indigo-400 ml-1">· {format(parseISO(delivery.assignedAt), 'MM/dd HH:mm')}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">Delivery not assigned</span>
                )}
              </div>
              {delivery && (delivery.recommendedCrew || delivery.recommendedVehicles) && (
                <div className="flex items-center gap-2 text-[10px] bg-indigo-50 rounded px-2 py-1">
                  {delivery.recommendedCrew && (
                    <span className="flex items-center gap-0.5 text-indigo-600">
                      <Users className="w-3 h-3" /> {delivery.recommendedCrew} crew
                    </span>
                  )}
                  {delivery.recommendedVehicles && (
                    <span className="flex items-center gap-0.5 text-indigo-600">
                      <Truck className="w-3 h-3" /> {delivery.recommendedVehicles} vehicle{delivery.recommendedVehicles !== 1 ? 's' : ''}
                    </span>
                  )}
                  {delivery.recommendedVehicleType && (
                    <span className="text-indigo-400">· {delivery.recommendedVehicleType}</span>
                  )}
                </div>
              )}
            </div>
          )}
          {delivery?.receivedAt && (
            <div className="text-green-700 flex items-center gap-1 text-xs">
              <CheckCircle className="w-3 h-3" />
              Driver confirmed {format(parseISO(delivery.receivedAt), 'MM/dd HH:mm')}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-2 py-0.5 rounded-full text-white font-medium text-xs ${color.bg}`}>
              {color.label}
            </span>
            {isManager && transitions.map(t => (
              <button
                key={t.value}
                onClick={() => handleStatusChange(t.value)}
                disabled={changingStatus}
                className="text-[11px] px-2 py-0.5 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
              >
                {changingStatus ? '...' : t.label}
              </button>
            ))}
          </div>
        </div>

        {isManager && needsDelivery && (
          <div className="mt-2">
            {!showAssign ? (
              <button
                onClick={() => setShowAssign(true)}
                className="w-full text-xs border border-indigo-300 text-indigo-700 rounded px-2 py-1 hover:bg-indigo-50 flex items-center justify-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                {delivery ? 'Reassign Delivery' : 'Assign Delivery'}
              </button>
            ) : (
              <AssignDeliveryPanel
                rental={rental}
                users={users}
                deliveries={deliveries}
                currentUser={currentUser}
                onAssigned={onAssigned}
                onClose={() => setShowAssign(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EquipmentAvailabilityCalendar({
  equipment = [], rentals = [], deliveries = [], users = [],
  currentUser, isManager = false, focusRentalId, focusDate,
  onDateSelect, onDeliveryAssigned
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    if (focusDate) {
      try {
        const d = parseISO(focusDate);
        if (isNaN(d.getTime())) return new Date();
        return d;
      } catch { return new Date(); }
    }
    return new Date();
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedRental, setSelectedRental] = useState(null);
  const [tooltipEqId, setTooltipEqId] = useState(null);

  // Auto-highlight the rental coming from DailyOps
  useEffect(() => {
    if (focusRentalId && rentals.length > 0) {
      const rental = rentals.find(r => r && r.id === focusRentalId);
      if (rental) {
        setSelectedRental(rental);
        setTooltipEqId(rental.equipmentId + (rental.startDate || ''));
        setSearch('');
      }
    }
  }, [focusRentalId, rentals]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd   = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const categories = useMemo(() => {
    const cats = [...new Set(equipment.map(e => e.category).filter(Boolean))].sort();
    return ['All', ...cats];
  }, [equipment]);

  const activeRentals = useMemo(() =>
    rentals.filter(r => !['cancelled', 'completed'].includes(r.status)),
    [rentals]
  );

  const filteredEquipment = useMemo(() => {
    return equipment.filter(eq => {
      const matchesSearch = !search || eq.name.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === 'All' || eq.category === categoryFilter;
      const hasActiveRental = activeRentals.some(r => r.equipmentId === eq.id);
      return matchesSearch && matchesCat && hasActiveRental;
    });
  }, [equipment, search, categoryFilter, activeRentals]);

  const getRentalsForEquipment = (eqId) =>
    activeRentals.filter(r => r.equipmentId === eqId);

  const getBookedInfo = (eqId, date) => {
    const eqRentals = getRentalsForEquipment(eqId);
    return eqRentals.find(r => dateInRange(date, r.startDate, r.endDate)) || null;
  };

  const isRentalStart = (eqId, date) => {
    const eqRentals = getRentalsForEquipment(eqId);
    return eqRentals.some(r => {
      const s = parseISO(r.startDate);
      const d = new Date(date); d.setHours(12);
      return format(s, 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd');
    });
  };

  const handleDayClick = (eqId, date) => {
    const rental = getBookedInfo(eqId, date);
    const tooltipKey = eqId + format(date, 'yyyy-MM-dd');
    if (rental) {
      if (selectedRental?.id === rental.id && tooltipEqId === tooltipKey) {
        setSelectedRental(null);
        setTooltipEqId(null);
      } else {
        setSelectedRental(rental);
        setTooltipEqId(tooltipKey);
      }
    } else {
      setSelectedRental(null);
      setTooltipEqId(null);
      onDateSelect?.(date);
    }
  };

  const totalEquipment = filteredEquipment.length;
  const bookedEquipmentCount = filteredEquipment.filter(eq =>
    getRentalsForEquipment(eq.id).some(r => {
      const s = parseISO(r.startDate); const e = parseISO(r.endDate);
      return s <= monthEnd && e >= monthStart;
    })
  ).length;

  // Has delivery assigned indicator
  const rentalHasDelivery = (rentalId) => deliveries.some(d => d.rentalId === rentalId && d.driverId);

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-4 border-b bg-gray-50 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search equipment..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="text-sm font-semibold text-gray-900 w-32 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition">
            Today
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-4 text-xs text-gray-500">
        <span><strong className="text-gray-800">{totalEquipment}</strong> items shown</span>
        <span><strong className="text-red-600">{bookedEquipmentCount}</strong> with bookings</span>
        <span><strong className="text-green-600">{totalEquipment - bookedEquipmentCount}</strong> available</span>
        <div className="ml-auto flex items-center gap-3">
          {Object.entries(STATUS_COLORS).filter(([k]) => ['out','contract','reservation','quote'].includes(k)).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm inline-block ${v.bg}`} />
              {v.label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3 text-indigo-500" />
            Assigned
          </span>
        </div>
      </div>

      {/* Gantt grid */}
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse text-xs" style={{ minWidth: `${180 + days.length * 28}px` }}>
          <thead className="sticky top-0 z-20 bg-white">
            <tr>
              <th className="sticky left-0 z-30 bg-white border-b border-r border-gray-200 px-3 py-2 text-left text-xs font-semibold text-gray-500 w-44 min-w-[176px]">
                Equipment
              </th>
              {days.map(day => (
                <th
                  key={day.toISOString()}
                  className={`border-b border-gray-100 px-0 py-2 text-center font-medium w-7 min-w-[28px] ${
                    isToday(day) ? 'bg-indigo-50 text-indigo-700 font-bold border-b-2 border-b-indigo-400' : 'text-gray-400'
                  }`}
                >
                  <div>{format(day, 'd')}</div>
                  <div className="text-gray-300 font-normal">{format(day, 'EEE')[0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEquipment.length === 0 ? (
              <tr>
                <td colSpan={days.length + 1} className="text-center py-12 text-gray-400">
                  No equipment matches your filters
                </td>
              </tr>
            ) : filteredEquipment.map((eq, idx) => (
              <tr key={eq.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="sticky left-0 z-10 border-r border-gray-200 px-3 py-1 font-medium text-gray-800 text-xs truncate max-w-[176px]"
                  style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <div className="truncate" title={eq.name}>{eq.name}</div>
                  {eq.category && <div className="text-gray-400 font-normal text-[10px] truncate">{eq.category}</div>}
                </td>
                {days.map(day => {
                  const rental = getBookedInfo(eq.id, day);
                  const isStart = rental && isRentalStart(eq.id, day);
                  const tooltipKey = eq.id + format(day, 'yyyy-MM-dd');
                  const color = rental ? (STATUS_COLORS[rental.status] || STATUS_COLORS.quote) : null;
                  const isTodayCol = isToday(day);
                  const hasDelivery = rental && rentalHasDelivery(rental.id);

                  return (
                    <td
                      key={day.toISOString()}
                      onClick={() => handleDayClick(eq.id, day)}
                      className={`relative border-gray-100 border-r p-0 cursor-pointer transition-opacity hover:opacity-80 ${isTodayCol ? 'bg-indigo-50/40' : ''}`}
                      style={{ height: 32 }}
                    >
                      {rental ? (
                        <div
                          className={`h-full w-full flex items-center ${color.bg} ${isStart ? 'rounded-l-md pl-1' : ''}`}
                          title={`${rental.customerName} · ${rental.startDate} – ${rental.endDate}`}
                        >
                          {isStart && (
                            <span className="text-white font-semibold text-[10px] truncate leading-none px-1 whitespace-nowrap overflow-hidden flex items-center gap-0.5">
                              {rental.customerName?.split(' ')[0]}
                              {hasDelivery && <Truck className="w-2 h-2 flex-shrink-0 opacity-80" />}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="h-full w-full" />
                      )}

                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rental detail modal — rendered outside the table so it's always fully visible */}
      {selectedRental && (
        <RentalTooltip
          rental={selectedRental}
          deliveries={deliveries}
          users={users}
          currentUser={currentUser}
          isManager={isManager}
          onClose={() => { setSelectedRental(null); setTooltipEqId(null); }}
          onAssigned={(delivery) => { onDeliveryAssigned?.(delivery); }}
          onStatusChange={() => { setSelectedRental(null); setTooltipEqId(null); onDeliveryAssigned?.(); }}
        />
      )}
    </div>
  );
}