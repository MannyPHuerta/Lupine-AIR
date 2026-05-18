/**
 * BoundaryVigilancePanel — Out-of-bounds & anomaly detection
 * Flags equipment that may be outside expected delivery areas,
 * detects address inconsistencies, time-window anomalies, and geo-risk zones
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Navigation, AlertTriangle, Clock, MapPin, CheckCircle2, Eye } from 'lucide-react';

// RGV service area — rough bounding box
const RGV_BOUNDARY = {
  label: 'Rio Grande Valley Service Area',
  cities: ['McAllen', 'Edinburg', 'Mission', 'Pharr', 'Weslaco', 'Harlingen', 'San Benito', 'Brownsville', 'Mercedes', 'Donna', 'Alamo', 'Elsa', 'Edcouch', 'La Joya', 'Sullivan City', 'Roma', 'Rio Grande City', 'Laredo', 'Corpus Christi', 'Victoria', 'Houston', 'San Antonio'],
  maxMilesFromBase: 250,
};

function AlertCard({ alert }) {
  const severityConfig = {
    critical: { bg: 'bg-red-50 border-red-400', badge: 'bg-red-600 text-white', icon: '🚨' },
    high:     { bg: 'bg-orange-50 border-orange-300', badge: 'bg-orange-500 text-white', icon: '⚠️' },
    medium:   { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-400 text-white', icon: '⚡' },
    low:      { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-400 text-white', icon: 'ℹ️' },
  };
  const cfg = severityConfig[alert.severity] || severityConfig.low;

  return (
    <div className={`rounded-lg border p-4 ${cfg.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-lg flex-shrink-0">{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm">{alert.title}</div>
            <div className="text-xs text-gray-600 mt-0.5">{alert.description}</div>
            {alert.customer && <div className="text-xs text-gray-500 mt-1">Customer: <strong>{alert.customer}</strong></div>}
            {alert.equipment && <div className="text-xs text-gray-500">Equipment: <strong>{alert.equipment}</strong></div>}
            {alert.address && (
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {alert.address}
              </div>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
          {alert.severity?.toUpperCase()}
        </span>
      </div>
      {alert.recommendedAction && (
        <div className="mt-2 pt-2 border-t border-current/10 text-xs text-gray-600">
          <span className="font-semibold">Action: </span>{alert.recommendedAction}
        </div>
      )}
    </div>
  );
}

export default function BoundaryVigilancePanel({ rentals, recoveries }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runVigilance = async () => {
    setLoading(true);
    setResult(null);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Detect anomalies locally first, pass to AI for deeper analysis
      const anomalies = [];

      rentals.forEach(r => {
        if (!r.status || r.status === 'cancelled' || r.status === 'completed') return;

        // Address inconsistency: billing city ≠ worksite city (cross-state)
        const billingState = (r.customerState || '').trim().toUpperCase();
        const worksiteState = (r.worksiteState || '').trim().toUpperCase();
        if (billingState && worksiteState && billingState !== worksiteState && worksiteState !== 'TX') {
          anomalies.push({
            type: 'out_of_state',
            customer: r.customerName,
            equipment: r.equipmentName,
            invoice: r.invoiceNumber,
            billing: `${r.customerCity}, ${billingState}`,
            worksite: `${r.worksiteCity}, ${worksiteState}`,
            endDate: r.endDate,
            daysOut: r.status === 'out' ? Math.floor((new Date(today) - new Date(r.startDate || today)) / 86400000) : 0,
          });
        }

        // Extended duration anomaly (out > 60 days)
        if (r.status === 'out' && r.startDate) {
          const daysOut = Math.floor((new Date(today) - new Date(r.startDate)) / 86400000);
          if (daysOut > 60) {
            anomalies.push({
              type: 'extended_duration',
              customer: r.customerName,
              equipment: r.equipmentName,
              invoice: r.invoiceNumber,
              daysOut,
              branch: r.branch,
            });
          }
        }

        // High value out with no phone
        if (r.status === 'out' && !r.customerPhone) {
          anomalies.push({
            type: 'no_contact',
            customer: r.customerName,
            equipment: r.equipmentName,
            invoice: r.invoiceNumber,
            branch: r.branch,
          });
        }
      });

      // Recovery addresses that look suspicious (vacant lots, highways, storage only)
      const suspiciousDeliveries = rentals.filter(r =>
        r.worksiteAddress && (
          /hwy|highway|fm \d|ranch rd|cr \d|county rd/i.test(r.worksiteAddress) ||
          /storage|lot \d|yard|warehouse/i.test(r.worksiteAddress)
        ) && ['out', 'reservation', 'contract'].includes(r.status)
      ).slice(0, 15);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a geo-vigilance AI for an equipment rental company in South Texas (RGV area). Analyze these anomalies and suspicious delivery patterns for theft risk and out-of-bounds violations.

SERVICE AREA: ${RGV_BOUNDARY.label} — Max reasonable range: ${RGV_BOUNDARY.maxMilesFromBase} miles.
Known service cities: ${RGV_BOUNDARY.cities.join(', ')}

DETECTED ANOMALIES (${anomalies.length}):
${anomalies.map(a => `- [${a.type}] ${a.customer}: ${a.equipment || ''} ${a.type === 'out_of_state' ? `billing=${a.billing} worksite=${a.worksite}` : ''} ${a.type === 'extended_duration' ? `${a.daysOut} days out` : ''} ${a.type === 'no_contact' ? 'no phone on file' : ''}`).join('\n') || 'None detected locally'}

SUSPICIOUS DELIVERY ADDRESSES (highway/storage/lot):
${suspiciousDeliveries.map(r => `- ${r.customerName}: "${r.worksiteAddress}, ${r.worksiteCity}" (${r.equipmentName})`).join('\n') || 'None'}

ACTIVE NON-RETURNED EQUIPMENT: ${rentals.filter(r => r.status === 'out').length} units currently out

For each finding, generate a specific vigilance alert with actionable recommendation. Consider: chop shop fronts often use storage yards and rural addresses; out-of-state deliveries may indicate trafficking; extended duration with no contact = high theft risk.`,
        response_json_schema: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  customer: { type: 'string' },
                  equipment: { type: 'string' },
                  address: { type: 'string' },
                  recommendedAction: { type: 'string' },
                  alertType: { type: 'string' },
                }
              }
            },
            overallRiskLevel: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
            unitsAtRisk: { type: 'number' },
            immediateActions: { type: 'array', items: { type: 'string' } },
            systemRecommendations: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const criticalAlerts = result?.alerts?.filter(a => a.severity === 'critical') || [];
  const highAlerts = result?.alerts?.filter(a => a.severity === 'high') || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg">
              <Navigation className="w-5 h-5 text-cyan-400" />
              Boundary & Vigilance Monitor
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Detects out-of-area deliveries, suspicious address patterns, extended non-returns, and geo-risk anomalies.
            </p>
          </div>
          <button
            onClick={runVigilance}
            disabled={loading}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2.5 rounded-lg transition text-sm flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {loading ? 'Scanning…' : 'Run Vigilance Scan'}
          </button>
        </div>

        {result && !result.error && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className={`text-2xl font-black ${result.overallRiskLevel === 'critical' ? 'text-red-400' : result.overallRiskLevel === 'high' ? 'text-orange-400' : 'text-green-400'}`}>
                {result.overallRiskLevel?.toUpperCase() || '—'}
              </div>
              <div className="text-xs text-slate-400">Overall Risk</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-red-400">{criticalAlerts.length + highAlerts.length}</div>
              <div className="text-xs text-slate-400">Priority Alerts</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-amber-400">{result.unitsAtRisk || 0}</div>
              <div className="text-xs text-slate-400">Units at Risk</div>
            </div>
          </div>
        )}
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">Error: {result.error}</div>
      )}

      {result && !result.error && (
        <>
          {result.immediateActions?.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="font-bold text-red-900 mb-2">🚨 Immediate Actions Required</div>
              <ul className="space-y-1">
                {result.immediateActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                    <span className="font-bold flex-shrink-0">{i + 1}.</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.alerts?.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {result.alerts.length} Vigilance Alert{result.alerts.length !== 1 ? 's' : ''}
              </div>
              {result.alerts
                .sort((a, b) => ['critical','high','medium','low'].indexOf(a.severity) - ['critical','high','medium','low'].indexOf(b.severity))
                .map((alert, i) => <AlertCard key={i} alert={alert} />)}
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800 font-medium">No boundary violations detected. All active rentals appear within normal parameters.</div>
            </div>
          )}

          {result.systemRecommendations?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-semibold text-blue-900 mb-2">🛡️ System Hardening Recommendations</div>
              <ul className="space-y-1">
                {result.systemRecommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                    <span className="text-blue-400 flex-shrink-0">→</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          <Navigation className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Click "Run Vigilance Scan" to check for out-of-boundary and high-risk delivery patterns
        </div>
      )}
    </div>
  );
}