import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Download, Loader2, DollarSign, TrendingUp, FileText, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];

// Default QB Desktop account names — can be remapped later
const QB_ACCOUNTS = {
  rentalIncome: 'Rental Income',
  deliveryIncome: 'Delivery Income',
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

// ── IIF Generator ──────────────────────────────────────────────────────────
function generateIIF(rentals) {
  const lines = [];

  // Header
  lines.push('!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tDOCNUM\tMEMO');
  lines.push('!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO');
  lines.push('!ENDTRNS');

  rentals.forEach(r => {
    if (!r.invoiceNumber || !r.customerName) return;
    const date = r.startDate || r.created_date?.split('T')[0] || '';
    const base = r.baseAmount || 0;
    const tax = r.taxAmount || 0;
    const delivery = (r.deliveryFee || 0) + (r.returnFee || 0);
    const total = base + tax + delivery;
    const paid = r.amountPaid || 0;
    const deposit = r.deposit || 0;

    if (total <= 0) return;

    // Invoice transaction
    lines.push(`TRNS\tINVOICE\t${date}\t${QB_ACCOUNTS.accountsReceivable}\t${r.customerName}\t${total.toFixed(2)}\t${r.invoiceNumber}\t`);
    if (base > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.rentalIncome}\t${r.customerName}\t-${base.toFixed(2)}\tRental`);
    if (delivery > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.deliveryIncome}\t${r.customerName}\t-${delivery.toFixed(2)}\tDelivery`);
    if (tax > 0) lines.push(`SPL\tINVOICE\t${date}\t${QB_ACCOUNTS.salesTaxPayable}\t${r.customerName}\t-${tax.toFixed(2)}\tSales Tax`);
    lines.push('ENDTRNS');

    // Deposit if collected
    if (deposit > 0) {
      lines.push(`TRNS\tRECEIPT\t${date}\t${QB_ACCOUNTS.unappliedCash}\t${r.customerName}\t${deposit.toFixed(2)}\t${r.invoiceNumber}-DEP\tSecurity Deposit`);
      lines.push(`SPL\tRECEIPT\t${date}\t${QB_ACCOUNTS.customerDeposits}\t${r.customerName}\t-${deposit.toFixed(2)}\tDeposit`);
      lines.push('ENDTRNS');
    }

    // Payment if collected
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
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── P&L Calculator ──────────────────────────────────────────────────────────
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

// ── Monthly Chart Data ──────────────────────────────────────────────────────
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

export default function AccountingDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('All Branches');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [me, r] = await Promise.all([
      base44.auth.me(),
      base44.entities.Rental.list('-startDate', 2000),
    ]);
    setUser(me);
    setRentals(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Access control
  const hasAccess = user?.role === 'admin' || user?.role === 'accountant';

  const filtered = useMemo(() => {
    return rentals.filter(r => {
      const d = r.startDate || '';
      const branchMatch = branch === 'All Branches' || r.branch === branch;
      const dateMatch = (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
      return branchMatch && dateMatch && r.status !== 'cancelled' && r.status !== 'quote';
    });
  }, [rentals, branch, dateFrom, dateTo]);

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
      {/* Header */}
      <div className="bg-emerald-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto flex-wrap">
          <button onClick={() => navigate('/manager')} className="p-2 rounded-lg hover:bg-emerald-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold">Accounting</div>
            <div className="text-emerald-300 text-xs">Financial summary & QB export</div>
          </div>

          {/* Filters */}
          <select value={branch} onChange={e => setBranch(e.target.value)}
            className="h-9 border-0 rounded px-2 bg-emerald-800 text-white text-sm">
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="h-9 border-0 rounded px-2 bg-emerald-800 text-white text-sm" />
          <span className="text-emerald-400 text-sm">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="h-9 border-0 rounded px-2 bg-emerald-800 text-white text-sm" />

          <button onClick={load} className="p-2 rounded-lg hover:bg-emerald-800">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* P&L Summary */}
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Profit & Loss Summary</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Rental Revenue" value={fmt(pl.rentalRevenue)} color="text-emerald-700" />
            <StatCard label="Delivery Revenue" value={fmt(pl.deliveryRevenue)} color="text-blue-700" />
            <StatCard label="Total Revenue" value={fmt(pl.totalRevenue)} color="text-indigo-700" sub="rental + delivery" />
            <StatCard label="Tax Collected" value={fmt(pl.taxCollected)} color="text-amber-700" sub="sales tax payable" />
            <StatCard label="Deposits Held" value={fmt(pl.depositsHeld)} color="text-purple-700" sub="liability" />
            <StatCard label="Outstanding A/R" value={fmt(pl.outstanding)} color={pl.outstanding > 0 ? 'text-red-600' : 'text-gray-500'} sub="unpaid invoices" />
          </div>
        </div>

        {/* Monthly Chart */}
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

        {/* Tax Summary */}
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
            <div className="font-semibold text-gray-900 text-sm">
              Transactions ({filtered.length})
            </div>
            <button
              onClick={handleExport}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
            >
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
                      <td className="px-4 py-2 font-mono text-indigo-700 font-medium">{r.invoiceNumber || '—'}</td>
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

        {/* QB Account Mapping Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <div className="font-semibold mb-1">QuickBooks Account Names (defaults)</div>
          <div className="text-xs space-y-0.5 text-amber-700">
            {Object.entries(QB_ACCOUNTS).map(([k, v]) => (
              <div key={k}><span className="font-medium">{k}:</span> "{v}"</div>
            ))}
          </div>
          <div className="mt-2 text-xs text-amber-600">These must match the exact account names in your QB Desktop file. Update the bookkeeper when they review.</div>
        </div>
      </div>
    </div>
  );
}