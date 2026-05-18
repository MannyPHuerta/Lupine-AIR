import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Zap, Moon, X, Bell } from 'lucide-react';

/**
 * Subscribes to EquipmentGPSLink real-time updates and surfaces
 * in-app toast-style alerts for new geofence breaches, speed anomalies,
 * and night movement events.
 */
export default function ThreatNotificationBanner() {
  const [alerts, setAlerts] = useState([]);
  const seenIds = useRef(new Set());

  useEffect(() => {
    const unsubscribe = base44.entities.EquipmentGPSLink.subscribe((event) => {
      if (event.type !== 'update' || !event.data) return;
      const link = event.data;
      const newAlerts = [];

      if (link.geofenceBreached && link.geofenceBreachedAt) {
        const key = `geo-${link.id}-${link.geofenceBreachedAt}`;
        if (!seenIds.current.has(key)) {
          seenIds.current.add(key);
          newAlerts.push({
            id: key,
            type: 'geofence',
            icon: AlertTriangle,
            color: 'bg-red-600',
            title: '⚠️ Geo-fence Breach',
            message: `${link.equipmentName || 'Equipment'} has left its assigned worksite.`,
            location: link.lastKnownAddress,
            ts: Date.now(),
          });
        }
      }

      if (link.speedAnomalyDetected && link.speedAnomalyAt) {
        const key = `speed-${link.id}-${link.speedAnomalyAt}`;
        if (!seenIds.current.has(key)) {
          seenIds.current.add(key);
          newAlerts.push({
            id: key,
            type: 'speed',
            icon: Zap,
            color: 'bg-amber-600',
            title: '⚡ High-Speed Movement',
            message: `${link.equipmentName || 'Equipment'} detected at ${link.lastKnownSpeed || '?'} mph — possible trailer transport.`,
            location: link.lastKnownAddress,
            ts: Date.now(),
          });
        }
      }

      if (link.nightMovementDetected && link.nightMovementAt) {
        const key = `night-${link.id}-${link.nightMovementAt}`;
        if (!seenIds.current.has(key)) {
          seenIds.current.add(key);
          newAlerts.push({
            id: key,
            type: 'night',
            icon: Moon,
            color: 'bg-indigo-700',
            title: '🌙 Night Movement Detected',
            message: `${link.equipmentName || 'Equipment'} is moving outside normal operating hours.`,
            location: link.lastKnownAddress,
            ts: Date.now(),
          });
        }
      }

      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
      }
    });

    return () => unsubscribe();
  }, []);

  const dismiss = (id) => setAlerts(prev => prev.filter(a => a.id !== id));
  const dismissAll = () => setAlerts([]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {alerts.length > 1 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={dismissAll}
            className="text-xs text-gray-500 hover:text-gray-800 bg-white border rounded px-2 py-0.5 shadow"
          >
            Dismiss all ({alerts.length})
          </button>
        </div>
      )}
      {alerts.map(alert => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`${alert.color} text-white rounded-xl shadow-xl px-4 py-3 pointer-events-auto animate-in slide-in-from-bottom-2`}
          >
            <div className="flex items-start gap-2">
              <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{alert.title}</div>
                <div className="text-xs opacity-90 mt-0.5">{alert.message}</div>
                {alert.location && (
                  <div className="text-xs opacity-75 mt-0.5 truncate">📍 {alert.location}</div>
                )}
              </div>
              <button onClick={() => dismiss(alert.id)} className="opacity-70 hover:opacity-100 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}