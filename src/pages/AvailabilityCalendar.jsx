import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import EquipmentAvailabilityCalendar from '@/components/calendar/EquipmentAvailabilityCalendar';
import { Button } from '@/components/ui/button';

export default function AvailabilityCalendar() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.Rental.list('-created_date', 1000),
    ]).then(([eq, rent]) => {
      setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name)));
      setRentals(rent);
      setLoading(false);
    });
  }, []);

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
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/lupine')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Equipment Availability Calendar</div>
            <div className="text-indigo-300 text-xs">View bookings by month</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <EquipmentAvailabilityCalendar
          equipment={equipment}
          rentals={rentals}
          onDateSelect={(date) => {
            console.log('Selected date:', date);
          }}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-blue-900 mb-2">How to use</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Select equipment from the dropdown</li>
            <li>• Green dates = available for rental</li>
            <li>• Red dates = already booked</li>
            <li>• Navigate months with arrow buttons</li>
            <li>• Use this to avoid double-booking and plan capacity</li>
          </ul>
        </div>

        <div className="flex justify-start gap-2 mt-6">
          <Button onClick={() => navigate('/availability')} variant="outline">
            Back to Rental Form
          </Button>
        </div>
      </div>
    </div>
  );
}