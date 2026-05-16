import { useState, useMemo } from 'react';
import { Download, Search, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

const fmt = n => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '—';

function PLRow({ label, value, indent = 0, bold = false, color = '', sub = '' }) {
  return (
    <tr className={`border-b border-gray-100 ${bold ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
      <td className={`py-2 text-sm ${bold ? 'font-bold' : 'font-medium'} text-gray-800`} style={{ paddingLeft: `${16 + indent * 20}px` }}>
        {label}
        {sub && <span className="text-xs text-gray-400 ml-2">{sub}</span>}
      </td>
      <td className={`py-2 pr-4 text-right text-sm ${bold ? 'font-bold' : ''} ${color}`}>{fmt(value)}</td>
    </tr>
  );
}

function Divider({ label }) {
  return (
    <tr>
      <td colSpan={2} className="pt-4 pb-1 px-4 text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</td>
    </tr>
  );
}

function JobCard({ job, expanded, onToggle }) {
  const gpColor = job.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600';
  const gpBg = job.grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50';

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 text-left"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono font-bold text-indigo-700 text-sm">{job.invoiceNumber || job.jobRef || '(no invoice)'}</span>
            <span className="text-gray-900 font-medium text-sm truncate">{job.customerName || '—'}</span>
            <span className="text-xs text-gray-400">{job.date}</span>
            {job.branch && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{job.branch}</span>}
          </div>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400">Revenue</div>
            <div className="text-sm font-semibold text-gray-700">{fmt(job.revenue)}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400">Labor</div>
            <div className="text-sm font-semibold text-amber-700">{fmt(job.laborCost)}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-gray-400">Expenses</div>
            <div className="text-sm font-semibold text-rose-700">{fmt(job.expenseCost)}</div>
          </div>
          <div className={`text-right px-3 py-1 rounded-lg ${gpBg}`}>
            <div className="text-xs text-gray-500">Gross Profit</div>
            <div className={`text-sm font-bold ${gpColor}`}>{fmt(job.grossProfit)}</div>
            <div className={`text-xs ${gpColor}`}>{pct(job.grossProfit, job.revenue)} margin</div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x">
            {/* Income Statement */}
            <div className="p-4">
              <table className="w-full">
                <tbody>
                  <Divider label="Revenue" />
                  <PLRow label="Rental" value={job.rentalRevenue} indent={1} />
                  <PLRow label="Delivery Fees" value={job.deliveryRevenue} indent={1} />
                  <PLRow label="Total Revenue" value={job.revenue} bold color="text-emerald-700" />
                  
                  <Divider label="Direct Costs" />
                  <PLRow label="Labor — Regular" value={job.regularPay} indent={1} color="text-amber-700" />
                  <PLRow label="Labor — Overtime" value={job.overtimePay} indent={1} color="text-amber-700" sub={job.laborHours > 0 ? `${job.laborHours.toFixed(1)}h` : ''} />
                  <PLRow label="Direct Expenses" value={job.expenseCost} indent={1} color="text-rose-700" />
                  <PLRow label="Total Costs" value={job.laborCost + job.expenseCost} bold color="text-red-700" />

                  <Divider label="Result" />
                  <PLRow label="Gross Profit" value={job.grossProfit} bold color={job.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'} sub={pct(job.grossProfit, job.revenue) + ' margin'} />
                </tbody>
              </table>
            </div>

            {/* Detail Breakdown */}
            <div className="p-4 space-y-4">
              {job.timesheets.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Labor Detail</div>
                  <div className="space-y-1">
                    {job.timesheets.map((t, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-700">
                        <span>{t.staffName} <span className="text-gray-400">({t.hoursWorked?.toFixed(1)}h @ ${t.hourlyRate}/hr)</span></span>
                        <span className="font-medium">{fmt(t.totalPay)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {job.expenses.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expense Detail</div>
                  <div className="space-y-1">
                    {job.expenses.map((e, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-700">
                        <span>{e.category} — {e.vendor || 'n/a'}</span>
                        <span className="font-medium text-rose-700">{fmt(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {job.timesheets.length === 0 && job.expenses.length === 0 && (
                <div className="text-xs text-gray-400 italic">No labor or expense records linked to this job.</div>
              )}

              <div className="bg-white rounded border p-3 text-xs space-y-1">
                <div className="font-semibold text-gray-600 mb-1">Collection Status</div>
                <div className="flex justify-between"><span className="text-gray-500">Invoiced</span><span>{fmt(job.invoiced)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Collected</span><span className="text-green-700">{fmt(job.amountPaid)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className={job.balance > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>{fmt(job.balance)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryBar({ jobs }) {
  const totals = useMemo(() => jobs.reduce((acc, j) => ({
    revenue: acc.revenue + j.revenue,
    labor: acc.labor + j.laborCost,
    expenses: acc.expenses + j.expenseCost,
    gp: acc.gp + j.grossProfit,
  }), { revenue: 0, labor: 0, expenses: 0, gp: 0 }), [jobs]);

  const gpColor = totals.gp >= 0 ? 'text-emerald-700' : 'text-red-600';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Revenue', value: totals.revenue, color: 'text-emerald-700' },
        { label: 'Total Labor', value: totals.labor, color: 'text-amber-700' },
        { label: 'Total Expenses', value: totals.expenses, color: 'text-rose-700' },
        { label: 'Gross Profit', value: totals.gp, color: gpColor, sub: pct(totals.gp, totals.revenue) + ' margin' },
      ].map(s => (
        <div key={s.label} className="bg-white border rounded-lg p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{s.label}</div>
          <div className={`text-xl font-bold ${s.color}`}>{fmt(s.value)}</div>
          {s.sub && <div className="text-xs text-gray-400">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export default function JobProfitLoss({ rentals, timesheets, expenses }) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [expandedId, setExpandedId] = useState(null);

  const jobs = useMemo(() => {
    return rentals
      .filter(r => r.status !== 'quote' && r.status !== 'cancelled')
      .map(r => {
        const invoiceNum = r.invoiceNumber;
        const jobTs = timesheets.filter(t =>
          t.jobReference && invoiceNum && (
            t.jobReference === invoiceNum ||
            t.jobReference === r.id
          )
        );
        const jobExp = expenses.filter(e =>
          e.invoiceNumber && invoiceNum && e.invoiceNumber === invoiceNum
        );

        const rentalRevenue = r.baseAmount || 0;
        const deliveryRevenue = (r.deliveryFee || 0) + (r.returnFee || 0);
        const revenue = rentalRevenue + deliveryRevenue;

        const regularPay = jobTs.reduce((s, t) => s + (t.regularPay || 0), 0);
        const overtimePay = jobTs.reduce((s, t) => s + (t.overtimePay || 0), 0);
        const laborCost = jobTs.reduce((s, t) => s + (t.totalPay || 0), 0);
        const laborHours = jobTs.reduce((s, t) => s + (t.hoursWorked || 0), 0);
        const expenseCost = jobExp.reduce((s, e) => s + (e.amount || 0), 0);
        const grossProfit = revenue - laborCost - expenseCost;

        const invoiced = revenue + (r.taxAmount || 0);
        const amountPaid = r.amountPaid || 0;
        const balance = Math.max(0, invoiced - amountPaid);

        return {
          id: r.id,
          invoiceNumber: r.invoiceNumber,
          jobRef: r.id,
          customerName: r.customerName,
          date: r.startDate || '',
          branch: r.branch,
          status: r.status,
          revenue, rentalRevenue, deliveryRevenue,
          regularPay, overtimePay, laborCost, laborHours,
          expenseCost, grossProfit,
          invoiced, amountPaid, balance,
          timesheets: jobTs,
          expenses: jobExp,
        };
      });
  }, [rentals, timesheets, expenses]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j =>
        (j.invoiceNumber || '').toLowerCase().includes(q) ||
        (j.customerName || '').toLowerCase().includes(q) ||
        (j.branch || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'gp') return b.grossProfit - a.grossProfit;
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'margin') {
        const ma = a.revenue > 0 ? a.grossProfit / a.revenue : 0;
        const mb = b.revenue > 0 ? b.grossProfit / b.revenue : 0;
        return mb - ma;
      }
      return b.date.localeCompare(a.date); // default: newest first
    });
  }, [jobs, search, sortBy]);

  const handleExportCSV = () => {
    const rows = [
      ['Invoice', 'Customer', 'Branch', 'Date', 'Revenue', 'Labor', 'Expenses', 'Gross Profit', 'Margin %', 'Collected', 'Outstanding'],
      ...filtered.map(j => [
        j.invoiceNumber || '',
        j.customerName || '',
        j.branch || '',
        j.date,
        j.revenue.toFixed(2),
        j.laborCost.toFixed(2),
        j.expenseCost.toFixed(2),
        j.grossProfit.toFixed(2),
        j.revenue > 0 ? ((j.grossProfit / j.revenue) * 100).toFixed(1) : '0',
        j.amountPaid.toFixed(2),
        j.balance.toFixed(2),
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'job_pl.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search invoice, customer, branch…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="date">Sort: Newest First</option>
          <option value="gp">Sort: Gross Profit</option>
          <option value="revenue">Sort: Revenue</option>
          <option value="margin">Sort: Margin %</option>
        </select>
        <button onClick={handleExportCSV}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <SummaryBar jobs={filtered} />

      <div className="text-xs text-gray-400 mb-2">{filtered.length} jobs — labor matched by invoice number</div>

      <div className="space-y-3">
        {filtered.map(job => (
          <JobCard
            key={job.id}
            job={job}
            expanded={expandedId === job.id}
            onToggle={() => setExpandedId(expandedId === job.id ? null : job.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-12">No jobs found for this filter.</div>
        )}
      </div>
    </div>
  );
}