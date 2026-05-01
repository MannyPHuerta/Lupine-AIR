import { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X, Info } from 'lucide-react';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, parseISO, isBefore, isAfter, isEqual
} from 'date-fns';

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

function RentalTooltip({ rental, onClose }) {
  if (!rental) return null;
  const color = STATUS_COLORS[rental.status] || STATUS_COLORS.quote;
  return (
    <div className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-64 text-sm" style={{ top: '100%', left: 0 }}>
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
        <div className="mt-2">
          <span className={`inline-block px-2 py-0.5 rounded-full text-white font-medium ${color.bg}`}>
            {color.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function EquipmentAvailabilityCalendar({ equipment = [], rentals = [], onDateSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedRental, setSelectedRental] = useState(null);
  const [tooltipEqId, setTooltipEqId] = useState(null);
  const tooltipRef = useRef(null);

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

  // For each equipment, get rentals in this month
  const getRentalsForEquipment = (eqId) =>
    activeRentals.filter(r => r.equipmentId === eqId);

  // Which days are booked for an equipment item
  const getBookedInfo = (eqId, date) => {
    const eqRentals = getRentalsForEquipment(eqId);
    const hit = eqRentals.find(r => dateInRange(date, r.startDate, r.endDate));
    return hit || null;
  };

  // Is this day the start of a rental block?
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
    if (rental) {
      setSelectedRental(rental);
      setTooltipEqId(eqId + format(date, 'yyyy-MM-dd'));
    } else {
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

        {/* Month navigation */}
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
        <span><strong className="text-red-600">{bookedEquipmentCount}</strong> with bookings this month</span>
        <span><strong className="text-green-600">{totalEquipment - bookedEquipmentCount}</strong> fully available</span>
        <div className="ml-auto flex items-center gap-3">
          {Object.entries(STATUS_COLORS).filter(([k]) => ['out','contract','reservation','quote'].includes(k)).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-sm inline-block ${v.bg}`} />
              {v.label}
            </span>
          ))}
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
                {/* Equipment name cell */}
                <td className="sticky left-0 z-10 border-r border-gray-200 px-3 py-1 font-medium text-gray-800 text-xs truncate max-w-[176px]"
                  style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <div className="truncate" title={eq.name}>{eq.name}</div>
                  {eq.category && <div className="text-gray-400 font-normal text-[10px] truncate">{eq.category}</div>}
                </td>
                {/* Day cells */}
                {days.map(day => {
                  const rental = getBookedInfo(eq.id, day);
                  const isStart = rental && isRentalStart(eq.id, day);
                  const tooltipKey = eq.id + format(day, 'yyyy-MM-dd');
                  const color = rental ? (STATUS_COLORS[rental.status] || STATUS_COLORS.quote) : null;
                  const isTodayCol = isToday(day);

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
                            <span className="text-white font-semibold text-[10px] truncate leading-none px-1 whitespace-nowrap overflow-hidden">
                              {rental.customerName?.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="h-full w-full" />
                      )}
                      {/* Tooltip */}
                      {selectedRental && tooltipEqId === tooltipKey && (
                        <div ref={tooltipRef} className="relative">
                          <RentalTooltip rental={selectedRental} onClose={() => { setSelectedRental(null); setTooltipEqId(null); }} />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Click-away to close tooltip */}
      {selectedRental && (
        <div className="fixed inset-0 z-40" onClick={() => { setSelectedRental(null); setTooltipEqId(null); }} />
      )}
    </div>
  );
}