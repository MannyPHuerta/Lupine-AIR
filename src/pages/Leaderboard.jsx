import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Wrench, ShoppingBag, Medal, Loader2, RefreshCw } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';

const PERIODS = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

function getStartDate(period) {
  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  }
  if (period === 'month') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  if (period === 'year') return `${now.getFullYear()}-01-01`;
  return null;
}

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{rank}</span>;
}

function LeaderCard({ rank, name, primary, secondary, accent }) {
  const isTop3 = rank <= 3;
  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition ${isTop3 ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        <RankBadge rank={rank} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{name}</div>
        <div className="text-xs text-gray-500">{secondary}</div>
      </div>
      <div className={`text-right font-bold text-lg ${accent}`}>{primary}</div>
    </div>
  );
}

export default function Leaderboard() {
  const [period, setPeriod] = useState('month');
  const [branch, setBranch] = useState('all');
  const [rentals, setRentals] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, wo] = await Promise.all([
      base44.entities.Rental.list('-created_date', 1000),
      base44.entities.WorkOrder.list('-completedDate', 1000),
    ]);
    setRentals(r);
    setWorkOrders(wo);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startDate = getStartDate(period);

  const salesBoard = useMemo(() => {
    let data = rentals.filter(r =>
      ['contract', 'out', 'returned', 'completed'].includes(r.status) &&
      r.created_by &&
      (!startDate || (r.created_date || '').slice(0, 10) >= startDate) &&
      (branch === 'all' || r.branch === branch)
    );
    const map = {};
    data.forEach(r => {
      const key = r.created_by;
      if (!map[key]) map[key] = { name: key.split('@')[0].replace(/\./g, ' '), email: key, count: 0, revenue: 0 };
      map[key].count++;
      map[key].revenue += r.baseAmount || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [rentals, period, branch, startDate]);

  const mechanicBoard = useMemo(() => {
    let data = workOrders.filter(wo =>
      wo.status === 'completed' &&
      wo.assignedTo &&
      (!startDate || (wo.completedDate || '') >= startDate) &&
      (branch === 'all' || wo.branch === branch)
    );
    const map = {};
    data.forEach(wo => {
      const key = wo.assignedTo;
      if (!map[key]) map[key] = { name: key.split('@')[0].replace(/\./g, ' '), email: key, jobs: 0, laborValue: 0 };
      map[key].jobs++;
      map[key].laborValue += wo.laborCost || wo.estimatedLaborCost || 0;
    });
    return Object.values(map)
      .sort((a, b) => b.jobs - a.jobs)
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  }, [workOrders, period, branch, startDate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        icon={Trophy}
        title="Leaderboards"
        subtitle="Sales performance & mechanic rankings"
        action={
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/10 text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 bg-white rounded-lg border p-3 items-center">
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${period === p.value ? 'bg-indigo-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <select value={branch} onChange={e => setBranch(e.target.value)}
            className="h-8 border rounded px-2 text-sm bg-white focus:outline-none ml-auto">
            <option value="all">All Branches</option>
            {['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Sales Leaderboard */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50">
                <ShoppingBag className="w-5 h-5 text-green-700" />
                <div>
                  <div className="font-bold text-gray-900">Sales Leaderboard</div>
                  <div className="text-xs text-gray-500">Ranked by revenue closed</div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {salesBoard.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-10">No sales data for this period</div>
                ) : salesBoard.map(entry => (
                  <LeaderCard
                    key={entry.email}
                    rank={entry.rank}
                    name={entry.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    primary={`$${entry.revenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                    secondary={`${entry.count} rental${entry.count !== 1 ? 's' : ''} closed`}
                    accent="text-green-700"
                  />
                ))}
              </div>
            </div>

            {/* Mechanic Leaderboard */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50">
                <Wrench className="w-5 h-5 text-orange-700" />
                <div>
                  <div className="font-bold text-gray-900">Mechanic Leaderboard</div>
                  <div className="text-xs text-gray-500">Ranked by completed work orders</div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                {mechanicBoard.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-10">No completed work orders for this period</div>
                ) : mechanicBoard.map(entry => (
                  <LeaderCard
                    key={entry.email}
                    rank={entry.rank}
                    name={entry.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    primary={`${entry.jobs} job${entry.jobs !== 1 ? 's' : ''}`}
                    secondary={entry.laborValue > 0 ? `$${entry.laborValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} labor value` : 'Work orders completed'}
                    accent="text-orange-700"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}