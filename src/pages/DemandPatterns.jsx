import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCw, TrendingUp, DollarSign, Package, Users, Zap } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#9333ea', '#e11d48', '#2563eb'];

function StatCard({ icon: IconComp, label, value, sub, color = 'text-indigo-700' }) {
  const Icon = IconComp;
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <div className="p-2 bg-gray-50 rounded-lg shrink-0">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
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
  const date = new Date(parseInt(y), parseInt(mo) - 1);
  return date.toLocaleString('default', { month: 'short', year: '2-digit' });
}

export default function DemandPatterns() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.functions.invoke('demandPatterns', {})
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const monthlyFormatted = (data?.monthlyTrend || []).map(m => ({
    ...m,
    label: formatMonth(m.month),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/lupine')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Customer Demand Patterns</div>
            <div className="text-indigo-300 text-xs">AI-powered rental intelligence</div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="ml-auto p-2 rounded-lg hover:bg-indigo-800 text-indigo-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-500">Analyzing rental patterns + generating AI insights…</p>
          </div>
        ) : !data ? (
          <div className="text-center py-24 text-gray-400">No data available.</div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={DollarSign} label="Total Revenue" value={`$${data.totalRevenue.toLocaleString()}`} color="text-indigo-700" />
              <StatCard icon={Package}   label="Total Rentals"  value={data.totalRentals} color="text-indigo-700" />
              <StatCard icon={TrendingUp} label="Avg Duration"  value={`${data.avgDuration}d`} sub="per rental" color="text-indigo-700" />
              <StatCard icon={Users}      label="Top Branch"    value={data.branchBreakdown?.[0]?.branch || '—'} color="text-indigo-700" />
            </div>

            {/* AI Narrative */}
            {data.aiNarrative && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-800">AI Business Intelligence Summary</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{data.aiNarrative}</p>
              </div>
            )}

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Monthly Revenue Trend">
                {monthlyFormatted.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
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
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
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
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
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
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={data.branchBreakdown}
                        dataKey="revenue"
                        nameKey="branch"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ branch, percent }) => `${branch} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {data.branchBreakdown.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
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
                <div className="py-8 text-center text-gray-400 text-sm">No data yet</div>
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