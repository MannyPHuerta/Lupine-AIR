import { useRef, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import BranchSelect from '@/components/invoice/BranchSelect';
import { formatPhoneUS } from '@/lib/phoneUtils';
import { UserCheck, ShoppingCart, Check, ScanLine, AlertTriangle, CheckCircle2, Ban } from 'lucide-react';
import { useDLScanner } from '@/hooks/useDLScanner';
import { base44 } from '@/api/base44Client';
import PhoneVerificationModal from '@/components/counter/PhoneVerificationModal';
import CustomerRiskCheck from '@/components/invoice/CustomerRiskCheck';

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
 * Build customer suggestions from Customer entity records.
 */
function buildCustomerSuggestions(query, customers) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase().replace(/\D/g, '') || query.trim().toLowerCase();
  const digits = query.trim().replace(/\D/g, '');
  return customers.filter(c => {
    const phoneDigits = (c.phone || '').replace(/\D/g, '');
    const nameMatch = (c.fullName || '').toLowerCase().includes(query.trim().toLowerCase());
    const phoneMatch = digits.length >= 3 && phoneDigits.includes(digits);
    const emailMatch = (c.email || '').toLowerCase().includes(query.trim().toLowerCase());
    return nameMatch || phoneMatch || emailMatch;
  }).slice(0, 8);
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

// Extract area code from branch phone (e.g., "(956) 123-4567" → "956")
function getAreaCodeFromBranch(branchPhone) {
  if (!branchPhone) return null;
  const match = branchPhone.match(/\((\d{3})\)/);
  return match ? match[1] : null;
}

function SuggestionDropdown({ suggestions, onSelect, activeIndex }) {
  const itemRefs = useRef([]);
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
      {suggestions.map((s, i) => (
        <button
          key={i}
          ref={el => itemRefs.current[i] = el}
          onMouseDown={() => onSelect(s)}
          className={`w-full text-left px-3 py-2.5 border-b last:border-0 border-gray-100 ${
            i === activeIndex ? 'bg-indigo-100' : 'hover:bg-indigo-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">{s.fullName}</span>
            {s.blacklisted && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5"><Ban className="w-2.5 h-2.5" />BLACKLISTED</span>}
            {s.creditHold && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">CREDIT HOLD</span>}
            {s.companyName && <span className="text-xs text-gray-500">· {s.companyName}</span>}
          </div>
          <div className="text-xs text-gray-500 flex gap-3 mt-0.5">
            {s.phone && <span>📞 {s.phone}</span>}
            {s.email && <span>✉️ {s.email}</span>}
            {s.preferredBranch && <span className="text-gray-400">{s.preferredBranch}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

/** Top card: customer identity fields (phone first, then name, email, branch) */
export function CustomerIdentity({ customer, onChange, rentals = [], lines = [], onAddItems, currentUser, branchSettings = {} }) {
  const set = (field, value) => onChange({ ...customer, [field]: value });
  const [autoFilled, setAutoFilled] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [added, setAdded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState(null); // 'phone' | 'name' | 'email'
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dlScanFlash, setDlScanFlash] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [lastVerifiedPhone, setLastVerifiedPhone] = useState('');
  const phoneRef = useRef(null);
  const emailRef = useRef(null);

  // Load customer records once for lookup
  useEffect(() => {
    base44.entities.Customer.list('-created_date', 500).then(setCustomers);
  }, []);

  // Pre-populate branch from current user's branch if not already set
  useEffect(() => {
    if (!customer.branch && currentUser?.branch) {
      onChange({ ...customer, branch: currentUser.branch });
    }
  }, [currentUser]);

  // DL Scanner — fires when a USB ID scanner reads a driver's license
  useDLScanner((parsed) => {
    const dlFields = {
      name: parsed.fullName || customer.name,
      address: parsed.address || customer.address,
      city: parsed.city || customer.city,
      state: parsed.state || customer.state,
      zip: parsed.zip || customer.zip,
      _dlVerified: true,
      _dlLast4: parsed.dlLast4,
      _dlExpiry: parsed.expiry,
      _dlDob: parsed.dob,
    };

    // Try to find an existing customer record by last name match
    const lastName = parsed.lastName?.toLowerCase();
    const firstName = parsed.firstName?.toLowerCase();
    const matchedCustomer = lastName ? customers.find(c => {
      const nameLower = (c.fullName || '').toLowerCase();
      return nameLower.includes(lastName) && (!firstName || nameLower.includes(firstName.slice(0, 3)));
    }) : null;

    if (matchedCustomer) {
      // Merge DL address with customer record (DL address is authoritative)
      onChange({
        ...customer,
        name: matchedCustomer.fullName,
        phone: matchedCustomer.phone || customer.phone,
        email: matchedCustomer.email || customer.email,
        branch: matchedCustomer.preferredBranch || customer.branch,
        address: parsed.address || matchedCustomer.address || customer.address,
        city: parsed.city || matchedCustomer.city || customer.city,
        state: parsed.state || matchedCustomer.state || customer.state,
        zip: parsed.zip || matchedCustomer.zip || customer.zip,
        customerId: matchedCustomer.id,
        _blacklisted: matchedCustomer.blacklisted,
        _creditHold: matchedCustomer.creditHold,
        _creditHoldReason: matchedCustomer.creditHoldReason,
        _taxExempt: matchedCustomer.taxExempt,
        _dlVerified: true,
        _dlLast4: parsed.dlLast4,
        _dlExpiry: parsed.expiry,
        _dlDob: parsed.dob,
      });
    } else {
      // No match — fill from DL only
      onChange({ ...customer, ...dlFields });
    }

    setAutoFilled(true);
    setDlScanFlash(parsed.isExpired ? 'expired' : 'success');
    setTimeout(() => setDlScanFlash(null), 4000);
  });

  // Debounced customer history lookup (for nudges — still based on rental history)
  const history = useMemo(
    () => analyzeCustomerHistory(customer.name, rentals),
    [customer.name, rentals]
  );

  const [searchQuery, setSearchQuery] = useState('');

  const suggestions = useMemo(() => {
    setActiveIndex(-1);
    return buildCustomerSuggestions(searchQuery, customers);
  }, [searchQuery, customers]);

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      fillFromSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  const fillFromSuggestion = (s) => {
    onChange({
      ...customer,
      name: s.fullName || customer.name,
      phone: s.phone || customer.phone,
      email: s.email || customer.email,
      branch: s.preferredBranch || customer.branch,
      address: s.address || customer.address,
      city: s.city || customer.city,
      state: s.state || customer.state,
      zip: s.zip || customer.zip,
      customerId: s.id,
      // Pass through flags so the form can show warnings
      _blacklisted: s.blacklisted,
      _creditHold: s.creditHold,
      _creditHoldReason: s.creditHoldReason,
      _taxExempt: s.taxExempt,
    });
    setAutoFilled(true);
    setShowSuggestions(false);
  };

  // Reset flags when name or phone cleared
  useEffect(() => {
    if (!customer.name && !customer.phone) { setAutoFilled(false); setNudgeDismissed(false); setAdded(false); }
  }, [customer.name, customer.phone]);

  // Trigger verification when a complete phone number is entered (10 digits)
  useEffect(() => {
    const digits = (customer.phone || '').replace(/\D/g, '');
    if (digits.length === 10 && customer.phone !== lastVerifiedPhone) {
      setShowVerifyModal(true);
    }
  }, [customer.phone, lastVerifiedPhone]);

  const nudges = useMemo(
    () => history ? buildNudges(history.typicalItems, lines) : [],
    [history, lines]
  );

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-6 space-y-4 transition-all ${dlScanFlash === 'success' ? 'ring-2 ring-green-400' : dlScanFlash === 'expired' ? 'ring-2 ring-red-400' : ''}`}>

      {/* DL Scan Status Banner */}
      {dlScanFlash === 'success' && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span>✅ ID Scanned — customer info auto-filled. Please verify with the physical card.</span>
        </div>
      )}
      {dlScanFlash === 'expired' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-800 font-medium">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>⚠️ EXPIRED ID — This driver's license is expired. Do not accept.</span>
        </div>
      )}

      {/* Flag warnings when a known customer is matched */}
      {customer._blacklisted && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-2.5 text-sm text-red-800 font-bold">
          <Ban className="w-4 h-4 flex-shrink-0" />
          ⛔ BLACKLISTED — Do not rent to this customer.
        </div>
      )}
      {customer._creditHold && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-2.5 text-sm text-amber-800 font-semibold">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          ⚠️ CREDIT HOLD — Collect payment upfront.
          {customer._creditHoldReason && <span className="font-normal">Reason: {customer._creditHoldReason}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Name / DL */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
            Customer Name *
            <span className="flex items-center gap-1 text-indigo-400 font-normal" title="Scan driver's license to auto-fill">
              <ScanLine className="w-3.5 h-3.5" /> <span className="text-xs">Scan DL</span>
            </span>
          </label>
          <Input
            autoFocus
            placeholder="Search by name..."
            value={customer.name}
            onChange={e => { set('name', toTitleCase(e.target.value)); setSearchQuery(e.target.value); setShowSuggestions(true); setActiveSearchField('name'); setAutoFilled(false); }}
            onFocus={() => { setSearchQuery(customer.name); setShowSuggestions(true); setActiveSearchField('name'); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
          />
          {history && !showSuggestions && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">{history.rentalCount} past rental{history.rentalCount !== 1 ? 's' : ''}</span>
              </span>
              {customer._dlVerified && (
                <span className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">
                  <ScanLine className="w-3 h-3 text-indigo-500" />
                  <span className="text-xs text-indigo-700 font-medium">ID Verified · ···{customer._dlLast4}</span>
                  {customer._dlExpiry && <span className="text-xs text-gray-400">exp {customer._dlExpiry}</span>}
                </span>
              )}
            </div>
          )}
          {activeSearchField === 'name' && showSuggestions && suggestions.length > 0 && (
            <SuggestionDropdown suggestions={suggestions} onSelect={fillFromSuggestion} activeIndex={activeIndex} />
          )}
        </div>

        {/* Phone — required */}
         <div className="relative">
           <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1.5">
             Phone *
             {phoneVerified && customer.phone === lastVerifiedPhone && (
               <span className="flex items-center gap-1 text-green-600 font-normal text-xs">
                 <CheckCircle2 className="w-3.5 h-3.5" /> Verified
               </span>
             )}
           </label>
           <Input
             ref={phoneRef}
             placeholder={(() => {
               const areaCode = getAreaCodeFromBranch(branchSettings[customer.branch]?.phone);
               return areaCode ? `(${areaCode}) 123-4567` : '(956) 123-4567';
             })()}
             value={customer.phone}
             onChange={e => { set('phone', formatPhoneUS(e.target.value)); setSearchQuery(e.target.value.replace(/\D/g, '')); setShowSuggestions(true); setActiveSearchField('phone'); setAutoFilled(false); setPhoneVerified(false); }}
             onFocus={() => { setSearchQuery(customer.phone); setShowSuggestions(true); setActiveSearchField('phone'); }}
             onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
             onKeyDown={handleKeyDown}
             inputMode="numeric"
           />
           {activeSearchField === 'phone' && showSuggestions && suggestions.length > 0 && (
             <SuggestionDropdown suggestions={suggestions} onSelect={fillFromSuggestion} activeIndex={activeIndex} />
           )}
         </div>

        <div className="relative">
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <Input
            ref={emailRef}
            type="email"
            placeholder="john@example.com"
            value={customer.email}
            onChange={e => { set('email', e.target.value); setSearchQuery(e.target.value); setShowSuggestions(true); setActiveSearchField('email'); }}
            onFocus={() => { setSearchQuery(customer.email); setShowSuggestions(true); setActiveSearchField('email'); }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
          />
          {activeSearchField === 'email' && showSuggestions && suggestions.length > 0 && (
            <SuggestionDropdown suggestions={suggestions} onSelect={fillFromSuggestion} activeIndex={activeIndex} />
          )}
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
      </div>

      {/* Inline Risk Check — after DL / city/state/zip */}
      <CustomerRiskCheck customer={customer} rentals={rentals} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <Input
            placeholder="Special requests, delivery instructions..."
            value={customer.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

        {/* Secondary contact — spans next row after Notes for proper tab order */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Secondary Phone</label>
          <Input
            type="tel"
            placeholder="(956) 123-4567"
            value={customer.secondaryPhone || ''}
            onChange={e => set('secondaryPhone', formatPhoneUS(e.target.value))}
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Secondary Contact Name</label>
          <Input
            placeholder="e.g. Maria Gomez"
            value={customer.secondaryPhoneName || ''}
            onChange={e => set('secondaryPhoneName', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Relationship</label>
          <Input
            placeholder="e.g. Spouse, Parent, Employer"
            value={customer.secondaryPhoneRelation || ''}
            onChange={e => set('secondaryPhoneRelation', e.target.value)}
          />
        </div>
      </div>

      {/* Phone Verification Modal */}
      {showVerifyModal && customer.phone && (
        <PhoneVerificationModal
          customer={{ id: customer.customerId || customer.id, fullName: customer.name, phone: customer.phone }}
          currentUser={currentUser}
          onVerified={() => {
            setShowVerifyModal(false);
            setPhoneVerified(true);
            setLastVerifiedPhone(customer.phone);
            setTimeout(() => emailRef.current?.focus(), 50);
          }}
          onFailed={({ override } = {}) => {
            setShowVerifyModal(false);
            if (!override) setPhoneVerified(false);
            setTimeout(() => emailRef.current?.focus(), 50);
          }}
          onClose={() => {
            setShowVerifyModal(false);
            setTimeout(() => emailRef.current?.focus(), 50);
          }}
        />
      )}

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