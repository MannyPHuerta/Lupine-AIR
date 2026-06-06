import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { BarChart3, TrendingUp, Package, AlertTriangle, RefreshCw, Loader2, Download, Printer, ShoppingBag, Sparkles } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const TABS = [
  { id: 'utilization', label: 'Utilization', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'demand', label: 'Demand Trends', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'aging', label: 'Asset Aging', icon: <Package className="w-4 h-4" /> },
  { id: 'health', label: 'Fleet Health', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'rto', label: 'Rent-to-Own', icon: <ShoppingBag className="w-4 h-4" /> },
];

const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#facc15'];

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-white/60 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

function StatCard({ label, value, sub, color = 'text-cyan-400' }) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
      <div className="text-white/50 text-xs mb-1">{label}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-white/40 text-xs mt-1">{sub}</div>}
    </div>
  );
}

// ─── Utilization Tab ─────────────────────────────────────────────────────────
function UtilizationTab({ rentals, equipment }) {
  const categoryMap = {};
  rentals.forEach(r => {
    const eq = equipment.find(e => e.id === r.equipmentId);
    const cat = eq?.category || 'Unknown';
    if (!categoryMap[cat]) categoryMap[cat] = { category: cat, rentals: 0, revenue: 0 };
    categoryMap[cat].rentals += 1;
    categoryMap[cat].revenue += r.baseAmount || 0;
  });
  const data = Object.values(categoryMap)
    .sort((a, b) => b.rentals - a.rentals)
    .slice(0, 10);

  const totalRentals = rentals.length;
  const totalRevenue = rentals.reduce((s, r) => s + (r.baseAmount || 0), 0);
  const activeEquipment = equipment.filter(e => e.unitStatus === 'out_on_rental' || e.unitStatus === 'reserved').length;
  const utilizationRate = equipment.length > 0 ? Math.round((activeEquipment / equipment.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Rentals" value={totalRentals.toLocaleString()} sub="all time" />
        <StatCard label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}k`} sub="rental subtotals" color="text-green-400" />
        <StatCard label="Fleet Utilization" value={`${utilizationRate}%`} sub={`${activeEquipment} of ${equipment.length} units active`} color="text-purple-400" />
        <StatCard label="Categories" value={data.length} sub="with rental history" color="text-amber-400" />
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
        <div className="text-white font-semibold mb-4 text-sm">Rentals by Category</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <Tooltip content={<DarkTooltip />} />
            <Bar dataKey="rentals" name="Rentals" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
        <div className="text-white font-semibold mb-4 text-sm">Revenue by Category</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<DarkTooltip />} formatter={v => [`$${v.toFixed(2)}`, 'Revenue']} />
            <Bar dataKey="revenue" name="Revenue ($)" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Demand Trends Tab ───────────────────────────────────────────────────────
function DemandTab({ rentals }) {
  const monthMap = {};
  rentals.forEach(r => {
    if (!r.startDate) return;
    const month = r.startDate.slice(0, 7); // YYYY-MM
    if (!monthMap[month]) monthMap[month] = { month, rentals: 0, revenue: 0 };
    monthMap[month].rentals += 1;
    monthMap[month].revenue += r.baseAmount || 0;
  });

  const data = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-18)
    .map(([, v]) => ({ ...v, month: v.month.replace('-', ' ').replace(/(\d{4}) (\d{2})/, (_, y, m) => {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[parseInt(m)-1]} ${y.slice(2)}`;
    }) }));

  // Season breakdown
  const seasonMap = { Winter: 0, Spring: 0, Summer: 0, Fall: 0 };
  rentals.forEach(r => {
    if (!r.startDate) return;
    const mo = parseInt(r.startDate.slice(5, 7));
    if (mo >= 12 || mo <= 2) seasonMap.Winter++;
    else if (mo <= 5) seasonMap.Spring++;
    else if (mo <= 8) seasonMap.Summer++;
    else seasonMap.Fall++;
  });
  const seasonData = Object.entries(seasonMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
        <div className="text-white font-semibold mb-4 text-sm">Monthly Rental Volume (last 18 months)</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} angle={-30} textAnchor="end" height={55} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <Tooltip content={<DarkTooltip />} />
            <Line type="monotone" dataKey="rentals" name="Rentals" stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Monthly Revenue Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} angle={-30} textAnchor="end" height={55} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<DarkTooltip />} formatter={v => [`$${v.toFixed(0)}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#34d399" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Seasonal Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={seasonData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {seasonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Aging Tab ─────────────────────────────────────────────────────────
function AgingTab({ equipment }) {
  const now = new Date();

  const aged = equipment
    .filter(e => e.purchaseDate)
    .map(e => {
      const years = (now - new Date(e.purchaseDate)) / (1000 * 60 * 60 * 24 * 365);
      return { ...e, ageYears: years };
    })
    .sort((a, b) => b.ageYears - a.ageYears);

  const buckets = [
    { label: '< 1 yr', count: aged.filter(e => e.ageYears < 1).length, color: '#34d399' },
    { label: '1–3 yrs', count: aged.filter(e => e.ageYears >= 1 && e.ageYears < 3).length, color: '#22d3ee' },
    { label: '3–5 yrs', count: aged.filter(e => e.ageYears >= 3 && e.ageYears < 5).length, color: '#facc15' },
    { label: '5–10 yrs', count: aged.filter(e => e.ageYears >= 5 && e.ageYears < 10).length, color: '#fb923c' },
    { label: '10+ yrs', count: aged.filter(e => e.ageYears >= 10).length, color: '#f87171' },
    { label: 'Unknown', count: equipment.filter(e => !e.purchaseDate).length, color: '#64748b' },
  ];

  const conditionMap = {};
  equipment.forEach(e => {
    const c = e.condition || 'Unknown';
    conditionMap[c] = (conditionMap[c] || 0) + 1;
  });
  const conditionData = Object.entries(conditionMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {buckets.map((b, i) => (
          <div key={i} className="bg-slate-900 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-xl font-black" style={{ color: b.color }}>{b.count}</div>
            <div className="text-white/50 text-xs mt-1">{b.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Age Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buckets.filter(b => b.count > 0)} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="count" name="Units" radius={[4, 4, 0, 0]}>
                {buckets.filter(b => b.count > 0).map((b, i) => <Cell key={i} fill={b.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Fleet Condition</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={conditionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {conditionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {aged.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Oldest Assets</div>
          <div className="space-y-2">
            {aged.slice(0, 10).map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-white text-sm font-medium">{e.name}</div>
                  <div className="text-white/40 text-xs">{e.category} · {e.condition || 'Unknown condition'}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${e.ageYears >= 10 ? 'text-red-400' : e.ageYears >= 5 ? 'text-amber-400' : 'text-cyan-400'}`}>
                    {e.ageYears.toFixed(1)} yrs
                  </div>
                  <div className="text-white/30 text-xs">{e.purchaseDate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Fleet Health Tab ─────────────────────────────────────────────────────────
function HealthTab({ equipment, rentals }) {
  const statusMap = {};
  equipment.forEach(e => {
    const s = e.unitStatus || e.status || 'unknown';
    statusMap[s] = (statusMap[s] || 0) + 1;
  });

  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  const statusLabels = {
    available: { label: 'Available', color: '#34d399' },
    reserved: { label: 'Reserved', color: '#22d3ee' },
    out_on_rental: { label: 'Out on Rental', color: '#a78bfa' },
    in_shop: { label: 'In Shop', color: '#fb923c' },
    awaiting_parts: { label: 'Awaiting Parts', color: '#f87171' },
    in_laundry: { label: 'In Laundry', color: '#60a5fa' },
    under_inspection: { label: 'Under Inspection', color: '#facc15' },
    retired: { label: 'Retired', color: '#64748b' },
  };

  // Branch breakdown
  const branchMap = {};
  rentals.forEach(r => {
    const b = r.branch || 'Unknown';
    if (!branchMap[b]) branchMap[b] = { branch: b, rentals: 0, revenue: 0 };
    branchMap[b].rentals += 1;
    branchMap[b].revenue += r.baseAmount || 0;
  });
  const branchData = Object.values(branchMap).sort((a, b) => b.rentals - a.rentals);

  const needsAttention = equipment.filter(e =>
    ['in_shop', 'awaiting_parts', 'under_inspection'].includes(e.unitStatus)
  );

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Fleet Status Breakdown</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                label={({ name, percent }) => `${statusLabels[name]?.label || name} ${(percent*100).toFixed(0)}%`}
                labelLine={false}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={statusLabels[entry.name]?.color || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<DarkTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Revenue by Branch</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={branchData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="branch" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} width={90} />
              <Tooltip content={<DarkTooltip />} formatter={v => [`$${v.toFixed(0)}`, 'Revenue']} />
              <Bar dataKey="revenue" name="Revenue" fill="#22d3ee" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <div className="text-amber-400 font-semibold text-sm">{needsAttention.length} units need attention</div>
          </div>
          <div className="space-y-2">
            {needsAttention.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-white text-sm font-medium">{e.name}</div>
                  <div className="text-white/40 text-xs">{e.location || 'No location'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {statusLabels[e.unitStatus]?.label || e.unitStatus}
                  </span>
                  {e.statusNote && <span className="text-white/40 text-xs">{e.statusNote}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rent-to-Own Tab ─────────────────────────────────────────────────────────
function RtoTab({ rentals, equipment }) {
  const now = new Date();
  const [rtoBranch, setRtoBranch] = useState('all');
  const [rtoSort, setRtoSort] = useState('start_desc');
  const [rtoMonth, setRtoMonth] = useState('all');

  const allRtoActive = rentals.filter(r => r.isRentToOwn && r.status !== 'cancelled' && r.status !== 'completed');

  // Available months from start dates
  const rtoMonths = ['all', ...Array.from(new Set(allRtoActive.map(r => r.startDate?.slice(0, 7)).filter(Boolean))).sort().reverse()];

  // Branch + month filter
  const rtoBranches = ['all', ...Array.from(new Set(allRtoActive.map(r => r.branch).filter(Boolean))).sort()];
  const rtoRentals = allRtoActive.filter(r => {
    if (rtoBranch !== 'all' && r.branch !== rtoBranch) return false;
    if (rtoMonth !== 'all' && (r.startDate?.slice(0, 7) !== rtoMonth)) return false;
    return true;
  });

  // Sort
  const sortedRtoRentals = [...rtoRentals].sort((a, b) => {
    if (rtoSort === 'start_desc') return (b.startDate || '').localeCompare(a.startDate || '');
    if (rtoSort === 'start_asc') return (a.startDate || '').localeCompare(b.startDate || '');
    if (rtoSort === 'expiry_asc') return (a.purchaseOptionExpiry || '9999').localeCompare(b.purchaseOptionExpiry || '9999');
    if (rtoSort === 'progress_desc') {
      const pctA = a.purchasePrice > 0 ? (a.amountCredited || 0) / a.purchasePrice : 0;
      const pctB = b.purchasePrice > 0 ? (b.amountCredited || 0) / b.purchasePrice : 0;
      return pctB - pctA;
    }
    if (rtoSort === 'branch') return (a.branch || '').localeCompare(b.branch || '');
    return 0;
  });

  const expiringSoon = rtoRentals.filter(r => {
    if (!r.purchaseOptionExpiry) return false;
    const days = (new Date(r.purchaseOptionExpiry) - now) / (1000 * 60 * 60 * 24);
    return days <= 90 && days >= 0;
  }).sort((a, b) => new Date(a.purchaseOptionExpiry) - new Date(b.purchaseOptionExpiry));

  const expired = allRtoActive.filter(r => r.purchaseOptionExpiry && new Date(r.purchaseOptionExpiry) < now);

  const handleExportRto = () => {
    const date = new Date().toISOString().split('T')[0];
    const headers = ['Customer', 'Equipment', 'Branch', 'Start Date', 'Purchase Price', 'Credit %', 'Total Credited', 'Balance Remaining', 'Progress %', 'Option Expiry', 'Days Left', 'Status'];
    const rows = rtoRentals.map(r => {
      const credited = r.amountCredited || 0;
      const price = r.purchasePrice || 0;
      const pct = r.rentToOwnCreditPercent || 0;
      const remaining = r.balanceRemaining ?? (price - credited);
      const progress = price > 0 ? Math.round((credited / price) * 100) : 0;
      const expiry = r.purchaseOptionExpiry ? new Date(r.purchaseOptionExpiry) : null;
      const daysLeft = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : null;
      const status = daysLeft !== null && daysLeft < 0 ? 'Expired' : credited >= price ? 'Fully Earned' : 'Active';
      return [
        r.customerName,
        r.equipmentName || '',
        r.branch || '',
        r.startDate || '',
        price.toFixed(2),
        `${pct}%`,
        credited.toFixed(2),
        remaining.toFixed(2),
        `${progress}%`,
        r.purchaseOptionExpiry || '',
        daysLeft !== null ? daysLeft.toString() : '',
        status
      ];
    });
    downloadCSV(`rto-accounting-${date}.csv`, headers, rows);
  };

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateRtoAnalysis = async () => {
    setAiLoading(true);
    try {
      const completed = rentals.filter(r => r.isRentToOwn && (r.status === 'completed' || r.balanceRemaining <= 0));
      const cancelled = rentals.filter(r => r.isRentToOwn && r.status === 'cancelled');
      const allRto = rentals.filter(r => r.isRentToOwn);

      const conversionRate = allRto.length > 0 ? Math.round((completed.length / allRto.length) * 100) : 0;
      const expiryRate = allRto.length > 0 ? Math.round((expired.length / allRto.length) * 100) : 0;

      const categoryBreakdown = {};
      allRto.forEach(r => {
        const eq = equipment.find(e => e.id === r.equipmentId);
        const cat = eq?.category || 'Unknown';
        if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { total: 0, completed: 0, revenue: 0 };
        categoryBreakdown[cat].total++;
        if (completed.find(c => c.id === r.id)) categoryBreakdown[cat].completed++;
        categoryBreakdown[cat].revenue += r.baseAmount || 0;
      });

      const branchBreakdown = {};
      allRto.forEach(r => {
        const b = r.branch || 'Unknown';
        if (!branchBreakdown[b]) branchBreakdown[b] = { total: 0, completed: 0, expired: 0, revenue: 0 };
        branchBreakdown[b].total++;
        if (completed.find(c => c.id === r.id)) branchBreakdown[b].completed++;
        if (expired.find(e => e.id === r.id)) branchBreakdown[b].expired++;
        branchBreakdown[b].revenue += r.baseAmount || 0;
      });

      const prompt = `Analyze this rent-to-own portfolio and provide actionable insights:

PORTFOLIO SUMMARY:
- Active Contracts: ${rtoRentals.length}
- Completed (Owned): ${completed.length}
- Expired: ${expired.length}
- Cancelled: ${cancelled.length}
- Conversion Rate: ${conversionRate}%
- Expiry Rate: ${expiryRate}%
- Total Purchase Value: $${totalPurchaseValue.toFixed(2)}
- Total Credited: $${totalCredited.toFixed(2)}
- Average Progress: ${avgProgress}%

CATEGORY PERFORMANCE:
${Object.entries(categoryBreakdown).map(([cat, data]) => `- ${cat}: ${data.total} contracts, ${data.completed} completed (${data.total > 0 ? Math.round(data.completed/data.total*100) : 0}%), $${data.revenue.toFixed(2)} revenue`).join('\n')}

BRANCH PERFORMANCE:
${Object.entries(branchBreakdown).map(([b, data]) => `- ${b}: ${data.total} contracts, ${data.completed} completed, ${data.expired} expired, $${data.revenue.toFixed(2)} revenue`).join('\n')}

EXPIRING SOON: ${expiringSoon.length} contracts within 90 days
EXPIRED: ${expired.length} contracts need follow-up

Provide a concise analysis covering:
1. Conversion funnel health and trends
2. Revenue recognition patterns (recognized vs deferred)
3. Customer risk indicators
4. Equipment category performance insights
5. Branch/staff performance variations
6. Portfolio health warnings (concentration risk, expiry clustering)
7. Specific actionable recommendations

Format with clear headings and bullet points. Be direct and data-driven.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      setAiAnalysis(typeof response === 'string' ? response : response.data || response);
    } catch (err) {
      console.error('AI analysis failed:', err);
      setAiAnalysis('Failed to generate analysis. Please try again.');
    }
    setAiLoading(false);
  };

  // Monthly credit accrual trend
  const monthlyAccrualMap = {};
  rentals.forEach(r => {
    if (!r.isRentToOwn || !r.startDate) return;
    const month = r.startDate.slice(0, 7); // YYYY-MM
    if (!monthlyAccrualMap[month]) monthlyAccrualMap[month] = { month, credited: 0, rentalRevenue: 0, count: 0 };
    monthlyAccrualMap[month].credited += r.amountCredited || 0;
    const creditPct = r.rentToOwnCreditPercent || 0;
    const totalPayment = creditPct > 0 ? (r.amountCredited || 0) / (creditPct / 100) : (r.amountPaid || 0);
    monthlyAccrualMap[month].rentalRevenue += totalPayment;
    monthlyAccrualMap[month].count += 1;
  });

  const monthlyAccrualData = Object.entries(monthlyAccrualMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, v]) => ({
      ...v,
      month: v.month.replace('-', ' ').replace(/(\d{4}) (\d{2})/, (_, y, m) => {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[parseInt(m)-1]} ${y.slice(2)}`;
      }),
      netRevenue: v.rentalRevenue - v.credited
    }));

  const totalPurchaseValue = rtoRentals.reduce((s, r) => s + (r.purchasePrice || 0), 0);
  const totalCredited = rtoRentals.reduce((s, r) => s + (r.amountCredited || 0), 0);
  const totalRemaining = rtoRentals.reduce((s, r) => s + (r.balanceRemaining || r.purchasePrice || 0), 0);
  const avgProgress = rtoRentals.length > 0
    ? Math.round(rtoRentals.reduce((s, r) => {
        const pct = r.purchasePrice > 0 ? ((r.amountCredited || 0) / r.purchasePrice) * 100 : 0;
        return s + pct;
      }, 0) / rtoRentals.length)
    : 0;

  if (rtoRentals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/30 gap-3">
        <ShoppingBag className="w-10 h-10" />
        <div className="text-sm">No active rent-to-own agreements</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active RTO Agreements" value={rtoRentals.length} sub="contracts in progress" color="text-purple-400" />
        <StatCard label="Total Purchase Value" value={`$${(totalPurchaseValue / 1000).toFixed(1)}k`} sub="combined contract values" color="text-cyan-400" />
        <StatCard label="Total Credited" value={`$${(totalCredited / 1000).toFixed(1)}k`} sub="accumulated toward purchase" color="text-green-400" />
        <StatCard label="Avg Progress" value={`${avgProgress}%`} sub="toward ownership" color="text-amber-400" />
      </div>

      {/* Filter / Sort bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">Branch:</span>
          <select value={rtoBranch} onChange={e => setRtoBranch(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-1.5">
            {rtoBranches.map(b => <option key={b} value={b} className="text-black">{b === 'all' ? 'All Branches' : b}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">Month:</span>
          <select value={rtoMonth} onChange={e => setRtoMonth(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-1.5">
            {rtoMonths.map(m => (
              <option key={m} value={m} className="text-black">
                {m === 'all' ? 'All Months' : (() => {
                  const [y, mo] = m.split('-');
                  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(mo)-1]} ${y}`;
                })()}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">Sort:</span>
          <select value={rtoSort} onChange={e => setRtoSort(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-1.5">
            <option value="start_desc" className="text-black">Newest First</option>
            <option value="start_asc" className="text-black">Oldest First</option>
            <option value="expiry_asc" className="text-black">Expiry Soonest</option>
            <option value="progress_desc" className="text-black">Most Progress</option>
            <option value="branch" className="text-black">Branch A–Z</option>
          </select>
        </div>
        {(rtoBranch !== 'all' || rtoMonth !== 'all') && (
          <span className="text-xs text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
            {rtoRentals.length} of {allRtoActive.length} contracts
          </span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={generateRtoAnalysis}
          disabled={aiLoading || rtoRentals.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {aiLoading ? 'Analyzing...' : 'AI Portfolio Analysis'}
        </button>
        <button onClick={handleExportRto} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          <Download className="w-4 h-4" /> Export for Accounting
        </button>
      </div>

      {/* Monthly Credit Accrual Trend Chart */}
      {monthlyAccrualData.length > 0 && (
        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-semibold text-sm">Monthly Credit Accrual Trends</div>
              <div className="text-white/40 text-xs mt-0.5">Track deferred liability growth vs. recognized rental revenue</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-400" />
                <span className="text-white/60">Deferred Liability</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-400" />
                <span className="text-white/60">Net Revenue</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyAccrualData} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} angle={-30} textAnchor="end" height={55} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<DarkTooltip />} formatter={v => [`$${v.toFixed(2)}`, '']} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
              <Bar dataKey="credited" name="Deferred Liability" fill="#fb923c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netRevenue" name="Net Revenue" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {monthlyAccrualData.length > 0 && (
            <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="text-xs text-purple-300">
                <span className="font-semibold">💡 Liability Insight:</span>
                {(() => {
                  const recent = monthlyAccrualData.slice(-3);
                  const avgAccrual = recent.reduce((s, m) => s + m.credited, 0) / recent.length;
                  const totalRecentRevenue = recent.reduce((s, m) => s + m.rentalRevenue, 0);
                  const liabilityRatio = totalRecentRevenue > 0 ? (avgAccrual * 3) / totalRecentRevenue : 0;
                  if (liabilityRatio > 0.6) {
                    return ` Deferred liabilities are growing rapidly (${((liabilityRatio) * 100).toFixed(0)}% of recent revenue). Consider reviewing RTO terms to ensure healthy cash flow.`;
                  } else if (liabilityRatio > 0.4) {
                    return ` Liability growth is moderate. Current accrual rate is sustainable but monitor for acceleration.`;
                  } else {
                    return ` Liability growth is well-controlled. RTO portfolio shows healthy revenue recognition balance.`;
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {aiAnalysis && (
        <div className="bg-gradient-to-br from-slate-900 via-purple-950/20 to-slate-900 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div className="text-purple-300 font-semibold text-sm">AI Portfolio Analysis</div>
          </div>
          <div className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap font-mono">
            {aiAnalysis}
          </div>
          <button onClick={() => setAiAnalysis(null)} className="mt-4 text-xs text-purple-400 hover:text-purple-300">Dismiss</button>
        </div>
      )}

      {/* Expiring soon alert */}
      {expiringSoon.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-semibold text-sm">{expiringSoon.length} option{expiringSoon.length > 1 ? 's' : ''} expiring within 90 days</span>
          </div>
          <div className="space-y-2">
            {expiringSoon.map((r, i) => {
              const days = Math.ceil((new Date(r.purchaseOptionExpiry) - now) / (1000 * 60 * 60 * 24));
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-white text-sm font-medium">{r.customerName}</div>
                    <div className="text-white/40 text-xs">{r.equipmentName} · {r.branch}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${days <= 30 ? 'text-red-400' : 'text-amber-400'}`}>{days}d left</div>
                    <div className="text-white/30 text-xs">{r.purchaseOptionExpiry}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expired options */}
      {expired.length > 0 && (
        <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-semibold text-sm">{expired.length} option{expired.length > 1 ? 's' : ''} expired — follow up needed</span>
          </div>
          <div className="space-y-2">
            {expired.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-white text-sm font-medium">{r.customerName}</div>
                  <div className="text-white/40 text-xs">{r.equipmentName} · {r.branch}</div>
                </div>
                <div className="text-right">
                  <div className="text-red-400 text-sm font-bold">Expired</div>
                  <div className="text-white/30 text-xs">{r.purchaseOptionExpiry}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounting Breakdown */}
      <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-white font-semibold text-sm">Accounting View — Revenue vs. Deferred Liability</div>
        </div>
        <div className="text-white/40 text-xs mb-4">Each RTO payment is fully recognized as rental revenue. The credit portion granted to the customer creates a contingent liability that clears when the purchase option is exercised or expires.</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-white/50 font-medium">Customer / Equipment</th>
                <th className="text-right py-2 px-3 text-white/50 font-medium">Total Rental Revenue</th>
                <th className="text-right py-2 px-3 text-white/50 font-medium">Deferred Liability<br/><span className="font-normal text-white/30">(credits granted)</span></th>
                <th className="text-right py-2 px-3 text-white/50 font-medium">Net Revenue<br/><span className="font-normal text-white/30">(non-credit portion)</span></th>
                <th className="text-left py-2 px-3 text-white/50 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedRtoRentals.map((r, i) => {
                const credited = r.amountCredited || 0;
                const price = r.purchasePrice || 0;
                const creditPct = r.rentToOwnCreditPercent || 0;
                // Total payments made = credited / creditPct (if creditPct > 0)
                const totalPayments = creditPct > 0 ? credited / (creditPct / 100) : (r.amountPaid || 0);
                const netRevenue = totalPayments - credited;
                const isExpired = r.purchaseOptionExpiry && new Date(r.purchaseOptionExpiry) < now;
                const status = isExpired ? 'Liability Reversed → Income' : credited >= price ? 'Option Fully Earned' : 'Active — Liability Open';
                const statusColor = isExpired ? 'text-green-400' : credited >= price ? 'text-cyan-400' : 'text-amber-400';
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3">
                      <div className="text-white font-medium">{r.customerName}</div>
                      <div className="text-white/40">{r.equipmentName}</div>
                    </td>
                    <td className="py-2 px-3 text-right text-white/80">${totalPayments.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-amber-400">${credited.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-green-400">${netRevenue.toFixed(2)}</td>
                    <td className={`py-2 px-3 ${statusColor}`}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/20 bg-white/5">
                <td className="py-2 px-3 text-white font-semibold">Totals</td>
                <td className="py-2 px-3 text-right text-white font-semibold">
                  ${rtoRentals.reduce((s, r) => {
                    const cp = r.rentToOwnCreditPercent || 0;
                    const credited = r.amountCredited || 0;
                    return s + (cp > 0 ? credited / (cp / 100) : (r.amountPaid || 0));
                  }, 0).toFixed(2)}
                </td>
                <td className="py-2 px-3 text-right text-amber-400 font-semibold">${totalCredited.toFixed(2)}</td>
                <td className="py-2 px-3 text-right text-green-400 font-semibold">
                  ${rtoRentals.reduce((s, r) => {
                    const cp = r.rentToOwnCreditPercent || 0;
                    const credited = r.amountCredited || 0;
                    const total = cp > 0 ? credited / (cp / 100) : (r.amountPaid || 0);
                    return s + (total - credited);
                  }, 0).toFixed(2)}
                </td>
                <td className="py-2 px-3 text-white/40 text-xs">{rtoRentals.length} contracts</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* All active agreements table */}
      <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
        <div className="text-white font-semibold mb-4 text-sm">All Active Agreements</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-white/50 font-medium">Customer</th>
                <th className="text-left py-2 px-3 text-white/50 font-medium">Equipment</th>
                <th className="text-left py-2 px-3 text-white/50 font-medium">Branch</th>
                <th className="text-left py-2 px-3 text-white/50 font-medium">Start Date</th>
                <th className="text-right py-2 px-3 text-white/50 font-medium">Purchase Price</th>
                <th className="text-right py-2 px-3 text-white/50 font-medium">Credited</th>
                <th className="text-right py-2 px-3 text-white/50 font-medium">Remaining</th>
                <th className="text-left py-2 px-3 text-white/50 font-medium">Progress</th>
                <th className="text-left py-2 px-3 text-white/50 font-medium">Option Expiry</th>
              </tr>
            </thead>
            <tbody>
              {sortedRtoRentals.map((r, i) => {
                const credited = r.amountCredited || 0;
                const price = r.purchasePrice || 0;
                const pct = price > 0 ? Math.min(100, Math.round((credited / price) * 100)) : 0;
                const expiry = r.purchaseOptionExpiry ? new Date(r.purchaseOptionExpiry) : null;
                const daysLeft = expiry ? Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) : null;
                const expiryColor = daysLeft === null ? 'text-white/30' : daysLeft < 0 ? 'text-red-400' : daysLeft <= 30 ? 'text-red-400' : daysLeft <= 90 ? 'text-amber-400' : 'text-white/60';
                return (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 text-white font-medium">{r.customerName}</td>
                    <td className="py-2 px-3 text-white/60">{r.equipmentName}</td>
                    <td className="py-2 px-3 text-white/50">{r.branch}</td>
                    <td className="py-2 px-3 text-white/40">{r.startDate || '—'}</td>
                    <td className="py-2 px-3 text-right text-white/80">${price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-green-400">${credited.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-cyan-400">${(r.balanceRemaining ?? (price - credited)).toFixed(2)}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-1.5 w-20">
                          <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-white/50">{pct}%</span>
                      </div>
                    </td>
                    <td className={`py-2 px-3 ${expiryColor}`}>
                      {r.purchaseOptionExpiry || '—'}
                      {daysLeft !== null && daysLeft >= 0 && <span className="ml-1 text-white/30">({daysLeft}d)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── CSV Export Helpers ───────────────────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AIReports() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('utilization');
  const [rentals, setRentals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('all');

  const load = async () => {
    setLoading(true);
    const [rent, eq] = await Promise.all([
      base44.entities.Rental.list('-created_date', 2000),
      base44.entities.Equipment.list('-created_date', 500),
    ]);
    setRentals(rent);
    setEquipment(eq);
    setLoading(false);
  };

  const rtoRentals = rentals.filter(r => r.isRentToOwn && r.status !== 'cancelled' && r.status !== 'completed');

  useEffect(() => { load(); }, []);

  const branches = ['all', ...Array.from(new Set(rentals.map(r => r.branch).filter(Boolean))).sort()];

  const filteredRentals = branch === 'all' ? rentals : rentals.filter(r => r.branch === branch);
  const filteredEquipment = branch === 'all' ? equipment : equipment.filter(e => e.location === branch);

  const handleExport = () => {
    const date = new Date().toISOString().split('T')[0];
    const branchLabel = branch === 'all' ? 'all-branches' : branch.replace(/\s+/g, '-');

    if (activeTab === 'utilization') {
      const catMap = {};
      filteredRentals.forEach(r => {
        const eq = filteredEquipment.find(e => e.id === r.equipmentId);
        const cat = eq?.category || 'Unknown';
        if (!catMap[cat]) catMap[cat] = { category: cat, rentals: 0, revenue: 0 };
        catMap[cat].rentals += 1;
        catMap[cat].revenue += r.baseAmount || 0;
      });
      const rows = Object.values(catMap).sort((a, b) => b.rentals - a.rentals)
        .map(r => [r.category, r.rentals, r.revenue.toFixed(2)]);
      downloadCSV(`utilization-${branchLabel}-${date}.csv`, ['Category', 'Rentals', 'Revenue ($)'], rows);

    } else if (activeTab === 'demand') {
      const monthMap = {};
      filteredRentals.forEach(r => {
        if (!r.startDate) return;
        const month = r.startDate.slice(0, 7);
        if (!monthMap[month]) monthMap[month] = { month, rentals: 0, revenue: 0 };
        monthMap[month].rentals += 1;
        monthMap[month].revenue += r.baseAmount || 0;
      });
      const rows = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => [v.month, v.rentals, v.revenue.toFixed(2)]);
      downloadCSV(`demand-trends-${branchLabel}-${date}.csv`, ['Month', 'Rentals', 'Revenue ($)'], rows);

    } else if (activeTab === 'aging') {
      const now = new Date();
      const rows = filteredEquipment.map(e => {
        const ageYears = e.purchaseDate
          ? ((now - new Date(e.purchaseDate)) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
          : 'Unknown';
        return [e.name, e.category || '', e.condition || '', e.purchaseDate || '', ageYears, e.location || ''];
      });
      downloadCSV(`asset-aging-${branchLabel}-${date}.csv`, ['Equipment', 'Category', 'Condition', 'Purchase Date', 'Age (yrs)', 'Location'], rows);

    } else if (activeTab === 'health') {
      const rows = filteredEquipment.map(e => [
        e.name, e.category || '', e.unitStatus || e.status || '', e.condition || '', e.location || '', e.statusNote || ''
      ]);
      downloadCSV(`fleet-health-${branchLabel}-${date}.csv`, ['Equipment', 'Category', 'Status', 'Condition', 'Location', 'Note'], rows);
    } else if (activeTab === 'rto') {
      const rows = rtoRentals.map(r => {
        const credited = r.amountCredited || 0;
        const price = r.purchasePrice || 0;
        const pct = price > 0 ? Math.round((credited / price) * 100) : 0;
        return [r.customerName, r.equipmentName || '', r.branch || '', price.toFixed(2), credited.toFixed(2), (r.balanceRemaining ?? (price - credited)).toFixed(2), `${pct}%`, r.purchaseOptionExpiry || ''];
      });
      downloadCSV(`rto-agreements-${branchLabel}-${date}.csv`, ['Customer', 'Equipment', 'Branch', 'Purchase Price', 'Credited', 'Remaining', 'Progress', 'Option Expiry'], rows);
    }
  };

  // Add print styles to disable headers/footers
  const printStyles = `
    @media print {
      @page {
        margin: 0.5in;
      }
      body {
        margin: 0;
      }
    }
  `;

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = printStyles;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <AppPageHeader
        title="Business Intelligence"
        icon={BarChart3}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={branch} onChange={e => setBranch(e.target.value)}
              className="bg-white/10 border border-white/20 text-white text-xs rounded-lg px-3 py-1.5">
              {branches.map(b => <option key={b} value={b} className="text-black">{b === 'all' ? 'All Branches' : b}</option>)}
            </select>
            {!loading && (
              <>
                <button onClick={handleExport} className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition text-xs font-medium border border-white/20">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition text-xs font-medium border border-white/20">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </>
            )}
            <button onClick={load} disabled={loading} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      >
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </AppPageHeader>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading report data…</span>
          </div>
        ) : (
          <>
            {activeTab === 'utilization' && <UtilizationTab rentals={filteredRentals} equipment={filteredEquipment} />}
            {activeTab === 'demand' && <DemandTab rentals={filteredRentals} />}
            {activeTab === 'aging' && <AgingTab equipment={filteredEquipment} />}
            {activeTab === 'health' && <HealthTab equipment={filteredEquipment} rentals={filteredRentals} />}
            {activeTab === 'rto' && <RtoTab rentals={rentals} equipment={equipment} />}
          </>
        )}
      </div>
    </div>
  );
}