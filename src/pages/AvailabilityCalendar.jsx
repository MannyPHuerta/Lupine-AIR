import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import EquipmentAvailabilityCalendar from '@/components/calendar/EquipmentAvailabilityCalendar';

export default function AvailabilityCalendar() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [eq, rent] = await Promise.all([
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.Rental.list('-startDate', 2000),
    ]);
    setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name)));
    setRentals(rent);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-full mx-auto">
          <button onClick={() => navigate('/availability')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Availability Calendar</div>
            <div className="text-indigo-300 text-xs">
              {equipment.length} items · {rentals.filter(r => !['cancelled','completed'].includes(r.status)).length} active rentals
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-indigo-800 text-indigo-200 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        <EquipmentAvailabilityCalendar
          equipment={equipment}
          rentals={rentals}
          onDateSelect={(date) => {
            // Navigate to new rental with that date pre-selected — future enhancement
          }}
        />

        {/* Legend / Help */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          Click any booking bar to see customer details · Click an empty day to create a rental
        </div>
      </div>
    </div>
  );
}