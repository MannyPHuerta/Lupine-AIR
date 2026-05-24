import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, TrendingUp, DollarSign, Package, Users, Zap, Printer, Download, Filter, X } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#9333ea', '#e11d48', '#2563eb'];

const BRANCHES = ['01 McAllen','02 Weslaco','03 Harlingen','05 Brownsville','06 Corpus','98 Shop','99 Warehouse'];

function StatCard({ icon: IconComp, label, value, sub, color = 'text-indigo-700' }) {
  const Icon = IconComp;
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-lg shrink-0"><Icon className="w-5 h-5 text-gray-500" /></div>
      <div className="min-w-0">
        <div className={`text-xl font-bold truncate ${color}`}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="text-sm font-semibold text-gray-700 mb-4">{title}</div>
      {children}
    </div>
  );
}

function formatMonth(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
}

function handlePDFDownload(title, areaId) {
  const printContents = document.getElementById(areaId)?.innerHTML;
  if (!printContents) return;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:sans-serif;padding:24px;font-size:12px;}
    h1{font-size:18px;margin-bottom:8px;}
    table{width:100%;border-collapse:collapse;}
    th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e5e7eb;}
    th{background:#f9fafb;font-weight:600;}
    @media print{button{display:none;}}
    </style></head><body>
    <h1>${title}</h1><p style="color:#6b7280;margin-bottom:16px;">Generated ${new Date().toLocaleDateString()}</p>
    ${printContents}
    <script>window.onload=()=>{window.print();}<\/script>
    </body></html>`);
  win.document.close();
}

function computeStats(rentals) {
  const byMonth = {};
  const byEquipment = {};
  const byCustomer = {};
  const byBranch = {};
  let totalRevenue = 0;
  let durationSum = 0;
  let durationCount = 0;

  rentals.forEach(r => {
    totalRevenue += r.baseAmount || 0;
    if (r.totalDays) { durationSum += r.totalDays; durationCount++; }

    // Monthly
    if (r.startDate) {
      const month = r.startDate.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { month, rentals: 0, revenue: 0 };
      byMonth[month].rentals++;
      byMonth[month].revenue += r.baseAmount || 0;
    }

    // Equipment
    const eName = r.equipmentName || r.equipmentId;
    if (eName) {
      if (!byEquipment[eName]) byEquipment[eName] = { name: eName, rentals: 0, revenue: 0 };
      byEquipment[eName].rentals++;
      byEquipment[eName].revenue += r.baseAmount || 0;
    }

    // Customer
    if (r.customerName) {
      if (!byCustomer[r.customerName]) byCustomer[r.customerName] = { name: r.customerName, rentals: 0, revenue: 0 };
      byCustomer[r.customerName].rentals++;
      byCustomer[r.customerName].revenue += r.baseAmount || 0;
    }

    // Branch
    const branch = r.branch || 'Unknown';
    if (!byBranch[branch]) byBranch[branch] = { branch, rentals: 0, revenue: 0 };
    byBranch[branch].rentals++;
    byBranch[branch].revenue += r.baseAmount || 0;
  });

  const round = v => Math.round(v * 100) / 100;

  return {
    totalRevenue: round(totalRevenue),
    totalRentals: rentals.length,
    avgDuration: durationCount ? Math.round((durationSum / durationCount) * 10) / 10 : 0,
    monthlyTrend: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ ...m, revenue: round(m.revenue) })),
    topEquipment: Object.values(byEquipment).sort((a, b) => b.rentals - a.rentals).slice(0, 10).map(e => ({ ...e, revenue: round(e.revenue) })),
    topCustomers: Object.values(byCustomer).sort((a, b) => b.revenue - a.revenue).slice(0, 10).map(c => ({ ...c, revenue: round(c.revenue) })),
    branchBreakdown: Object.values(byBranch).sort((a, b) => b.revenue - a.revenue).map(b => ({ ...b, revenue: round(b.revenue) })),
  };
}

export default function DemandPatterns() {
  const navigate = useNavigate();
  const [allRentals, setAllRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiNarrative, setAiNarrative] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterEquipment, setFilterEquipment] = useState('');

  const load = () => {
    setLoading(true);
    base44.entities.Rental.list('-startDate', 2000)
      .then(rentals => setAllRentals(rentals.filter(r => r.status !== 'cancelled')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Derived filter options
  const customerOptions = useMemo(() => [...new Set(allRentals.map(r => r.customerName).filter(Boolean))].sort(), [allRentals]);
  const equipmentOptions = useMemo(() => [...new Set(allRentals.map(r => r.equipmentName || r.equipmentId).filter(Boolean))].sort(), [allRentals]);

  // Apply filters
  const filtered = useMemo(() => allRentals.filter(r => {
    if (dateFrom && r.startDate < dateFrom) return false;
    if (dateTo && r.startDate > dateTo) return false;
    if (filterCustomer && r.customerName !== filterCustomer) return false;
    if (filterBranch && r.branch !== filterBranch) return false;
    if (filterEquipment && (r.equipmentName || r.equipmentId) !== filterEquipment) return false;
    return true;
  }), [allRentals, dateFrom, dateTo, filterCustomer, filterBranch, filterEquipment]);

  const data = useMemo(() => computeStats(filtered), [filtered]);
  const monthlyFormatted = data.monthlyTrend.map(m => ({ ...m, label: formatMonth(m.month) }));

  const hasFilters = dateFrom || dateTo || filterCustomer || filterBranch || filterEquipment;

  const clearFilters = () => {
    setDateFrom(''); setDateTo(''); setFilterCustomer(''); setFilterBranch(''); setFilterEquipment('');
  };

  const generateAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.functions.invoke('demandPatterns', {});
      setAiNarrative(res.data?.aiNarrative || '');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && allRentals.length > 0 && !aiNarrative) generateAI();
  }, [loading]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Demand Patterns"
        subtitle="AI-powered rental intelligence"
        icon={TrendingUp}
        backTo="/lupine"
        action={
          <div className="flex items-center gap-1">
            <button onClick={() => window.print()} disabled={loading} className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-40"><Printer className="w-4 h-4" /></button>
            <button onClick={() => handlePDFDownload('Customer Demand Patterns', 'printable-area')} disabled={loading} className="p-2 rounded-lg hover:bg-white/10 text-white disabled:opacity-40"><Download className="w-4 h-4" /></button>
            <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-white/10 text-white"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        }
      />

      {/* Filters Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" title="From date" />
          <span className="text-gray-400 text-sm">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" title="To date" />

          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none max-w-48">
            <option value="">All Customers</option>
            {customerOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filterEquipment} onChange={e => setFilterEquipment(e.target.value)} className="border rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none max-w-48">
            <option value="">All Equipment</option>
            {equipmentOptions.map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-2 py-1.5 bg-red-50">
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          {hasFilters && (
            <span className="text-xs text-gray-500 ml-1">{filtered.length} of {allRentals.length} rentals</span>
          )}
        </div>
      </div>

      <div id="printable-area" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-500">Loading rental data…</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={DollarSign} label="Total Revenue"  value={`$${data.totalRevenue.toLocaleString()}`} color="text-indigo-700" />
              <StatCard icon={Package}   label="Total Rentals"   value={data.totalRentals} color="text-indigo-700" />
              <StatCard icon={TrendingUp} label="Avg Duration"   value={`${data.avgDuration}d`} sub="per rental" color="text-indigo-700" />
              <StatCard icon={Users}      label="Top Branch"     value={data.branchBreakdown?.[0]?.branch || '—'} color="text-indigo-700" />
            </div>

            {/* AI Narrative */}
            {(aiNarrative || aiLoading) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-800">AI Business Intelligence Summary</span>
                  {aiLoading && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
                </div>
                {aiNarrative && <p className="text-sm text-gray-700 leading-relaxed">{aiNarrative}</p>}
              </div>
            )}

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Monthly Revenue Trend">
                {monthlyFormatted.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyFormatted}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Monthly Rental Volume">
                {monthlyFormatted.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyFormatted}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={v => [v, 'Rentals']} />
                      <Bar dataKey="rentals" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Top 10 Equipment by Demand">
                {data.topEquipment.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.topEquipment} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={v => [v, 'Rentals']} />
                      <Bar dataKey="rentals" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Revenue by Branch">
                {data.branchBreakdown.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={data.branchBreakdown} dataKey="revenue" nameKey="branch" cx="50%" cy="50%" outerRadius={100}
                        label={({ branch, percent }) => `${branch} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {data.branchBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Top Customers Table */}
            <ChartCard title="Top 10 Customers by Revenue">
              {data.topCustomers.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="text-left pb-2">Customer</th>
                        <th className="text-center pb-2">Rentals</th>
                        <th className="text-right pb-2">Revenue</th>
                        <th className="text-right pb-2">Avg/Rental</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCustomers.map((c, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-900">{c.name}</td>
                          <td className="py-2 text-center text-gray-500">{c.rentals}</td>
                          <td className="py-2 text-right font-semibold text-indigo-700">${c.revenue.toLocaleString()}</td>
                          <td className="py-2 text-right text-gray-500">${Math.round(c.revenue / c.rentals).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}