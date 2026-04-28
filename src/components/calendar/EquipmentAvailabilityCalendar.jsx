import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';

/**
 * Equipment Availability Calendar - Shows which equipment is available/booked for a given month.
 * Props:
 *   equipment: array of Equipment records
 *   rentals: array of Rental records (active/pending)
 *   onDateSelect: callback when clicking a date
 */
export default function EquipmentAvailabilityCalendar({ equipment = [], rentals = [], onDateSelect }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(equipment[0]?.id || null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get active rentals for selected equipment
  const activeRentals = useMemo(() => {
    if (!selectedEquipmentId) return [];
    return rentals.filter(r => 
      r.equipmentId === selectedEquipmentId && 
      !['cancelled', 'completed'].includes(r.status)
    );
  }, [selectedEquipmentId, rentals]);

  // Check if a date is booked
  const isDateBooked = (date) => {
    return activeRentals.some(r => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return date >= start && date <= end;
    });
  };

  const handlePrevMonth = () => setCurrentDate(addMonths(currentDate, -1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const selectedEquipmentName = equipment.find(e => e.id === selectedEquipmentId)?.name || 'Select Equipment';
  const bookedDays = daysInMonth.filter(day => isDateBooked(day)).length;
  const availableDays = daysInMonth.length - bookedDays;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Equipment Availability Calendar</h3>

      {/* Equipment selector */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-600 mb-2">Select Equipment</label>
        <select
          value={selectedEquipmentId}
          onChange={e => setSelectedEquipmentId(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {equipment.map(eq => (
            <option key={eq.id} value={eq.id}>
              {eq.name} ({eq.category})
            </option>
          ))}
        </select>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {availableDays} available · {bookedDays} booked
          </div>
        </div>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-xs font-bold text-center text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map(day => {
          const booked = isDateBooked(day);
          const isCurrentDay = isToday(day);
          const isCurrent = isSameMonth(day, currentDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              className={`
                aspect-square rounded-lg text-xs font-medium transition
                ${!isCurrent ? 'text-gray-300 bg-gray-50' : ''}
                ${isCurrent && booked ? 'bg-red-100 text-red-900 border border-red-300' : ''}
                ${isCurrent && !booked ? 'bg-green-100 text-green-900 border border-green-300 hover:bg-green-200' : ''}
                ${isCurrentDay && isCurrent ? 'ring-2 ring-indigo-600' : ''}
              `}
              disabled={!isCurrent}
              title={booked ? 'Booked' : 'Available'}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
          <span className="text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
          <span className="text-gray-600">Booked</span>
        </div>
      </div>
    </div>
  );
}