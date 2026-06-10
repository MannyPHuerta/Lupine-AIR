import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import AppPageHeader from '@/components/AppPageHeader';
import { ShoppingBag, CheckCircle, AlertTriangle, Clock, DollarSign, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [payments, setPayments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    // Defensive check for preview mode
    if (!base44 || !base44.auth || !base44.entities) {
      console.warn('[RtoDashboard] Base44 SDK not available');
      setLoading(false);
      return;
    }
    
    const [me, pays, rents] = await Promise.all([
      base44.auth.me(),
      base44.entities.RtoPayment.list('dueDate', 500),
      base44.entities.Rental.filter({ isRentToOwn: true }, '-created_date', 200),
    ]);
    setUser(me);
    setPayments(pays);
    setRentals(rents);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMarkPaid = async (payment) => {
    // Defensive check for preview mode
    if (!base44 || !base44.entities) {
      alert('Payment operations not available in preview mode');
      return;
    }
    
    if (!confirm(`Mark $${payment.amountDue.toFixed(2)} from ${payment.customerName} as paid?`)) return;
    setMarkingPaid(payment.id);
    const now = new Date().toISOString();
    await base44.entities.RtoPayment.update(payment.id, {
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
      await base44.entities.Rental.update(rental.id, {
        amountCredited: credited,
        balanceRemaining: Math.max(0, balance),
      });
    }
    setMarkingPaid(null);
    load();
  };

  const today = new Date().toISOString().split('T')[0];

  const filtered = payments.filter(p => {
    if (filter === 'pending') return p.status === 'pending';
    if (filter === 'late') return p.status === 'late';
    if (filter === 'paid') return p.status === 'paid';
    if (filter === 'due_today') return p.dueDate === today && p.status !== 'paid' && p.status !== 'cancelled';
    return p.status !== 'cancelled';
  });

  const lateCount = payments.filter(p => p.status === 'late').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const totalCollected = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amountPaid || 0), 0);
  const activeContracts = rentals.filter(r => r.status !== 'cancelled' && r.status !== 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Rent-to-Own Dashboard"
        subtitle={`${activeContracts} active contracts`}
        icon={ShoppingBag}
        action={
          <Button size="sm" variant="outline" onClick={load} className="text-white border-white/30 hover:bg-white/10">
            Refresh
          </Button>
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
            {rentals.map(r => {
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