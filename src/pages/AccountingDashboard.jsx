import { useState, useEffect, useMemo } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Download, Loader2, BarChart2, FileText, Receipt, Brain, TrendingDown
} from 'lucide-react';
import { calculateDepreciation } from '@/lib/depreciation';
import AppPageHeader from '@/components/AppPageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InvoiceDrawer from '@/components/accounting/InvoiceDrawer';
import ProfitLossStatement from '@/components/accounting/ProfitLossStatement';
import ExpenseLog from '@/components/accounting/ExpenseLog';
import JobProfitLoss from '@/components/accounting/JobProfitLoss';
import SpendAnalyst from '@/components/accounting/SpendAnalyst';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];
const CAPITALIZATION_THRESHOLD = 2500;

const QB_ACCOUNTS = {
  rentalIncome: 'Rental Income',
  deliveryIncome: 'Delivery Income',
  lateFeeIncome: 'Late Fee Income',
  extraShiftIncome: 'Extra Shift Income',
  hourMeterIncome: 'Hour Meter Income',
  subrentMarkupIncome: 'Subrent Markup Income',
  salesTaxPayable: 'Sales Tax Payable',
  customerDeposits: 'Customer Deposits',
  accountsReceivable: 'Accounts Receivable',
  unappliedCash: 'Undeposited Funds',
};

function fmt(n) { return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function StatCard({ label, value, sub, color = 'text-emerald-700' }) {
  return (
    <div className="bg-white border rounded-lg p-5 shadow-sm">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function generateIIF(rentals) {
  const lines = [];
  lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO');
  lines.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO');
  lines.push('!ENDTRNS');
  rentals.forEach(r => {
    if (!r.invoiceNumber || !r.customerName) return;
    const date = r.startDate || r.created_date?.split('T')[0] || '';
    const base = r.baseAmount || 0;
    const tax = r.taxAmount || 0;
    const delivery = (r.deliveryFee || 0) + (r.returnFee || 0);
    const extras = (r.lateFeeTotal || 0) + (r.extraShiftTotal || 0) + (r.hourMeterCharges || 0) + (r.subrentMarkup || 0);
    const total = base + tax + delivery + extras;
    const paid = r.amountPaid || 0;
    const deposit = r.deposit || 0;
    if (total <= 0) return;
    lines.push(`TRNS\tINVOICE\t${date}\t${QB_ACCOUNTS.accountsReceivable}\t${r.customerName}\t${total.toFixed(2)}\t${r.invoiceNumber}\t`);
    if (base > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.rentalIncome}\t${r.customerName}\t-${base.toFixed(2)}\tRental`);
    if (delivery > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.deliveryIncome}\t${r.customerName}\t-${delivery.toFixed(2)}\tDelivery`);
    if (r.lateFeeTotal > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.lateFeeIncome}\t${r.customerName}\t-${r.lateFeeTotal.toFixed(2)}\tLate Fees`);
    if (r.extraShiftTotal > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.extraShiftIncome}\t${r.customerName}\t-${r.extraShiftTotal.toFixed(2)}\tExtra Shifts`);
    if (r.hourMeterCharges > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.hourMeterIncome}\t${r.customerName}\t-${r.hourMeterCharges.toFixed(2)}\tHour Meter`);
    if (r.subrentMarkup > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.subrentMarkupIncome}\t${r.customerName}\t-${r.subrentMarkup.toFixed(2)}\tSubrent Markup`);
    if (tax > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.salesTaxPayable}\t${r.customerName}\t-${tax.toFixed(2)}\tSales Tax`);
    lines.push('ENDTRNS');
    if (deposit > 0) {
      lines.push(`TRNS\tRECEIPT\t${date}\t${QB_ACCOUNTS.unappliedCash}\t${r.customerName}\t${deposit.toFixed(2)}\t${r.invoiceNumber}-DEP\tSecurity Deposit`);
      lines.push(`SPL\tRECEIPT\t${date}\t${QB_ACCOUNTS.customerDeposits}\t${r.customerName}\t-${deposit.toFixed(2)}\tDeposit`);
      lines.push('ENDTRNS');
    }
    if (paid > 0) {
      lines.push(`TRNS\tRECEIPT\t${date}\t${QB_ACCOUNTS.unappliedCash}\t${r.customerName}\t${paid.toFixed(2)}\t${r.invoiceNumber}-PMT\tPayment`);
      lines.push(`SPL\tRECEIPT\t${date}\t${QB_ACCOUNTS.accountsReceivable}\t${r.customerName}\t-${paid.toFixed(2)}\tPayment`);
      lines.push('ENDTRNS');
    }
  });
  return lines.join('\n');
}

function downloadIIF(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function calcPL(rentals) {
  const completed = rentals.filter(r => ['completed', 'returned', 'out', 'contract'].includes(r.status));
  const rentalRevenue = completed.reduce((s, r) => s + (r.baseAmount || 0), 0);
  const deliveryRevenue = completed.reduce((s, r) => s + (r.deliveryFee || 0) + (r.returnFee || 0), 0);
  const taxCollected = completed.reduce((s, r) => s + (r.taxAmount || 0), 0);
  const depositsHeld = completed.reduce((s, r) => s + (r.deposit || 0), 0);
  const amountPaid = completed.reduce((s, r) => s + (r.amountPaid || 0), 0);
  const outstanding = completed.reduce((s, r) => {
    const total = (r.baseAmount || 0) + (r.taxAmount || 0) + (r.deliveryFee || 0) + (r.returnFee || 0);
    return s + Math.max(0, total - (r.amountPaid || 0));
  }, 0);
  return { rentalRevenue, deliveryRevenue, taxCollected, depositsHeld, amountPaid, outstanding, totalRevenue: rentalRevenue + deliveryRevenue };
}

function buildMonthlyData(rentals) {
  const map = {};
  rentals.forEach(r => {
    if (!r.startDate) return;
    const mo = r.startDate.slice(0, 7);
    if (!map[mo]) map[mo] = { month: mo, revenue: 0, tax: 0, delivery: 0 };
    map[mo].revenue += r.baseAmount || 0;
    map[mo].tax += r.taxAmount || 0;
    map[mo].delivery += (r.deliveryFee || 0) + (r.returnFee || 0);
  });
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)
    .map(d => ({
      ...d,
      month: new Date(d.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    }));
}

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-gray-400 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: ${p.value?.toLocaleString()}</div>
      ))}
    </div>
  );
};

const TABS = [
  { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'pl', label: 'P&L Statement', icon: <FileText className="w-4 h-4" /> },
  { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
  { id: 'jobpl', label: 'Job P&L', icon: <FileText className="w-4 h-4" /> },
  { id: 'ai_analyst', label: 'AI Spend Analyst', icon: <Brain className="w-4 h-4" /> },
  { id: 'depreciation', label: 'Depreciation', icon: <TrendingDown className="w-4 h-4" /> },
];

function DepreciationInline({ equipment }) {
  const [search, setSearch] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('all');

  const depreciable = equipment.filter(e => e.purchaseCost && e.usefulLifeYears);

  const depreciated = useMemo(() => {
    const asOf = new Date(asOfDate);
    return depreciable
      .map(eq => ({ ...eq, depreciation: calculateDepreciation(eq, asOf) }))
      .filter(eq => {
        const matchSearch = !search ||
          eq.name.toLowerCase().includes(search.toLowerCase()) ||
          eq.assetNumber?.toLowerCase().includes(search.toLowerCase());
        const matchCategory = filterCategory === 'all' || eq.category === filterCategory;
        return matchSearch && matchCategory;
      })
      .sort((a, b) => (b.depreciation?.totalDepreciation || 0) - (a.depreciation?.totalDepreciation || 0));
  }, [depreciable, search, asOfDate, filterCategory]);

  const categories = useMemo(() => [...new Set(depreciable.map(e => e.category).filter(Boolean))].sort(), [depreciable]);

  const totals = useMemo(() => depreciated.reduce((sum, eq) => ({
    costBasis: sum.costBasis + (eq.purchaseCost || 0),
    totalDepreciation: sum.totalDepreciation + (eq.depreciation?.totalDepreciation || 0),
    bookValue: sum.bookValue + (eq.depreciation?.bookValue || 0),
  }), { costBasis: 0, totalDepreciation: 0, bookValue: 0 }), [depreciated]);

  const handleExport = () => {
    const csv = [
      ['Asset', 'Category', 'Asset #', 'Cost', 'Method', 'Useful Life', 'Years Elapsed', 'Depreciation', 'Book Value', '%'],
      ...depreciated.map(eq => [
        eq.name, eq.category, eq.assetNumber || '-',
        `$${eq.purchaseCost.toFixed(2)}`,
        eq.depreciation?.depreciationMethod === 'declining_balance' ? 'DDB' : 'SL',
        eq.usefulLifeYears, eq.depreciation?.yearsElapsed || 0,
        `$${eq.depreciation?.totalDepreciation.toFixed(2)}`,
        `$${eq.depreciation?.bookValue.toFixed(2)}`,
        `${eq.depreciation?.depreciationPercentage}%`,
      ]),
    ].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `depreciation-${asOfDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-gray-600 block mb-1">As Of Date</label>
          <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white" />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-gray-600 block mb-1">Search</label>
          <input placeholder="Name or asset #..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white" />
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white">
            <option value="all">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-lg" style={{ backgroundColor: '#F5A623' }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="text-xs text-gray-500 font-medium mb-1">Total Cost Basis</div>
          <div className="text-2xl font-bold text-gray-900">${totals.costBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-1">{depreciated.length} assets</div>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="text-xs text-gray-500 font-medium mb-1">Total Depreciation</div>
          <div className="text-2xl font-bold text-red-600">${totals.totalDepreciation.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-1">{totals.costBasis > 0 ? ((totals.totalDepreciation / totals.costBasis) * 100).toFixed(1) : 0}% of cost</div>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="text-xs text-gray-500 font-medium mb-1">Total Book Value</div>
          <div className="text-2xl font-bold text-green-600">${totals.bookValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-gray-400 mt-1">as of {asOfDate}</div>
        </div>
      </div>

      {depreciated.length === 0 ? (
        <div className="text-center text-gray-400 py-16 text-sm bg-white rounded-lg border">No equipment with depreciation configured</div>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                {['Asset', 'Category', 'Asset #', 'Cost', 'Method', 'Years', 'Depreciation', 'Book Value', '%'].map(h => (
                  <th key={h} className={`px-4 py-2 font-semibold text-gray-700 ${['Cost','Years','Depreciation','Book Value','%'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {depreciated.map(eq => (
                <tr key={eq.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 text-gray-900 font-medium">{eq.name}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{eq.category}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{eq.assetNumber || '-'}</td>
                  <td className="px-4 py-2 text-right text-gray-900 font-medium">${eq.purchaseCost.toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{eq.depreciation?.depreciationMethod === 'declining_balance' ? 'DDB' : 'SL'}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{eq.depreciation?.yearsElapsed.toFixed(1)} / {eq.usefulLifeYears}</td>
                  <td className="px-4 py-2 text-right text-red-600 font-medium">${eq.depreciation?.totalDepreciation.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-green-600 font-medium">${eq.depreciation?.bookValue.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right text-gray-600 text-xs">{eq.depreciation?.depreciationPercentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useAuth } from '@/lib/AuthContext';

export default function AccountingDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('All Branches');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const load = async () => {
    setLoading(true);
    try {
      const [r, exp, eq, ts] = await Promise.all([
        supabaseData.Rental.list('-start_date', 2000),
        supabaseData.Expense.list('-date', 2000),
        supabaseData.Equipment.list('-created_at', 500),
        supabaseData.Timesheet.list('-work_date', 2000),
      ]);
      setRentals(r);
      setExpenses(exp);
      setEquipment(eq);
      setTimesheets(ts);
    } catch (err) {
      console.error('[AccountingDashboard] Failed to load:', err);
    }
    setLoading(false);
  };

  const loadExpenses = async () => {
    try {
      const exp = await supabaseData.Expense.list('-date', 2000);
      setExpenses(exp);
    } catch (err) {
      console.error('[AccountingDashboard] Failed to load expenses:', err);
    }
  };

  useEffect(() => { load(); }, []);

  const hasAccess = user?.role === 'admin' || user?.role === 'accountant' || user?.role === 'manager' || user?.role === 'owner';

  const filtered = useMemo(() => rentals.filter(r => {
    const d = r.startDate || '';
    const branchMatch = branch === 'All Branches' || r.branch === branch;
    const dateMatch = (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
    return branchMatch && dateMatch && r.status !== 'cancelled' && r.status !== 'quote';
  }), [rentals, branch, dateFrom, dateTo]);

  const filteredExpenses = useMemo(() => expenses.filter(e => {
    const branchMatch = branch === 'All Branches' || e.branch === branch;
    const dateMatch = (!dateFrom || e.date >= dateFrom) && (!dateTo || e.date <= dateTo);
    return branchMatch && dateMatch;
  }), [expenses, branch, dateFrom, dateTo]);

  const filteredEquipment = useMemo(() =>
    branch === 'All Branches' ? equipment : equipment.filter(e => e.location === branch),
    [equipment, branch]
  );

  const pl = useMemo(() => calcPL(filtered), [filtered]);
  const monthlyData = useMemo(() => buildMonthlyData(filtered), [filtered]);

  const handleExport = () => {
    setExporting(true);
    const iif = generateIIF(filtered);
    const label = branch === 'All Branches' ? 'all' : branch.replace(' ', '_');
    downloadIIF(iif, `rental_world_${label}_${dateFrom}_${dateTo}.iif`);
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-500">
        <div className="text-4xl">🔒</div>
        <div className="text-lg font-semibold">Accounting access required</div>
        <div className="text-sm">Contact your administrator.</div>
        <button onClick={() => navigate(-1)} className="text-sm text-emerald-600 underline">Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Accounting"
        subtitle="Financial summary & QB export"
        backTo="/manager"
        icon={BarChart2}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={branch} onChange={e => setBranch(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs">
              {BRANCHES.map(b => <option key={b} value={b} className="text-black">{b}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs" />
            <span className="text-white/60 text-xs">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs" />
            <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/10 text-white"><RefreshCw className="w-4 h-4" /></button>
          </div>
        }
      >
        <div className="flex gap-1 overflow-x-auto -mb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition"
              style={{ borderBottomColor: activeTab === tab.id ? '#F5A623' : 'transparent', color: activeTab === tab.id ? '#F5A623' : 'rgba(255,255,255,0.5)' }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </AppPageHeader>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Revenue Summary</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Rental Revenue" value={fmt(pl.rentalRevenue)} color="text-emerald-700" />
                <StatCard label="Delivery Revenue" value={fmt(pl.deliveryRevenue)} color="text-blue-700" />
                <StatCard label="Total Revenue" value={fmt(pl.totalRevenue)} color="text-indigo-700" sub="rental + delivery" />
                <StatCard label="Tax Collected" value={fmt(pl.taxCollected)} color="text-amber-700" sub="sales tax payable" />
                <StatCard label="Deposits Held" value={fmt(pl.depositsHeld)} color="text-purple-700" sub="liability" />
                <StatCard label="Outstanding A/R" value={fmt(pl.outstanding)} color={pl.outstanding > 0 ? 'text-red-600' : 'text-gray-500'} sub="unpaid invoices" />
              </div>
            </div>

            <div className="bg-white border rounded-lg shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue (last 12 months)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="revenue" name="Rental" fill="#059669" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="delivery" name="Delivery" fill="#3b82f6" radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white border rounded-lg shadow-sm p-6">
              <div className="text-sm font-semibold text-gray-900 mb-4">Tax Summary</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="pb-2 pr-4">Branch</th>
                      <th className="pb-2 pr-4 text-right">Taxable Sales</th>
                      <th className="pb-2 pr-4 text-right">Tax Rate</th>
                      <th className="pb-2 text-right">Tax Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.from(new Set(filtered.filter(r => r.branch).map(r => r.branch))).sort().map(b => {
                      const br = filtered.filter(r => r.branch === b);
                      const taxable = br.reduce((s, r) => s + (r.baseAmount || 0), 0);
                      const tax = br.reduce((s, r) => s + (r.taxAmount || 0), 0);
                      const rate = taxable > 0 ? ((tax / taxable) * 100).toFixed(2) : '—';
                      return (
                        <tr key={b} className="hover:bg-gray-50">
                          <td className="py-2 pr-4 font-medium text-gray-900">{b}</td>
                          <td className="py-2 pr-4 text-right text-gray-700">{fmt(taxable)}</td>
                          <td className="py-2 pr-4 text-right text-gray-500">{rate !== '—' ? `${rate}%` : '—'}</td>
                          <td className="py-2 text-right font-semibold text-amber-700">{fmt(tax)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t font-bold">
                      <td className="py-2 pr-4 text-gray-900">Total</td>
                      <td className="py-2 pr-4 text-right text-gray-900">{fmt(filtered.reduce((s, r) => s + (r.baseAmount || 0), 0))}</td>
                      <td className="py-2 pr-4" />
                      <td className="py-2 text-right text-amber-700">{fmt(pl.taxCollected)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <div className="font-semibold text-gray-900 text-sm">Transactions ({filtered.length})</div>
                <button onClick={handleExport} disabled={exporting || filtered.length === 0}
                  className="flex items-center gap-2 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition" style={{ backgroundColor: '#F5A623' }}>
                  <Download className="w-3.5 h-3.5" />
                  {exporting ? 'Generating…' : 'Export to QuickBooks (.IIF)'}
                </button>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-2 font-medium">Invoice #</th>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Customer</th>
                      <th className="px-4 py-2 font-medium">Branch</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium text-right">Base</th>
                      <th className="px-4 py-2 font-medium text-right">Tax</th>
                      <th className="px-4 py-2 font-medium text-right">Delivery</th>
                      <th className="px-4 py-2 font-medium text-right">Paid</th>
                      <th className="px-4 py-2 font-medium text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.slice(0, 200).map(r => {
                      const total = (r.baseAmount || 0) + (r.taxAmount || 0) + (r.deliveryFee || 0) + (r.returnFee || 0);
                      const balance = total - (r.amountPaid || 0);
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <button onClick={() => setSelectedRental(r)}
                              className="font-mono text-indigo-700 font-medium hover:text-indigo-900 hover:underline underline-offset-2 transition">
                              {r.invoiceNumber || '—'}
                            </button>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{r.startDate || '—'}</td>
                          <td className="px-4 py-2 font-medium text-gray-900">{r.customerName}</td>
                          <td className="px-4 py-2 text-gray-500">{r.branch || '—'}</td>
                          <td className="px-4 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              r.status === 'completed' ? 'bg-green-100 text-green-700' :
                              r.status === 'out' ? 'bg-blue-100 text-blue-700' :
                              r.status === 'returned' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-2 text-right text-gray-700">{fmt(r.baseAmount)}</td>
                          <td className="px-4 py-2 text-right text-amber-700">{fmt(r.taxAmount)}</td>
                          <td className="px-4 py-2 text-right text-blue-700">{fmt((r.deliveryFee || 0) + (r.returnFee || 0))}</td>
                          <td className="px-4 py-2 text-right text-green-700">{fmt(r.amountPaid)}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>{fmt(balance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 200 && (
                  <div className="text-center text-xs text-gray-400 py-3">Showing first 200 of {filtered.length} — narrow the date range to see all</div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <div className="font-semibold mb-1">QuickBooks Account Names (defaults)</div>
              <div className="text-xs space-y-0.5 text-amber-700">
                {Object.entries(QB_ACCOUNTS).map(([k, v]) => (
                  <div key={k}><span className="font-medium">{k}:</span> "{v}"</div>
                ))}
              </div>
              <div className="mt-2 text-xs text-amber-600">These must match the exact account names in your QB Desktop file. Add any missing accounts in QB before importing.</div>
            </div>
          </>
        )}

        {/* ── P&L TAB ── */}
        {activeTab === 'pl' && (
          <ProfitLossStatement
            rentals={filtered}
            expenses={filteredExpenses}
            equipment={filteredEquipment}
            dateFrom={dateFrom}
            dateTo={dateTo}
            branch={branch}
            capitalizationThreshold={CAPITALIZATION_THRESHOLD}
          />
        )}

        {/* ── EXPENSES TAB ── */}
        {activeTab === 'expenses' && (
          <ExpenseLog
            expenses={filteredExpenses}
            onRefresh={loadExpenses}
            capitalizationThreshold={CAPITALIZATION_THRESHOLD}
          />
        )}

        {/* ── JOB P&L TAB ── */}
        {activeTab === 'jobpl' && (
          <JobProfitLoss
            rentals={filtered}
            timesheets={timesheets.filter(t => {
              const branchMatch = branch === 'All Branches' || t.branch === branch;
              const dateMatch = (!dateFrom || t.workDate >= dateFrom) && (!dateTo || t.workDate <= dateTo);
              return branchMatch && dateMatch;
            })}
            expenses={filteredExpenses}
          />
        )}

        {/* ── AI SPEND ANALYST TAB ── */}
        {activeTab === 'ai_analyst' && (
          <SpendAnalyst
            expenses={filteredExpenses}
            rentals={filtered}
            timesheets={timesheets}
            dateFrom={dateFrom}
            dateTo={dateTo}
            branch={branch}
          />
        )}

        {/* ── DEPRECIATION TAB ── */}
        {activeTab === 'depreciation' && (
          <DepreciationInline equipment={filteredEquipment} />
        )}

      </div>

      {/* Invoice Drawer */}
      <InvoiceDrawer rental={selectedRental} onClose={() => setSelectedRental(null)} />
    </div>
  );
}