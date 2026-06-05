import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];
const CATEGORIES = ['All Categories', 'Office Supplies', 'Safety & PPE', 'Cleaning', 'Uniforms', 'Fuel', 'Breakroom', 'Technology', 'Printing', 'Maintenance', 'Other'];
const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#64748b'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SpendAnalytics() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('All Branches');
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    base44.entities.PurchaseOrder.list('-created_date', 1000).then(orders => {
      setPos(orders.filter(o => ['received', 'closed', 'submitted', 'ordered', 'partially_received'].includes(o.status)));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => pos.filter(po => {
    const branchMatch = filterBranch === 'All Branches' || po.branch === filterBranch;
    const yearMatch = !filterYear || (po.created_date || '').startsWith(filterYear);
    const catMatch = filterCategory === 'All Categories' || (po.lineItems || []).some(l => l.category === filterCategory);
    return branchMatch && yearMatch && catMatch;
  }), [pos, filterBranch, filterYear, filterCategory]);

  const totalSpend = filtered.reduce((s, po) => s + (po.totalAmount || 0), 0);

  // Monthly spend
  const monthlyData = useMemo(() => {
    const map = {};
    filtered.forEach(po => {
      const date = new Date(po.created_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + (po.totalAmount || 0);
    });
    return MONTHS.map((m, i) => ({
      month: m,
      spend: map[`${filterYear}-${String(i + 1).padStart(2, '0')}`] || 0,
    }));
  }, [filtered, filterYear]);

  // By branch
  const branchData = useMemo(() => {
    const map = {};
    filtered.forEach(po => { map[po.branch] = (map[po.branch] || 0) + (po.totalAmount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // By category
  const categoryData = useMemo(() => {
    const map = {};
    filtered.forEach(po => {
      (po.lineItems || []).forEach(l => {
        const cat = l.category || 'Other';
        map[cat] = (map[cat] || 0) + (l.lineTotal || 0);
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // By vendor
  const vendorData = useMemo(() => {
    const map = {};
    filtered.forEach(po => {
      map[po.vendorName] = (map[po.vendorName] || 0) + (po.totalAmount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  // Fraud intel
  const fraudAlerts = useMemo(() => {
    const alerts = [];
    // Split POs: same vendor, same branch, same day, multiple POs
    const byVendorBranchDay = {};
    pos.forEach(po => {
      const day = (po.created_date || '').split('T')[0];
      const key = `${po.vendorId}-${po.branch}-${day}`;
      byVendorBranchDay[key] = byVendorBranchDay[key] || [];
      byVendorBranchDay[key].push(po);
    });
    Object.values(byVendorBranchDay).forEach(group => {
      if (group.length >= 2) {
        alerts.push({ type: 'Split PO', severity: 'high', detail: `${group.length} POs to ${group[0].vendorName} from ${group[0].branch} on same day`, pos: group.map(p => p.poNumber || p.id) });
      }
    });

    // Vendor concentration: one vendor > 60% of spend
    const totalAll = pos.reduce((s, p) => s + (p.totalAmount || 0), 0);
    vendorData.forEach(v => {
      if (totalAll > 0 && v.value / totalAll > 0.6) {
        alerts.push({ type: 'Vendor Concentration', severity: 'medium', detail: `${v.name} accounts for ${Math.round(v.value / totalAll * 100)}% of all spend` });
      }
    });

    // Price creep: same item, unit price increased > 20% between orders
    const itemPrices = {};
    pos.forEach(po => {
      (po.lineItems || []).forEach(l => {
        if (l.supplyItemId && l.unitPrice) {
          itemPrices[l.supplyItemId] = itemPrices[l.supplyItemId] || [];
          itemPrices[l.supplyItemId].push({ price: l.unitPrice, date: po.created_date, item: l.itemName, po: po.poNumber || po.id });
        }
      });
    });
    Object.values(itemPrices).forEach(prices => {
      prices.sort((a, b) => new Date(a.date) - new Date(b.date));
      for (let i = 1; i < prices.length; i++) {
        const increase = (prices[i].price - prices[i - 1].price) / prices[i - 1].price;
        if (increase > 0.2) {
          alerts.push({ type: 'Price Creep', severity: 'medium', detail: `${prices[i].item}: price increased ${Math.round(increase * 100)}% on ${prices[i].po}` });
        }
      }
    });

    return alerts;
  }, [pos, vendorData]);

  const years = useMemo(() => {
    const ys = new Set(pos.map(p => (p.created_date || '').split('-')[0]).filter(Boolean));
    return [...ys].sort().reverse();
  }, [pos]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader title="Spend Analytics" subtitle="Procurement spend by branch, category & time" />
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            {years.map(y => <option key={y}>{y}</option>)}
            {years.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border rounded-xl p-1 w-fit">
          {[['overview', 'Overview'], ['vendor', 'By Vendor'], ['fraud', 'Fraud Intel']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setActiveTab(val)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === val ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {val === 'fraud' && fraudAlerts.length > 0 && <span className="mr-1 text-red-400">⚠️</span>}
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Spend', value: `$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                { label: 'Orders', value: filtered.length },
                { label: 'Vendors Used', value: new Set(filtered.map(p => p.vendorId)).size },
                { label: 'Fraud Alerts', value: fraudAlerts.length, highlight: fraudAlerts.length > 0 },
              ].map(kpi => (
                <div key={kpi.label} className={`bg-white border rounded-xl p-4 ${kpi.highlight ? 'border-red-300' : ''}`}>
                  <div className="text-xs text-gray-500">{kpi.label}</div>
                  <div className={`text-xl font-bold mt-1 ${kpi.highlight ? 'text-red-600' : 'text-gray-900'}`}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly spend bar chart */}
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Monthly Spend {filterYear}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                      <Tooltip formatter={v => [`$${v.toFixed(2)}`, 'Spend']} />
                      <Bar dataKey="spend" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Category pie */}
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4">Spend by Category</h3>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => [`$${v.toFixed(2)}`]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="text-center text-gray-400 py-12 text-sm">No data</div>}
                </div>

                {/* Branch breakdown */}
                <div className="bg-white border rounded-xl p-5 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Spend by Branch</h3>
                  <div className="space-y-2">
                    {branchData.map(b => (
                      <div key={b.name} className="flex items-center gap-3">
                        <div className="w-32 text-xs text-gray-600 truncate">{b.name}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${totalSpend > 0 ? (b.value / totalSpend * 100) : 0}%` }} />
                        </div>
                        <div className="w-20 text-xs text-right font-medium text-gray-700">${b.value.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'vendor' && (
              <div className="bg-white border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Top Vendors by Spend</h3>
                <div className="space-y-2">
                  {vendorData.length === 0 ? (
                    <div className="text-center text-gray-400 py-12 text-sm">No vendor data yet.</div>
                  ) : vendorData.map((v, i) => (
                    <div key={v.name} className="flex items-center gap-3">
                      <div className="w-6 text-xs text-gray-400 text-right">{i + 1}.</div>
                      <div className="flex-1 text-sm text-gray-700 truncate">{v.name}</div>
                      <div className="w-48 bg-gray-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${totalSpend > 0 ? (v.value / totalSpend * 100) : 0}%` }} />
                      </div>
                      <div className="w-24 text-xs text-right font-semibold text-gray-800">${v.value.toFixed(2)}</div>
                      <div className="w-10 text-xs text-right text-gray-400">{totalSpend > 0 ? Math.round(v.value / totalSpend * 100) : 0}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'fraud' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Procurement Fraud Intelligence
                </div>
                {fraudAlerts.length === 0 ? (
                  <div className="bg-white border border-green-200 rounded-xl p-6 text-center">
                    <div className="text-green-600 font-medium">No anomalies detected</div>
                    <div className="text-xs text-gray-400 mt-1">All procurement patterns look normal.</div>
                  </div>
                ) : fraudAlerts.map((alert, i) => (
                  <div key={i} className={`bg-white border rounded-xl p-4 flex items-start gap-3 ${alert.severity === 'high' ? 'border-red-300' : 'border-amber-300'}`}>
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <div className="font-semibold text-sm text-gray-800">{alert.type}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{alert.detail}</div>
                      {alert.pos && <div className="text-xs text-gray-400 mt-0.5">POs: {alert.pos.join(', ')}</div>}
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${alert.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}