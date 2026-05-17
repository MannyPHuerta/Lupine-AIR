import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, BarChart3, TrendingUp, Package, AlertTriangle, RefreshCw, Loader2, Download, Printer } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const TABS = [
  { id: 'utilization', label: 'Utilization', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'demand', label: 'Demand Trends', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'aging', label: 'Asset Aging', icon: <Package className="w-4 h-4" /> },
  { id: 'health', label: 'Fleet Health', icon: <AlertTriangle className="w-4 h-4" /> },
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
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-black border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => navigate('/lupine')} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69deb9b2f06f1355a056f8e0/6aafe877e_AIReports_final.svg" alt="AIReports" className="h-8 w-8 rounded-lg" />
            <div>
              <div className="text-white font-bold text-sm leading-none">AIReports</div>
              <div className="text-white/40 text-xs">Business Intelligence</div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>
              ))}
            </select>
            {!loading && (
              <>
                <button
                  onClick={handleExport}
                  title="Export CSV"
                  className="flex items-center gap-1.5 text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition text-xs font-medium border border-white/10"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={() => window.print()}
                  title="Print / Save PDF"
                  className="flex items-center gap-1.5 text-white/70 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition text-xs font-medium border border-white/10"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </>
            )}
            <button onClick={load} disabled={loading}
              className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

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
          </>
        )}
      </div>
    </div>
  );
}