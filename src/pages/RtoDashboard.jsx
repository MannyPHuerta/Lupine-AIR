import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppPageHeader from '@/components/AppPageHeader';
import { ShoppingBag, CheckCircle, AlertTriangle, Clock, DollarSign, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranches } from '@/hooks/useBranches';

const STATUS_COLORS = {
  pending: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-700',
  late: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function KpiCard({ label, value, color, Icon }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function RtoDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [filter, setFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const { branches } = useBranches();

  const load = async () => {
    setLoading(true);
    try {
      const [pays, rents] = await Promise.all([
        supabaseData.RtoPayment.list('dueDate', 500),
        supabaseData.Rental.filter({ isRentToOwn: true }, '-created_date', 200),
      ]);
      setPayments(pays);
      setRentals(rents);
    } catch (err) {
      console.error('[RtoDashboard] Failed to load:', err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMarkPaid = async (payment) => {
    if (!confirm(`Mark $${payment.amountDue.toFixed(2)} from ${payment.customerName} as paid?`)) return;
    setMarkingPaid(payment.id);
    const now = new Date().toISOString();
    await supabaseData.RtoPayment.update(payment.id, {
      status: 'paid',
      amountPaid: payment.amountDue,
      paidAt: now,
      paidBy: user?.email || '',
    });
    // Update rental's amountCredited
    const rental = rentals.find(r => r.id === payment.rentalId);
    if (rental) {
      const credited = (rental.amountCredited || 0) + payment.amountDue;
      const balance = (rental.purchasePrice || 0) - credited;
      await supabaseData.Rental.update(rental.id, {
        amountCredited: credited,
        balanceRemaining: Math.max(0, balance),
      });
    }
    setMarkingPaid(null);
    load();
  };

  const today = new Date().toISOString().split('T')[0];

  const branchFilteredPayments = branchFilter === 'all' ? payments : payments.filter(p => p.branch === branchFilter);
  const branchRentals = branchFilter === 'all' ? rentals : rentals.filter(r => r.branch === branchFilter);

  const filtered = branchFilteredPayments.filter(p => {
    if (filter === 'pending') return p.status === 'pending';
    if (filter === 'late') return p.status === 'late';
    if (filter === 'paid') return p.status === 'paid';
    if (filter === 'due_today') return p.dueDate === today && p.status !== 'paid' && p.status !== 'cancelled';
    return p.status !== 'cancelled';
  });

  const lateCount = branchFilteredPayments.filter(p => p.status === 'late').length;
  const pendingCount = branchFilteredPayments.filter(p => p.status === 'pending').length;
  const paidCount = branchFilteredPayments.filter(p => p.status === 'paid').length;
  const totalCollected = branchFilteredPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amountPaid || 0), 0);
  const activeContracts = branchRentals.filter(r => r.status !== 'cancelled' && r.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Rent-to-Own Dashboard"
        subtitle={`${activeContracts} active contracts`}
        icon={ShoppingBag}
        action={
          <div className="flex items-center gap-2">
            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="h-8 text-xs px-2 rounded border border-white/30 bg-white/10 text-white">
              <option value="all">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={load} className="text-white border-white/30 hover:bg-white/10">
              Refresh
            </Button>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Active Contracts" value={activeContracts} color="bg-purple-100 text-purple-700" Icon={ShoppingBag} />
          <KpiCard label="Payments Late" value={lateCount} color={lateCount > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"} Icon={AlertTriangle} />
          <KpiCard label="Payments Pending" value={pendingCount} color="bg-blue-100 text-blue-700" Icon={Clock} />
          <KpiCard label="Total Collected" value={`$${totalCollected.toLocaleString()}`} color="bg-green-100 text-green-700" Icon={DollarSign} />
        </div>

        {/* Active Contracts Summary */}
        {rentals.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-purple-50 font-semibold text-purple-900 text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Active RTO Contracts
            </div>
            {branchRentals.map(r => {
              const contractPayments = payments.filter(p => p.rentalId === r.id);
              const paidPayments = contractPayments.filter(p => p.status === 'paid').length;
              const progress = contractPayments.length > 0 ? Math.round((paidPayments / contractPayments.length) * 100) : 0;
              return (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3 border-b last:border-0 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{r.customerName}</div>
                    <div className="text-xs text-gray-500">{r.equipmentName} · Invoice {r.invoiceNumber || '—'}</div>
                    <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{paidPayments}/{contractPayments.length} payments · {progress}% complete</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-purple-700">${(r.purchasePrice || 0).toFixed(0)}</div>
                    <div className="text-xs text-gray-500">Balance: ${(r.balanceRemaining || 0).toFixed(0)}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/rental-history?invoice=${encodeURIComponent(r.invoiceNumber || '')}`)}
                    className="text-indigo-500 hover:text-indigo-700 flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Payment Schedule */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-900 text-sm">Payment Schedule</div>
            <div className="flex gap-1.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'due_today', label: 'Due Today' },
                { key: 'late', label: 'Late' },
                { key: 'pending', label: 'Pending' },
                { key: 'paid', label: 'Paid' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${filter === f.key ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" /> No payments found
            </div>
          ) : (
            filtered.map(p => (
              <div key={p.id} className={`flex items-center gap-4 px-5 py-3 border-b last:border-0 ${p.status === 'late' ? 'bg-red-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">{p.customerName}</div>
                  <div className="text-xs text-gray-500">{p.equipmentName} · Payment {p.paymentNumber} of {p.totalPayments}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Due: {p.dueDate}{p.paidAt ? ` · Paid: ${p.paidAt.split('T')[0]}` : ''}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900">${(p.amountDue || 0).toFixed(2)}</div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-500'}`}>
                    {p.status}
                  </span>
                </div>
                {(p.status === 'pending' || p.status === 'late') && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkPaid(p)}
                    disabled={markingPaid === p.id}
                    className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {markingPaid === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓ Mark Paid'}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
