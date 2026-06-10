import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
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
    if (!supabase) return;

    const channel = supabase
      .channel('equipment-gps-alerts')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'equipment_gps_links',
      }, (payload) => {
        const link = payload.new;
        const newAlerts = [];

        if (link.geofence_breached && link.geofence_breached_at) {
          const key = `geo-${link.id}-${link.geofence_breached_at}`;
          if (!seenIds.current.has(key)) {
            seenIds.current.add(key);
            newAlerts.push({
              id: key,
              type: 'geofence',
              icon: AlertTriangle,
              color: 'bg-red-600',
              title: '⚠️ Geo-fence Breach',
              message: `${link.equipment_name || 'Equipment'} has left its assigned worksite.`,
              location: link.last_known_address,
              ts: Date.now(),
            });
          }
        }

        if (link.speed_anomaly_detected && link.speed_anomaly_at) {
          const key = `speed-${link.id}-${link.speed_anomaly_at}`;
          if (!seenIds.current.has(key)) {
            seenIds.current.add(key);
            newAlerts.push({
              id: key,
              type: 'speed',
              icon: Zap,
              color: 'bg-amber-600',
              title: '⚡ High-Speed Movement',
              message: `${link.equipment_name || 'Equipment'} detected at ${link.last_known_speed || '?'} mph — possible trailer transport.`,
              location: link.last_known_address,
              ts: Date.now(),
            });
          }
        }

        if (link.night_movement_detected && link.night_movement_at) {
          const key = `night-${link.id}-${link.night_movement_at}`;
          if (!seenIds.current.has(key)) {
            seenIds.current.add(key);
            newAlerts.push({
              id: key,
              type: 'night',
              icon: Moon,
              color: 'bg-indigo-700',
              title: '🌙 Night Movement Detected',
              message: `${link.equipment_name || 'Equipment'} is moving outside normal operating hours.`,
              location: link.last_known_address,
              ts: Date.now(),
            });
          }
        }

        if (newAlerts.length > 0) {
          setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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