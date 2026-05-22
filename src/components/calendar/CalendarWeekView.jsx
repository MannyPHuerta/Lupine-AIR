import { format, startOfWeek, addDays, isToday, parseISO } from 'date-fns';
import { Truck, Phone } from 'lucide-react';

const STATUS_COLORS = {
  out:         { bg: 'bg-red-500',    label: 'Out' },
  contract:    { bg: 'bg-orange-400', label: 'Contract' },
  reservation: { bg: 'bg-blue-400',  label: 'Reserved' },
  quote:       { bg: 'bg-gray-300',   label: 'Quote' },
  returned:    { bg: 'bg-purple-400', label: 'Returned' },
  completed:   { bg: 'bg-green-400',  label: 'Completed' },
};

function dateInRange(dateStr, startStr, endStr) {
  if (!startStr || !endStr) return false;
  return dateStr >= startStr && dateStr <= endStr;
}

export default function CalendarWeekView({ date, rentals = [], deliveries = [], onRentalClick }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const activeRentals = rentals.filter(r => !['cancelled','completed'].includes(r.status));

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const todayClass = isToday(day) ? 'bg-indigo-50 border-b-2 border-indigo-500' : '';
          const dayRentals = activeRentals.filter(r => dateInRange(dateStr, r.startDate, r.endDate));
          const dayDeliveries = deliveries.filter(d => d.scheduledDate === dateStr && !['completed','cancelled'].includes(d.status));
          return (
            <div key={dateStr} className={`p-2 border-r last:border-r-0 min-h-[180px] ${todayClass}`}>
              <div className="text-center mb-2">
                <div className="text-xs text-gray-400 font-medium">{format(day, 'EEE')}</div>
                <div className={`text-lg font-bold ${isToday(day) ? 'text-indigo-700' : 'text-gray-800'}`}>
                  {format(day, 'd')}
                </div>
                <div className="flex justify-center gap-1 mt-0.5">
                  {dayRentals.length > 0 && (
                    <span className="text-[9px] bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 font-semibold">{dayRentals.length} rental{dayRentals.length !== 1 ? 's' : ''}</span>
                  )}
                  {dayDeliveries.length > 0 && (
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5 font-semibold">{dayDeliveries.length} 🚚</span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                {/* Show rentals starting this day */}
                {activeRentals.filter(r => r.startDate === dateStr).map(r => {
                  const color = STATUS_COLORS[r.status] || STATUS_COLORS.quote;
                  const del = deliveries.find(d => d.rentalId === r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => onRentalClick?.(r)}
                      className={`${color.bg} rounded px-1.5 py-0.5 cursor-pointer hover:opacity-80 transition`}
                      title={`${r.customerName} · ${r.equipmentName}`}
                    >
                      <div className="text-white text-[10px] font-semibold truncate flex items-center gap-0.5">
                        {r.customerName?.split(' ')[0]}
                        {del?.driverId && <Truck className="w-2 h-2 flex-shrink-0" />}
                      </div>
                      <div className="text-white/80 text-[9px] truncate">{r.equipmentName}</div>
                    </div>
                  );
                })}
                {/* Deliveries */}
                {dayDeliveries.map(d => (
                  <div key={d.id} className="bg-indigo-100 border border-indigo-200 rounded px-1.5 py-0.5">
                    <div className="text-indigo-800 text-[10px] font-semibold truncate flex items-center gap-0.5">
                      <Truck className="w-2.5 h-2.5 flex-shrink-0" /> {d.customerName?.split(' ')[0]}
                    </div>
                    {d.scheduledTime && <div className="text-indigo-500 text-[9px]">{d.scheduledTime}</div>}
                    {!d.driverId && <div className="text-amber-600 text-[9px]">⚠️ Unassigned</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}