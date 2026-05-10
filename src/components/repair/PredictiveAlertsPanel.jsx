import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, CheckCircle, Clock, Zap, TrendingDown, X, Loader2 } from 'lucide-react';

const ALERT_ICONS = {
  maintenance_overdue: Clock,
  wear_pattern: TrendingDown,
  failure_risk: AlertTriangle,
  inspection_due: Zap,
  parts_degradation: TrendingDown,
};

const SEVERITY_COLORS = {
  low: 'bg-blue-50 border-blue-200 text-blue-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  high: 'bg-orange-50 border-orange-200 text-orange-700',
  critical: 'bg-red-50 border-red-200 text-red-700',
};

const SEVERITY_BADGE = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function PredictiveAlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const active = await base44.entities.PredictiveAlert.filter({ status: 'active' });
        setAlerts(active.sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }));
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
    const unsub = base44.entities.PredictiveAlert.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        load();
      }
    });

    return unsub;
  }, []);

  const handleAcknowledge = async (alertId) => {
    setAcknowledging(alertId);
    try {
      await base44.entities.PredictiveAlert.update(alertId, { 
        status: 'acknowledged',
        acknowledgedAt: new Date().toISOString(),
      });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4 flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <div className="font-semibold text-green-900">All systems healthy</div>
          <div className="text-sm text-green-700">No predictive alerts at this time</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map(alert => {
        const Icon = ALERT_ICONS[alert.alertType] || AlertTriangle;
        return (
          <div key={alert.id} className={`rounded-lg border p-4 ${SEVERITY_COLORS[alert.severity]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3 flex-1 min-w-0">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{alert.equipmentName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[alert.severity]}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    {alert.confidenceScore && (
                      <span className="text-xs opacity-75">{alert.confidenceScore}% confidence</span>
                    )}
                  </div>
                  <div className="text-sm mt-1 opacity-90">{alert.message}</div>
                  <div className="text-sm font-medium mt-2 opacity-75">
                    💡 {alert.recommendation}
                  </div>
                  {alert.estimatedDaysUntilFailure && (
                    <div className="text-xs mt-1 opacity-75">
                      ⏱️ Est. {alert.estimatedDaysUntilFailure} days until potential failure
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAcknowledge(alert.id)}
                disabled={acknowledging === alert.id}
                className="flex-shrink-0 p-1.5 hover:opacity-75 transition disabled:opacity-50"
                title="Acknowledge alert"
              >
                {acknowledging === alert.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}