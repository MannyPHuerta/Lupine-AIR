import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, TrendingDown, Loader2 } from 'lucide-react';

const severityColors = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-gray-50 border-gray-200 text-gray-700',
};

const severityIcons = {
  high: '🔴',
  medium: '🟡',
  low: '⚪',
};

export default function RepairAnomaliesPanel() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/functions/detectRepairAnomalies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then(r => r.json());
      setAnomalies(res.anomalies || []);
    } catch (err) {
      console.error('Failed to load anomalies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
      </div>
    );
  }

  if (anomalies.length === 0) {
    return <div className="text-xs text-gray-400 py-4">No anomalies detected</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 mb-3">
        <AlertTriangle className="w-3.5 h-3.5" />
        Repair Anomalies
      </div>
      <div className="space-y-2">
        {anomalies.slice(0, 5).map((anom) => (
          <div key={`${anom.equipmentId}-${anom.type}`} className={`rounded-lg border p-2.5 ${severityColors[anom.severity]}`}>
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{severityIcons[anom.severity]}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{anom.equipmentName}</div>
                <div className="text-xs mt-0.5 opacity-90">{anom.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}