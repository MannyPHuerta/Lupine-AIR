import { useRef, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import BranchSelect from '@/components/invoice/BranchSelect';
import { formatPhoneUS } from '@/lib/phoneUtils';
import { UserCheck, ShoppingCart, Check, ChevronDown } from 'lucide-react';

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
 * Build unique customer suggestions from rental history matching name/phone/email.
 */
function buildCustomerSuggestions(query, allRentals) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const seen = new Set();
  const suggestions = [];
  allRentals.forEach(r => {
    const key = (r.customerName || '').toLowerCase();
    if (seen.has(key)) return;
    const nameMatch = r.customerName?.toLowerCase().includes(q);
    const phoneMatch = r.customerPhone?.includes(q);
    const emailMatch = r.customerEmail?.toLowerCase().includes(q);
    if (nameMatch || phoneMatch || emailMatch) {
      seen.add(key);
      suggestions.push({
        name: r.customerName || '',
        phone: r.customerPhone || '',
        email: r.customerEmail || '',
        branch: r.branch || '',
        address: r.customerAddress || '',
        city: r.customerCity || '',
        state: r.customerState || '',
        zip: r.customerZip || '',
      });
    }
  });
  return suggestions.slice(0, 8);
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
    .filter(e => e.totalRentals >= 1) // show items rented at least once
    .sort((a, b) => b.totalRentals - a.totalRentals)
    .slice(0, 5);

  return {
    phone: recent.customerPhone || '',
    email: recent.customerEmail || '',
    branch: recent.branch || '',
    address: recent.customerAddress || '',
    city: recent.customerCity || '',
    state: recent.customerState || '',
    zip: recent.customerZip || '',
    rentalCount: past.length,
    typicalItems,
  };
}

/**
 * Build the full typical basket with status vs current lines.
 * Returns all typical items, tagged as: 'ok', 'missing', or 'low_qty'.
 */
function buildNudges(typicalItems, currentLines) {
  return typicalItems.map(item => {
    const onInvoice = currentLines.filter(l => l.equipmentId === item.equipmentId);
    const currentQty = onInvoice.reduce((s, l) => s + (l.quantity || 1), 0);
    if (onInvoice.length === 0) return { type: 'missing', item, currentQty: 0 };
    if (currentQty < item.avgQty) return { type: 'low_qty', item, currentQty };
    return { type: 'ok', item, currentQty };
  });
}

/** Items from nudges that still need to be added/topped up */
function nudgesNeeded(nudges) {
  return nudges.filter(n => n.type !== 'ok');
}

function SuggestionDropdown({ suggestions, onSelect }) {
  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onMouseDown={() => onSelect(s)}
          className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b last:border-0 border-gray-100"
        >
          <div className="font-medium text-gray-900 text-sm">{s.name}</div>
          <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
            {s.phone && <span>📞 {s.phone}</span>}
            {s.email && <span>✉️ {s.email}</span>}
            {s.branch && <span className="text-gray-400">{s.branch}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

/** Top card: customer identity fields (name, phone, email, branch) */
export function CustomerIdentity({ customer, onChange, rentals = [], lines = [], onAddItems }) {
  const set = (field, value) => onChange({ ...customer, [field]: value });
  const [autoFilled, setAutoFilled] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [added, setAdded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef(null);

  // Debounced customer history lookup
  const history = useMemo(
    () => analyzeCustomerHistory(customer.name, rentals),
    [customer.name, rentals]
  );

  const [searchQuery, setSearchQuery] = useState('');

  const suggestions = useMemo(
    () => buildCustomerSuggestions(searchQuery, rentals),
    [searchQuery, rentals]
  );

  const fillFromSuggestion = (s) => {
    onChange({
      ...customer,
      name: s.name,
      phone: s.phone || customer.phone,
      email: s.email || customer.email,
      branch: s.branch || customer.branch,
      address: s.address || customer.address,
      city: s.city || customer.city,
      state: s.state || customer.state,
      zip: s.zip || customer.zip,
    });
    setAutoFilled(true);
    setShowSuggestions(false);
  };

  // Auto-fill contact info when a known customer is recognized (only if fields are empty)
  useEffect(() => {
    if (!history || autoFilled) return;
    const updates = {};
    if (!customer.phone && history.phone) updates.phone = history.phone;
    if (!customer.email && history.email) updates.email = history.email;
    if (!customer.branch && history.branch) updates.branch = history.branch;
    if (!customer.address && history.address) updates.address = history.address;
    if (!customer.city && history.city) updates.city = history.city;
    if (!customer.state && history.state) updates.state = history.state;
    if (!customer.zip && history.zip) updates.zip = history.zip;
    if (Object.keys(updates).length > 0) {
      onChange({ ...customer, ...updates });
      setAutoFilled(true);
    }
  }, [history]);

  // Reset flags when name changes
  useEffect(() => {
    if (!customer.name) { setAutoFilled(false); setNudgeDismissed(false); setAdded(false); }
  }, [customer.name]);

  const nudges = useMemo(
    () => history ? buildNudges(history.typicalItems, lines) : [],
    [history, lines]
  );

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2 lg:col-span-2 relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
          <Input
            ref={nameRef}
            autoFocus
            placeholder="Search by name, phone, or email..."
            value={customer.name}
            onChange={e => { set('name', toTitleCase(e.target.value)); setSearchQuery(e.target.value); setShowSuggestions(true); setAutoFilled(false); }}
            onFocus={() => { setSearchQuery(customer.name); setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {history && !showSuggestions && (
            <div className="flex items-center gap-1 mt-1">
              <UserCheck className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">{history.rentalCount} past rental{history.rentalCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionDropdown suggestions={suggestions} onSelect={fillFromSuggestion} />
          )}
        </div>
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <Input
            placeholder="(956) 123-4567"
            value={customer.phone}
            onChange={e => { set('phone', formatPhoneUS(e.target.value)); setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => { setSearchQuery(customer.phone); setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            inputMode="numeric"
          />
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionDropdown suggestions={suggestions} onSelect={fillFromSuggestion} />
          )}
        </div>
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={customer.email}
            onChange={e => { set('email', e.target.value); setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => { setSearchQuery(customer.email); setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionDropdown suggestions={suggestions} onSelect={fillFromSuggestion} />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
          <BranchSelect value={customer.branch} onChange={v => set('branch', v)} />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
          <Input
            placeholder="123 Main St"
            value={customer.address}
            onChange={e => set('address', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
          <Input
            placeholder="McAllen"
            value={customer.city}
            onChange={e => set('city', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
          <Input
            placeholder="TX"
            maxLength="2"
            value={customer.state}
            onChange={e => set('state', e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Zip</label>
          <Input
            placeholder="78501"
            value={customer.zip}
            onChange={e => set('zip', e.target.value)}
          />
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

      {/* Conversational upsell prompt */}
      {nudges.length > 0 && !nudgeDismissed && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-lg px-4 py-3">
          {added ? (
            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
              <Check className="w-4 h-4 text-green-500" />
              Added to order!
            </div>
          ) : (() => {
            const needed = nudgesNeeded(nudges);
            const firstName = customer.name.split(' ')[0];
            return (
              <>
                <p className="text-sm text-indigo-900 font-medium mb-3">
                  Hey {firstName}, last time you rented{' '}
                  {nudges.map((n, i) => (
                    <span key={i}>
                      {i > 0 && i === nudges.length - 1 ? ' and ' : i > 0 ? ', ' : ''}
                      <strong className={n.type === 'ok' ? 'text-green-700' : 'text-indigo-900'}>
                        {n.item.avgQty > 1 ? `${n.item.avgQty}× ` : ''}{n.item.name}
                      </strong>
                      {n.type === 'ok' && <span className="text-green-600 text-xs"> ✓</span>}
                      {n.type === 'low_qty' && <span className="text-amber-600 text-xs"> ({n.currentQty} added)</span>}
                    </span>
                  ))}.{' '}
                  {needed.length > 0 ? 'Want the rest added too?' : 'Looks like you\'re all set!'}
                </p>
                {needed.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onAddItems) {
                          onAddItems(needed.map(n => ({ equipmentId: n.item.equipmentId, equipmentName: n.item.name, quantity: n.item.avgQty })));
                          setAdded(true);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Yes, add the rest
                    </button>
                    <button
                      onClick={() => setNudgeDismissed(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-600 px-2 py-1.5"
                    >
                      No thanks
                    </button>
                  </div>
                )}
              </>
            );
          })()}
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