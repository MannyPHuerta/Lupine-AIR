import { useState } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Truck, RotateCcw, Calendar, Phone, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  out:         { bg: 'bg-red-500',    text: 'text-red-700',    border: 'border-red-300',    light: 'bg-red-50',    label: 'Out' },
  contract:    { bg: 'bg-orange-400', text: 'text-orange-700', border: 'border-orange-300', light: 'bg-orange-50', label: 'Contract' },
  reservation: { bg: 'bg-blue-400',  text: 'text-blue-700',   border: 'border-blue-300',   light: 'bg-blue-50',   label: 'Reserved' },
  quote:       { bg: 'bg-gray-400',   text: 'text-gray-700',   border: 'border-gray-300',   light: 'bg-gray-50',   label: 'Quote' },
  returned:    { bg: 'bg-purple-400', text: 'text-purple-700', border: 'border-purple-300', light: 'bg-purple-50', label: 'Returned' },
  completed:   { bg: 'bg-green-500',  text: 'text-green-700',  border: 'border-green-300',  light: 'bg-green-50',  label: 'Completed' },
};

function RentalCard({ rental, delivery, onClick }) {
  const color = STATUS_COLORS[rental.status] || STATUS_COLORS.quote;
  const isStart = rental.startDate === format(new Date(), 'yyyy-MM-dd') || true; // always show full info in day view
  return (
    <div
      onClick={() => onClick?.(rental)}
      className={`rounded-lg border ${color.border} ${color.light} px-3 py-2.5 cursor-pointer hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${color.bg}`}>{color.label}</span>
            <span className="font-semibold text-gray-900 text-sm truncate">{rental.customerName}</span>
          </div>
          <div className="text-xs text-gray-600 mt-1 truncate">{rental.equipmentName}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {rental.startDate} → {rental.endDate}
            {rental.invoiceNumber && <span className="ml-2">#{rental.invoiceNumber}</span>}
          </div>
          {rental.branch && <div className="text-xs text-gray-400">{rental.branch}</div>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {rental.customerPhone && (
            <a href={`tel:${rental.customerPhone}`} onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
              <Phone className="w-3 h-3" />
            </a>
          )}
          {delivery?.driverId && (
            <div className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">
              <Truck className="w-2.5 h-2.5" /> {delivery.driverName?.split(' ')[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarDayView({ date, rentals = [], deliveries = [], onRentalClick }) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const [expanded, setExpanded] = useState({ starting: true, active: true, ending: true, deliveries: true, recoveries: true });

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const starting = rentals.filter(r => r.startDate === dateStr && !['cancelled','completed'].includes(r.status));
  const ending   = rentals.filter(r => r.endDate === dateStr && r.status === 'out');
  const active   = rentals.filter(r =>
    r.startDate < dateStr && r.endDate > dateStr && r.status === 'out'
  );
  const todayDeliveries = deliveries.filter(d => d.scheduledDate === dateStr && !d.isCrossTransfer && !['completed','cancelled'].includes(d.status));
  const todayRecoveries = deliveries.filter(d => d.scheduledDate === dateStr && !['completed','cancelled'].includes(d.status) && d.rentalId);

  const sections = [
    { key: 'starting', label: '🚀 Starting Today', items: starting, emptyMsg: 'No rentals starting', renderItem: (r) => <RentalCard key={r.id} rental={r} delivery={deliveries.find(d=>d.rentalId===r.id)} onClick={onRentalClick} /> },
    { key: 'ending',   label: '🔁 Due Back Today', items: ending,   emptyMsg: 'Nothing due back', renderItem: (r) => <RentalCard key={r.id} rental={r} delivery={deliveries.find(d=>d.rentalId===r.id)} onClick={onRentalClick} /> },
    { key: 'active',   label: '📦 Out (Mid-Rental)', items: active, emptyMsg: 'No mid-rental items', renderItem: (r) => <RentalCard key={r.id} rental={r} delivery={deliveries.find(d=>d.rentalId===r.id)} onClick={onRentalClick} /> },
    { key: 'deliveries', label: '🚚 Deliveries Scheduled', items: todayDeliveries, emptyMsg: 'No deliveries today',
      renderItem: (d) => (
        <div key={d.id} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-900 text-sm">{d.customerName}</div>
              <div className="text-xs text-gray-500">{d.customerAddress}, {d.customerCity}</div>
              {d.scheduledTime && <div className="text-xs text-indigo-600 font-medium mt-0.5">⏰ {d.scheduledTime}</div>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {d.driverId
                ? <span className="text-[11px] text-indigo-700 font-medium bg-white rounded px-1.5 py-0.5 border border-indigo-200">🚚 {d.driverName}</span>
                : <span className="text-[11px] text-amber-700 font-medium bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">⚠️ Unassigned</span>
              }
            </div>
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <div className={`text-sm font-bold px-1 ${isToday(date) ? 'text-indigo-700' : 'text-gray-700'}`}>
        {format(date, 'EEEE, MMMM d, yyyy')}
        {isToday(date) && <span className="ml-2 text-xs font-normal text-indigo-500">Today</span>}
      </div>
      {sections.map(({ key, label, items, emptyMsg, renderItem }) => (
        <div key={key} className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <button
            onClick={() => toggle(key)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b hover:bg-gray-100 transition"
          >
            <span className="font-semibold text-sm text-gray-700">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">{items.length}</span>
              {expanded[key] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </div>
          </button>
          {expanded[key] && (
            <div className="p-3 space-y-2">
              {items.length === 0
                ? <div className="text-xs text-gray-400 text-center py-4">{emptyMsg}</div>
                : items.map(renderItem)
              }
            </div>
          )}
        </div>
      ))}
    </div>
  );
}