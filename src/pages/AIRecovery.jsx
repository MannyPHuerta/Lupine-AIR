import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Loader2, RotateCcw, AlertTriangle,
  CheckCircle2, Clock, Truck, MapPin, Camera, Zap, TrendingUp,
  Download, Phone, Calendar, DollarSign, Package, ShieldAlert, Navigation, Radar
} from 'lucide-react';
import TheftIntelPanel from '@/components/recovery/TheftIntelPanel';
import BoundaryVigilancePanel from '@/components/recovery/BoundaryVigilancePanel';
import ThreatWatchPanel from '@/components/recovery/ThreatWatchPanel';
import ThreatNotificationBanner from '@/components/recovery/ThreatNotificationBanner';
import PremiumGate from '@/components/premium/PremiumGate';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

const RECOVERY_STATUS_META = {
  scheduled:         { label: 'Scheduled',          color: 'bg-gray-100 text-gray-700',   icon: Calendar },
  departed:          { label: 'Driver Departed',     color: 'bg-blue-100 text-blue-700',   icon: Truck },
  arrived:           { label: 'On Site',             color: 'bg-indigo-100 text-indigo-700', icon: MapPin },
  photos_captured:   { label: 'Photos Captured',     color: 'bg-purple-100 text-purple-700', icon: Camera },
  loaded:            { label: 'Loaded',              color: 'bg-amber-100 text-amber-700', icon: Package },
  returned_to_branch:{ label: 'Back at Branch',      color: 'bg-cyan-100 text-cyan-700',   icon: RotateCcw },
  completed:         { label: 'Completed',           color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled:         { label: 'Cancelled',           color: 'bg-red-100 text-red-700',     icon: AlertTriangle },
};

const OPEN_STATUSES = ['scheduled', 'departed', 'arrived', 'photos_captured', 'loaded', 'returned_to_branch'];

function RecoveryCard({ recovery, rental, equipment, onAIInsight, aiResult }) {
  const [expanded, setExpanded] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const meta = RECOVERY_STATUS_META[recovery.status] || RECOVERY_STATUS_META.scheduled;
  const StatusIcon = meta.icon;

  const damages = recovery.detectedDamages || [];
  const totalDamageCost = damages.reduce((s, d) => s + (d.estimatedRepairCost || 0), 0);
  const hasDamage = damages.length > 0;

  const eq = equipment.find(e => e.id === recovery.items?.[0]?.equipmentId);

  const handleAI = async () => {
    if (aiResult) { setExpanded(!expanded); return; }
    setLoadingAI(true);
    try {
      await onAIInsight(recovery, rental, eq);
    } finally {
      setLoadingAI(false);
      setExpanded(true);
    }
  };

  const daysOverdue = rental ? (() => {
    if (!rental.endDate || rental.status !== 'out') return 0;
    const today = new Date().toISOString().split('T')[0];
    if (rental.endDate >= today) return 0;
    return Math.floor((new Date(today) - new Date(rental.endDate)) / 86400000);
  })() : 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasDamage ? 'border-l-4 border-l-red-500' : daysOverdue > 0 ? 'border-l-4 border-l-amber-500' : ''}`}>
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${meta.color} flex-shrink-0`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">{recovery.customerName}</span>
              {daysOverdue > 0 && (
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                  ⚠️ {daysOverdue}d overdue
                </span>
              )}
              {hasDamage && (
                <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                  🔴 Damage: ${totalDamageCost.toFixed(0)}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-2">
              <span>{recovery.items?.map(i => i.equipmentName).join(', ') || 'Items pending'}</span>
              <span>·</span>
              <span>{recovery.branch}</span>
              {recovery.scheduledDate && <><span>·</span><span>📅 {recovery.scheduledDate}</span></>}
              {rental?.invoiceNumber && <><span>·</span><span className="font-mono text-indigo-500">#{rental.invoiceNumber}</span></>}
            </div>
            {recovery.driverName && (
              <div className="text-xs text-gray-400 mt-0.5">🚚 Driver: {recovery.driverName}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
              {meta.label}
            </span>
            <button
              onClick={handleAI}
              disabled={loadingAI}
              className="flex items-center gap-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-2.5 py-1 rounded-lg transition"
            >
              {loadingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              AI Insight
            </button>
          </div>
        </div>

        {/* Damage summary */}
        {hasDamage && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            <div className="text-xs font-semibold text-red-800 mb-1">🔴 Damage Detected</div>
            {damages.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-red-700">
                <span>{d.equipmentName} · <span className="capitalize">{d.damageType}</span> ({d.severity})</span>
                {d.estimatedRepairCost && <span className="font-semibold">${d.estimatedRepairCost.toFixed(0)}</span>}
              </div>
            ))}
            <div className="flex justify-between font-bold text-red-900 border-t border-red-200 pt-1 mt-1 text-xs">
              <span>Total Damage Estimate</span><span>${totalDamageCost.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* AI insight result */}
        {aiResult && expanded && !aiResult.error && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-blue-50 p-2 rounded">
                <div className="font-semibold text-blue-900">Recovery Risk</div>
                <div className={`text-lg font-bold mt-0.5 ${aiResult.riskLevel === 'high' ? 'text-red-600' : aiResult.riskLevel === 'medium' ? 'text-amber-600' : 'text-green-600'}`}>
                  {aiResult.riskLevel?.toUpperCase() || '—'}
                </div>
              </div>
              <div className="bg-green-50 p-2 rounded">
                <div className="font-semibold text-green-900">Est. Recovery Value</div>
                <div className="text-lg font-bold text-green-700 mt-0.5">${aiResult.estimatedValue || 0}</div>
              </div>
            </div>
            {aiResult.recommendation && (
              <div className="bg-amber-50 p-2 rounded text-xs">
                <div className="font-semibold text-amber-900">Recommended Action</div>
                <p className="text-amber-800 mt-0.5">{aiResult.recommendation}</p>
              </div>
            )}
            {aiResult.notes && (
              <div className="bg-purple-50 p-2 rounded text-xs">
                <div className="font-semibold text-purple-900">AI Notes</div>
                <p className="text-purple-800 mt-0.5">{aiResult.notes}</p>
              </div>
            )}
          </div>
        )}
        {aiResult?.error && expanded && (
          <div className="mt-2 text-xs text-red-500">AI error: {aiResult.error}</div>
        )}
      </div>
    </div>
  );
}

function OverdueRentalRow({ rental }) {
  const today = new Date().toISOString().split('T')[0];
  const daysOverdue = Math.floor((new Date(today) - new Date(rental.endDate)) / 86400000);
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-red-50 transition">
      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-900 truncate">{rental.customerName}</div>
        <div className="text-xs text-gray-500 truncate">{rental.equipmentName} · {rental.branch}</div>
        {rental.invoiceNumber && <div className="text-xs font-mono text-indigo-500">#{rental.invoiceNumber}</div>}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">{daysOverdue}d overdue</span>
        <span className="text-xs text-gray-400">Due {rental.endDate}</span>
        {rental.customerPhone && (
          <a href={`tel:${rental.customerPhone}`} onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
            <Phone className="w-3 h-3" /> {rental.customerPhone}
          </a>
        )}
      </div>
    </div>
  );
}

export default function AIRecovery() {
  const navigate = useNavigate();
  const [recoveries, setRecoveries] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('All Branches');
  const [statusFilter, setStatusFilter] = useState('open');
  const [aiResults, setAiResults] = useState({});
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mainTab, setMainTab] = useState('recoveries');

  const load = async () => {
    setLoading(true);
    const [rec, rent, eq] = await Promise.all([
      base44.entities.Recovery.list('-scheduledDate', 500),
      base44.entities.Rental.list('-startDate', 1000),
      base44.entities.Equipment.list('name', 2000),
    ]);
    setRecoveries(rec);
    setRentals(rent);
    setEquipment(eq);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];

  // Overdue rentals (out past end date, no recovery scheduled)
  const overdueRentals = useMemo(() => {
    const recoveredRentalIds = new Set(recoveries.map(r => r.rentalId));
    return rentals.filter(r =>
      r.status === 'out' &&
      r.endDate < today &&
      !recoveredRentalIds.has(r.id) &&
      (branch === 'All Branches' || r.branch === branch)
    ).sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [rentals, recoveries, branch, today]);

  const filteredRecoveries = useMemo(() => {
    return recoveries.filter(r => {
      const branchMatch = branch === 'All Branches' || r.branch === branch;
      const statusMatch =
        statusFilter === 'all' ? true :
        statusFilter === 'open' ? OPEN_STATUSES.includes(r.status) :
        r.status === 'completed';
      return branchMatch && statusMatch;
    }).sort((a, b) => {
      if (statusFilter === 'open') {
        return OPEN_STATUSES.indexOf(a.status) - OPEN_STATUSES.indexOf(b.status);
      }
      return (b.scheduledDate || '').localeCompare(a.scheduledDate || '');
    });
  }, [recoveries, branch, statusFilter]);

  const counts = useMemo(() => ({
    open:      recoveries.filter(r => OPEN_STATUSES.includes(r.status)).length,
    withDamage:recoveries.filter(r => r.detectedDamages?.length > 0).length,
    completed: recoveries.filter(r => r.status === 'completed').length,
    overdue:   overdueRentals.length,
  }), [recoveries, overdueRentals]);

  const totalDamageValue = useMemo(() =>
    recoveries.reduce((sum, r) =>
      sum + (r.detectedDamages || []).reduce((s, d) => s + (d.estimatedRepairCost || 0), 0), 0
    ), [recoveries]);

  const handleAIInsight = async (recovery, rental, eq) => {
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this equipment recovery situation and provide actionable insights:

Customer: ${recovery.customerName}
Equipment: ${recovery.items?.map(i => i.equipmentName).join(', ')}
Recovery Status: ${recovery.status}
Scheduled Date: ${recovery.scheduledDate || 'Not scheduled'}
Branch: ${recovery.branch}
Rental End Date: ${rental?.endDate || 'Unknown'}
Rental Status: ${rental?.status || 'Unknown'}
Damage Detected: ${recovery.detectedDamages?.length > 0 ? JSON.stringify(recovery.detectedDamages) : 'None'}
Driver Assigned: ${recovery.driverName || 'Not assigned'}
Equipment Condition Before: ${eq?.condition || 'Unknown'}

Provide a recovery risk assessment and recommended action.`,
        response_json_schema: {
          type: 'object',
          properties: {
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            estimatedValue: { type: 'number' },
            recommendation: { type: 'string' },
            notes: { type: 'string' },
          }
        }
      });
      setAiResults(prev => ({ ...prev, [recovery.id]: result }));
    } catch (err) {
      setAiResults(prev => ({ ...prev, [recovery.id]: { error: err.message } }));
    }
  };

  const handleRunFullAnalysis = async () => {
    setRunningAnalysis(true);
    setAnalysisResult(null);
    try {
      const overdueList = overdueRentals.slice(0, 20).map(r => ({
        customer: r.customerName, equipment: r.equipmentName, daysOverdue: Math.floor((new Date(today) - new Date(r.endDate)) / 86400000), phone: r.customerPhone
      }));
      const damageList = recoveries.filter(r => r.detectedDamages?.length > 0).slice(0, 10).map(r => ({
        customer: r.customerName, damages: r.detectedDamages.map(d => `${d.damageType} (${d.severity}) $${d.estimatedRepairCost || 0}`).join('; ')
      }));
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the overall equipment recovery situation for a rental company and provide strategic insights:

OVERDUE RENTALS (${overdueRentals.length} total):
${overdueList.map(r => `- ${r.customer}: ${r.equipment} — ${r.daysOverdue} days overdue`).join('\n') || 'None'}

DAMAGE REPORTS (${recoveries.filter(r => r.detectedDamages?.length > 0).length} total):
${damageList.map(r => `- ${r.customer}: ${r.damages}`).join('\n') || 'None'}

OPEN RECOVERIES: ${counts.open}
TOTAL POTENTIAL DAMAGE VALUE: $${totalDamageValue.toFixed(0)}

Provide a strategic recovery action plan for the operations manager.`,
        response_json_schema: {
          type: 'object',
          properties: {
            urgentActions: { type: 'array', items: { type: 'string' } },
            riskSummary: { type: 'string' },
            revenueatRisk: { type: 'number' },
            weeklyPriorities: { type: 'array', items: { type: 'string' } },
            patternInsights: { type: 'string' },
          }
        }
      });
      setAnalysisResult(result);
    } catch (err) {
      setAnalysisResult({ error: err.message });
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Customer', 'Equipment', 'Status', 'Branch', 'Driver', 'Scheduled Date', 'Damage Count', 'Damage Value'];
    const rows = filteredRecoveries.map(r => [
      r.customerName || '',
      r.items?.map(i => i.equipmentName).join('; ') || '',
      r.status || '',
      r.branch || '',
      r.driverName || '',
      r.scheduledDate || '',
      r.detectedDamages?.length || 0,
      (r.detectedDamages || []).reduce((s, d) => s + (d.estimatedRepairCost || 0), 0).toFixed(0),
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recoveries-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ThreatNotificationBanner />
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/manager')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold">AIRecovery Intelligence</div>
            <div className="text-indigo-300 text-xs">{filteredRecoveries.length} recover{filteredRecoveries.length !== 1 ? 'ies' : 'y'} shown</div>
          </div>
          <select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            className="h-9 border-0 rounded px-2 bg-indigo-800 text-white text-sm"
          >
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {!loading && filteredRecoveries.length > 0 && (
            <button onClick={handleExportCSV} title="Export CSV" className="flex items-center gap-1.5 text-indigo-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800 transition text-xs font-medium border border-indigo-700">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
          <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-indigo-800 text-indigo-200">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Main Tabs */}
        <div className="px-4 max-w-5xl mx-auto flex gap-1 flex-wrap items-center">
          {[
            { key: 'recoveries', label: '🔄 Recoveries', icon: null },
            { key: 'theft_intel', label: '🕵️ Theft Intel', icon: null },
            { key: 'boundary', label: '🛰️ Boundary', icon: null },
            { key: 'threatwatch', label: '📡 ThreatWatch', icon: null },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                mainTab === tab.key
                  ? 'border-white text-white'
                  : 'border-transparent text-indigo-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={() => navigate('/dispatch')}
            className="ml-auto px-3 py-1.5 text-sm font-medium bg-cyan-600 hover:bg-cyan-700 rounded transition"
          >
            🚚 Dispatch
          </button>
        </div>
        {/* Recovery sub-tabs only when on recoveries tab */}
        {mainTab === 'recoveries' && (
          <div className="px-4 max-w-5xl mx-auto flex gap-1 pb-1">
            {[
              { key: 'open', label: 'Active' },
              { key: 'completed', label: 'Completed' },
              { key: 'all', label: 'All' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t transition ${
                  statusFilter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'text-indigo-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Intelligence Panels — Security+ gated */}
        {mainTab === 'theft_intel' && (
          <PremiumGate requiredTier="security_plus" featureName="Theft Intelligence" returnPath="/airecovery">
            <TheftIntelPanel rentals={rentals} customers={[]} recoveries={recoveries} />
          </PremiumGate>
        )}
        {mainTab === 'boundary' && (
          <PremiumGate requiredTier="security_plus" featureName="Boundary Vigilance" returnPath="/airecovery">
            <BoundaryVigilancePanel rentals={rentals} recoveries={recoveries} />
          </PremiumGate>
        )}
        {mainTab === 'threatwatch' && (
          <PremiumGate requiredTier="security_plus" featureName="ThreatWatch" returnPath="/airecovery">
            <ThreatWatchPanel rentals={rentals} customers={[]} recoveries={recoveries} />
          </PremiumGate>
        )}

        {mainTab !== 'recoveries' && null}
        {mainTab === 'recoveries' && <>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Recoveries', count: counts.open,       color: 'text-blue-700 bg-blue-50 border-blue-200',   icon: RotateCcw },
            { label: 'Overdue Returns',   count: counts.overdue,    color: 'text-red-700 bg-red-50 border-red-200',      icon: AlertTriangle },
            { label: 'Damage Reports',    count: counts.withDamage, color: 'text-amber-700 bg-amber-50 border-amber-200',icon: Camera },
            { label: 'Completed',         count: counts.completed,  color: 'text-green-700 bg-green-50 border-green-200',icon: CheckCircle2 },
          ].map(({ label, count, color, icon: Icon }) => (
            <div key={label} className={`rounded-lg border px-4 py-3 ${color}`}>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{count}</div>
                <Icon className="w-5 h-5 opacity-50" />
              </div>
              <div className="text-xs font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Financial summary + AI Analysis CTA */}
        {totalDamageValue > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-red-900">Total Damage Value on Record</div>
                <div className="text-2xl font-black text-red-700">${totalDamageValue.toFixed(2)}</div>
              </div>
            </div>
            <button
              onClick={handleRunFullAnalysis}
              disabled={runningAnalysis}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
            >
              {runningAnalysis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {runningAnalysis ? 'Analyzing…' : 'Run Full AI Analysis'}
            </button>
          </div>
        )}

        {/* Full AI Analysis Result */}
        {analysisResult && !analysisResult.error && (
          <div className="bg-white border border-indigo-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              AI Recovery Intelligence Report
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {analysisResult.riskSummary && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="font-semibold text-amber-900 mb-1">Risk Summary</div>
                  <p className="text-amber-800">{analysisResult.riskSummary}</p>
                </div>
              )}
              {analysisResult.revenueatRisk > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="font-semibold text-red-900 mb-1">Revenue at Risk</div>
                  <div className="text-2xl font-black text-red-700">${analysisResult.revenueatRisk?.toLocaleString()}</div>
                </div>
              )}
            </div>
            {analysisResult.urgentActions?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="font-semibold text-red-900 mb-2">🚨 Urgent Actions</div>
                <ul className="space-y-1">
                  {analysisResult.urgentActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysisResult.weeklyPriorities?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-semibold text-blue-900 mb-2">📋 Weekly Priorities</div>
                <ul className="space-y-1">
                  {analysisResult.weeklyPriorities.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analysisResult.patternInsights && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
                <div className="font-semibold text-purple-900 mb-1">📊 Pattern Insights</div>
                {analysisResult.patternInsights}
              </div>
            )}
          </div>
        )}

        {/* Overdue Rentals with no recovery */}
        {overdueRentals.length > 0 && statusFilter !== 'completed' && (
          <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Overdue — No Recovery Scheduled ({overdueRentals.length})
              </div>
              <button
                onClick={() => navigate('/dispatch')}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition"
              >
                Schedule Recovery →
              </button>
            </div>
            <div className="divide-y">
              {overdueRentals.slice(0, 10).map(r => (
                <OverdueRentalRow key={r.id} rental={r} />
              ))}
              {overdueRentals.length > 10 && (
                <div className="px-4 py-2 text-xs text-gray-500 text-center">
                  +{overdueRentals.length - 10} more overdue rentals
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recovery Cards */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filteredRecoveries.length === 0 ? (
          <div className="text-center text-gray-400 py-16 bg-white rounded-lg border text-sm">
            No recoveries found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecoveries.map(recovery => {
              const rental = rentals.find(r => r.id === recovery.rentalId);
              return (
                <RecoveryCard
                  key={recovery.id}
                  recovery={recovery}
                  rental={rental}
                  equipment={equipment}
                  onAIInsight={handleAIInsight}
                  aiResult={aiResults[recovery.id]}
                />
              );
            })}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}