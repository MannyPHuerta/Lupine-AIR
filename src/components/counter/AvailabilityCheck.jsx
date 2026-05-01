import { useState, useMemo } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function AvailabilityCheck({ cart, startDate, endDate, allEquipment }) {
  const availability = useMemo(() => {
    if (!startDate || !endDate || cart.length === 0) return null;

    const issues = [];
    cart.forEach(item => {
      const eq = allEquipment.find(e => e.id === item.id);
      if (!eq) return;

      // Check if available
      if (eq.unitStatus !== 'available') {
        issues.push({
          type: 'unavailable',
          item: item.name,
          status: eq.unitStatus,
          eta: eq.statusNote,
        });
      }
    });

    return { issues, isAvailable: issues.length === 0 };
  }, [cart, startDate, endDate, allEquipment]);

  if (!availability || availability.isAvailable) {
    return availability?.isAvailable ? (
      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
        All items available for selected dates
      </div>
    ) : null;
  }

  return (
    <div className="space-y-1">
      {availability.issues.map((issue, idx) => (
        <div key={idx} className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">
          <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>{issue.item}</strong> is {issue.status}
            {issue.eta && <div className="text-amber-700">{issue.eta}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}