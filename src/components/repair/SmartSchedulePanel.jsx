import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

export default function SmartSchedulePanel() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('smartScheduleWorkOrders', {});
      setSchedule(res.data);
    } catch (err) {
      console.error('Failed to load smart schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!schedule || schedule.smartSchedule.length === 0) {
    return <div className="text-xs text-gray-400 py-4">No smart scheduling data available</div>;
  }

  const top5 = schedule.smartSchedule.slice(0, 5);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-orange-700 mb-3">
        <TrendingUp className="w-3.5 h-3.5" />
        Smart Job Priority
      </div>
      <div className="space-y-2">
        {top5.map((wo, idx) => (
          <div key={wo.id} className="bg-orange-50 border border-orange-200 rounded-lg p-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-orange-900">
                  #{idx + 1} {wo.equipmentName}
                </div>
                <div className="text-xs text-orange-700 mt-0.5">
                  Rented {wo.rentalFrequency}x • ${wo.dailyRate}/day • Priority: {Math.round(wo.priorityScore)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}