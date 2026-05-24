import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, TrendingDown, DollarSign, RefreshCw, Zap, Printer, Download } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { useRef } from 'react';

const HEALTH_COLORS = {
  high:   { bar: 'bg-green-500',  badge: 'bg-green-100 text-green-800',  label: 'Healthy' },
  medium: { bar: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800', label: 'At Risk' },
  low:    { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-800',       label: 'Critical' },
};

const ACTION_COLORS = {
  sell:       'bg-red-100 text-red-700 border-red-200',
  repair:     'bg-blue-100 text-blue-700 border-blue-200',
  reposition: 'bg-purple-100 text-purple-700 border-purple-200',
  bundle:     'bg-amber-100 text-amber-700 border-amber-200',
};

function healthTier(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

function HealthBar({ score }) {
  const tier = healthTier(score);
  const { bar, badge, label } = HEALTH_COLORS[tier];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
    </div>
  );
}

function StatCard({ icon: IconComp, label, value, color = 'text-gray-900' }) {
  const Icon = IconComp;
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-lg">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

function handlePrint() { window.print(); }

function handlePDFDownload(title) {
  const printContents = document.getElementById('printable-area')?.innerHTML;
  if (!printContents) return;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:sans-serif;padding:24px;font-size:12px;}
    h1{font-size:18px;margin-bottom:8px;}
    table{width:100%;border-collapse:collapse;}
    th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;}
    th{background:#f9fafb;font-weight:600;}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;}
    @media print{button{display:none;}}
    </style></head><body>
    <h1>${title}</h1><p style="color:#6b7280;margin-bottom:16px;">Generated ${new Date().toLocaleDateString()}</p>
    ${printContents}
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

export default function InventoryHealth() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    base44.functions.invoke('inventoryHealth', {})
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const stats = data?.stats || [];
  const aiInsights = data?.aiInsights || [];

  const aiMap = {};
  aiInsights.forEach(i => { aiMap[i.name] = i; });

  const filtered = stats.filter(item => {
    const tier = healthTier(item.healthScore);
    const matchFilter =
      filter === 'all' ||
      (filter === 'critical' && tier === 'low') ||
      (filter === 'at_risk' && tier === 'medium') ||
      (filter === 'healthy' && tier === 'high');
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.category || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const criticalCount = stats.filter(s => healthTier(s.healthScore) === 'low').length;
  const atRiskCount   = stats.filter(s => healthTier(s.healthScore) === 'medium').length;
  const neverRented   = stats.filter(s => s.rentalCount === 0).length;
  const totalRevenue  = stats.reduce((s, i) => s + i.totalRevenue, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Inventory Health"
        subtitle="AI-powered stale asset detection"
        icon={AlertTriangle}
        backTo="/lupine"
        action={
          <div className="flex items-center gap-1">
            <button onClick={handlePrint} disabled={loading || !data} className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-40"><Printer className="w-4 h-4" /></button>
            <button onClick={() => handlePDFDownload('Inventory Health Report', 'printable-area')} disabled={loading || !data} className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-40"><Download className="w-4 h-4" /></button>
            <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-white/10 text-white"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        }
      />

      <div id="printable-area" className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm text-gray-500">Analyzing inventory + generating AI insights…</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={AlertTriangle} label="Critical" value={criticalCount} color="text-red-600" />
              <StatCard icon={TrendingDown}  label="At Risk"  value={atRiskCount}   color="text-yellow-600" />
              <StatCard icon={TrendingDown}  label="Never Rented" value={neverRented} color="text-gray-700" />
              <StatCard icon={DollarSign}    label="Fleet Revenue" value={`$${totalRevenue.toLocaleString()}`} color="text-indigo-700" />
            </div>

            {/* AI Insights Panel */}
            {aiInsights.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-800">AI Recommendations — Top {aiInsights.length} Underperformers</span>
                </div>
                <div className="space-y-2">
                  {aiInsights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0 mt-0.5 ${ACTION_COLORS[insight.action] || 'bg-gray-100 text-gray-700'}`}>
                        {insight.action}
                      </span>
                      <div>
                        <span className="font-medium text-gray-900">{insight.name}: </span>
                        <span className="text-gray-600">{insight.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="text"
                placeholder="Search equipment..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none flex-1 min-w-40"
              />
              {['all', 'critical', 'at_risk', 'healthy'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Equipment Table */}
            <div className="space-y-2">
              {filtered.length === 0 && (
                <div className="text-center py-12 text-gray-400">No items found.</div>
              )}
              {filtered.map(item => {
                const ai = aiMap[item.name];
                return (
                  <div key={item.id} className="bg-white rounded-xl border shadow-sm p-4">
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-48">
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.category}
                          {item.location && <span className="ml-2 text-gray-400">· {item.location}</span>}
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                        <div className="text-center">
                          <div className="font-bold text-gray-900">{item.rentalCount}</div>
                          <div className="text-xs text-gray-400">rentals</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-900">
                            {item.daysSinceRental === 9999 ? 'Never' : `${item.daysSinceRental}d`}
                          </div>
                          <div className="text-xs text-gray-400">since rented</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-indigo-700">${item.totalRevenue.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">revenue</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <HealthBar score={item.healthScore} />
                    </div>
                    {ai && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-gray-600">
                        <span className={`px-2 py-0.5 rounded-full border font-semibold capitalize shrink-0 ${ACTION_COLORS[ai.action] || ''}`}>
                          {ai.action}
                        </span>
                        <span className="italic">{ai.recommendation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}