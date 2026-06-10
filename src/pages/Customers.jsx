import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, AlertTriangle, Ban, ShieldCheck, User, Users } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CustomerCard from '@/components/customers/CustomerCard';
import CustomerDetailModal from '@/components/customers/CustomerDetailModal';
import NewCustomerModal from '@/components/customers/NewCustomerModal';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    // Defensive check for preview mode
    if (!base44 || !base44.entities) {
      console.warn('[Customers] Base44 SDK not available');
      setLoading(false);
      return;
    }
    
    Promise.all([
      base44.entities.Customer.list('-created_date', 25000),
      base44.entities.Rental.list('-created_date', 2000),
    ]).then(([c, r]) => {
      setCustomers(c);
      setRentals(r);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    // Defensive check for preview mode
    if (!base44 || !base44.entities) {
      console.warn('[Customers] Base44 SDK not available');
      return;
    }
    
    const [c, r] = await Promise.all([
      base44.entities.Customer.list('-created_date', 25000),
      base44.entities.Rental.list('-created_date', 2000),
    ]);
    setCustomers(c);
    setRentals(r);
  };

  const filtered = useMemo(() => {
    let list = customers;
    if (filter === 'credit_hold') list = list.filter(c => c.creditHold);
    if (filter === 'blacklisted') list = list.filter(c => c.blacklisted);
    if (filter === 'tax_exempt') list = list.filter(c => c.taxExempt);
    if (filter === 'business') list = list.filter(c => c.accountType !== 'individual');
    if (search.trim().length > 1) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.fullName?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    return [...list].sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [customers, filter, search]);

  const stats = useMemo(() => ({
    total: customers.length,
    creditHold: customers.filter(c => c.creditHold).length,
    blacklisted: customers.filter(c => c.blacklisted).length,
    taxExempt: customers.filter(c => c.taxExempt).length,
  }), [customers]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Customer Records"
        subtitle={`${customers.length} customers`}
        icon={Users}
        action={
          <Button onClick={() => setShowNew(true)} className="bg-white text-slate-900 hover:bg-slate-100 gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Customer
          </Button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Credit Hold', value: stats.creditHold, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Blacklisted', value: stats.blacklisted, icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Tax Exempt', value: stats.taxExempt, icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-600">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search name, company, email, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All' },
              { key: 'credit_hold', label: '⚠️ Credit Hold' },
              { key: 'blacklisted', label: '🚫 Blacklisted' },
              { key: 'tax_exempt', label: '✓ Tax Exempt' },
              { key: 'business', label: '🏢 Business/Municipal' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  filter === f.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No customers found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm divide-y divide-gray-100">
            {filtered.map(c => {
              const custRentals = rentals.filter(r => r.customerName === c.fullName || r.customerEmail === c.email);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition flex items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{c.fullName}</span>
                      {c.companyName && <span className="text-xs text-gray-500">· {c.companyName}</span>}
                      {c.blacklisted && <Ban className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                      {c.creditHold && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      {c.taxExempt && <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      {c.phone && <span>{c.phone}</span>}
                      {c.email && <span className="truncate">{c.email}</span>}
                      {c.city && <span>{c.city}, {c.state}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0 text-right">
                    <div className="font-medium text-gray-700">{custRentals.length} rental{custRentals.length !== 1 ? 's' : ''}</div>
                    <div className="text-gray-400">{c.accountType !== 'individual' ? c.accountType : ''}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          rentals={rentals.filter(r => r.customerName === selectedCustomer.fullName || r.customerEmail === selectedCustomer.email)}
          onClose={() => setSelectedCustomer(null)}
          onSave={async (updated) => {
            await base44.entities.Customer.update(updated.id, updated);
            await refresh();
            setSelectedCustomer(null);
          }}
          onDelete={async (id) => {
            await base44.entities.Customer.delete(id);
            await refresh();
            setSelectedCustomer(null);
          }}
        />
      )}

      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onSave={async (data) => {
            await base44.entities.Customer.create({ ...data, source: 'manual' });
            await refresh();
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}