import { useRef, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import BranchSelect from '@/components/invoice/BranchSelect';
import { formatPhoneUS } from '@/lib/phoneUtils';
import { UserCheck, TrendingUp, Plus } from 'lucide-react';

const BRANCHES = [
  '01 McAllen',
  '02 Weslaco',
  '03 Harlingen',
  '05 Brownsville',
  '06 Corpus',
  '98 Shop',
  '99 Warehouse',
];

function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function DateInput({ label, value, onChange }) {
  const ref = useRef(null);
  const open = () => { try { ref.current?.showPicker?.(); } catch (_) {} ref.current?.focus(); };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer items-center"
        onClick={open}
      >
        <input
          ref={ref}
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={open}
          className="flex-1 bg-transparent outline-none text-sm cursor-pointer"
        />
      </div>
    </div>
  );
}

/**
 * Analyze past rentals for a customer.
 * Returns: { phone, email, branch, typicalItems: [{ name, avgQty, equipmentId }] }
 */
function analyzeCustomerHistory(name, allRentals) {
  if (!name || name.trim().length < 3) return null;
  const q = name.trim().toLowerCase();
  const past = allRentals.filter(r => r.customerName?.toLowerCase() === q && r.status !== 'cancelled');
  if (past.length === 0) return null;

  // Most recent for contact info
  const recent = [...past].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))[0];

  // Group by equipment to find typical quantities
  const byEquipment = {};
  past.forEach(r => {
    const key = r.equipmentId;
    if (!key) return;
    if (!byEquipment[key]) byEquipment[key] = { name: r.equipmentName || key, equipmentId: key, quantities: [] };
    byEquipment[key].quantities.push(1); // each rental row = 1 unit
  });

  const typicalItems = Object.values(byEquipment)
    .map(e => ({
      ...e,
      avgQty: Math.round(e.quantities.reduce((s, v) => s + v, 0) / e.quantities.length),
      totalRentals: e.quantities.length,
    }))
    .filter(e => e.totalRentals >= 2) // only items rented at least twice
    .sort((a, b) => b.totalRentals - a.totalRentals)
    .slice(0, 5);

  return {
    phone: recent.customerPhone || '',
    email: recent.customerEmail || '',
    branch: recent.branch || '',
    rentalCount: past.length,
    typicalItems,
  };
}

/**
 * Build upsell nudges by comparing typical basket vs current lines.
 */
function buildNudges(typicalItems, currentLines) {
  const nudges = [];
  typicalItems.forEach(item => {
    const onInvoice = currentLines.filter(l => l.equipmentId === item.equipmentId);
    const currentQty = onInvoice.reduce((s, l) => s + (l.quantity || 1), 0);
    if (onInvoice.length === 0) {
      nudges.push({ type: 'missing', item, currentQty: 0 });
    } else if (currentQty < item.avgQty) {
      nudges.push({ type: 'low_qty', item, currentQty });
    }
  });
  return nudges;
}

/** Top card: customer identity fields (name, phone, email, branch) */
export function CustomerIdentity({ customer, onChange, rentals = [], lines = [] }) {
  const set = (field, value) => onChange({ ...customer, [field]: value });
  const [autoFilled, setAutoFilled] = useState(false);

  // Debounced customer history lookup
  const history = useMemo(
    () => analyzeCustomerHistory(customer.name, rentals),
    [customer.name, rentals]
  );

  // Auto-fill contact info when a known customer is recognized (only if fields are empty)
  useEffect(() => {
    if (!history || autoFilled) return;
    const updates = {};
    if (!customer.phone && history.phone) updates.phone = history.phone;
    if (!customer.email && history.email) updates.email = history.email;
    if (!customer.branch && history.branch) updates.branch = history.branch;
    if (Object.keys(updates).length > 0) {
      onChange({ ...customer, ...updates });
      setAutoFilled(true);
    }
  }, [history]);

  // Reset auto-fill flag when name is cleared
  useEffect(() => {
    if (!customer.name) setAutoFilled(false);
  }, [customer.name]);

  const nudges = useMemo(
    () => history ? buildNudges(history.typicalItems, lines) : [],
    [history, lines]
  );

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
          <Input
            autoFocus
            placeholder="John Doe"
            value={customer.name}
            onChange={e => set('name', toTitleCase(e.target.value))}
          />
          {history && (
            <div className="flex items-center gap-1 mt-1">
              <UserCheck className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">{history.rentalCount} past rental{history.rentalCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <Input
            placeholder="(956) 123-4567"
            value={customer.phone}
            onChange={e => set('phone', formatPhoneUS(e.target.value))}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={customer.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
          <BranchSelect value={customer.branch} onChange={v => set('branch', v)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <Input
            placeholder="Special requests, delivery instructions..."
            value={customer.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </div>

      {/* Upsell nudges */}
      {nudges.length > 0 && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-lg px-4 py-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-700">Pattern detected for {customer.name}</span>
          </div>
          <div className="space-y-1">
            {nudges.map((nudge, i) => (
              <div key={i} className="text-xs text-indigo-800 flex items-start gap-1.5">
                <Plus className="w-3 h-3 shrink-0 mt-0.5 text-indigo-400" />
                {nudge.type === 'missing'
                  ? <>Usually rents <strong>{nudge.item.name}</strong> ({nudge.item.totalRentals}x in history) — not on this order.</>
                  : <>Usually rents <strong>{nudge.item.avgQty}× {nudge.item.name}</strong> — only {nudge.currentQty} added so far.</>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Bottom card: default rental dates and notes */
export function RentalDates({ customer, onChange }) {
  const set = (field, value) => onChange({ ...customer, [field]: value });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DateInput label="Default Start" value={customer.startDate} onChange={v => set('startDate', v)} />
        <DateInput label="Default End" value={customer.endDate} onChange={v => set('endDate', v)} />
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <Input
            placeholder="Special requests, delivery instructions..."
            value={customer.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">Dates above pre-fill each line — override per item as needed.</p>
    </div>
  );
}

export default function CustomerHeader({ customer, onChange }) {
  return (
    <>
      <CustomerIdentity customer={customer} onChange={onChange} />
      <RentalDates customer={customer} onChange={onChange} />
    </>
  );
}