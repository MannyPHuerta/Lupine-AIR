import { useMemo, useState } from 'react';
import { User, Building2, AlertCircle, UserPlus, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';

export default function CustomerSearchPanel({ searchTerm, customers, onSelect, scannedDL }) {
  const [creating, setCreating] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState(null); // new customer awaiting phone
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.fullName?.toLowerCase().includes(term) ||
      c.companyName?.toLowerCase().includes(term) ||
      c.phone?.includes(searchTerm) ||
      c.email?.toLowerCase().includes(term)
    ).slice(0, 20);
  }, [searchTerm, customers]);

  const handleCreateFromScan = async () => {
    if (!scannedDL) return;
    setCreating(true);
    const newCustomer = await base44.entities.Customer.create({
      fullName: scannedDL.fullName,
      address: scannedDL.address,
      city: scannedDL.city,
      state: scannedDL.state,
      zip: scannedDL.zip,
      idVerified: true,
      idType: `${scannedDL.state} Driver's License`,
      idNumber: scannedDL.dlLast4,
      source: 'manual',
    });
    setCreating(false);
    setPendingCustomer(newCustomer); // pause — ask for phone before proceeding
    setPhone('');
  };

  const handleConfirmPhone = async () => {
    setSavingPhone(true);
    const updated = await base44.entities.Customer.update(pendingCustomer.id, { phone });
    setSavingPhone(false);
    onSelect({ ...pendingCustomer, phone });
    setPendingCustomer(null);
  };

  // Phone capture step after DL scan creates a new customer
  if (pendingCustomer) {
    return (
      <div className="space-y-4 py-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
          ✅ <strong>{pendingCustomer.fullName}</strong> created from DL scan
        </div>
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Phone className="w-4 h-4 text-indigo-600" />
            Enter Phone Number
          </div>
          <p className="text-xs text-gray-500">Phone number isn't on the DL — enter it now before proceeding.</p>
          <Input
            type="tel"
            placeholder="(956) 555-0100"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && phone && handleConfirmPhone()}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleConfirmPhone}
              disabled={!phone || savingPhone}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded disabled:opacity-50 transition"
            >
              {savingPhone ? 'Saving…' : 'Continue →'}
            </button>
            <button
              onClick={() => onSelect(pendingCustomer)}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border rounded transition"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!searchTerm.trim()) {
    return (
      <div className="text-center text-gray-400 text-xs py-8">
        Start typing to search customers
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center text-gray-400 text-xs py-8 space-y-3">
        <div>No customers found</div>
        {scannedDL && (
          <button
            onClick={handleCreateFromScan}
            disabled={creating}
            className="mx-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {creating ? 'Creating…' : `Create "${scannedDL.fullName}" from scan`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filtered.map(c => (
        <button
          key={c.id}
          onClick={() => onSelect(c)}
          className="w-full text-left p-3 border rounded hover:bg-indigo-50 hover:border-indigo-300 transition group"
        >
          <div className="flex items-start gap-2">
            <div className="mt-1">
              {c.accountType === 'business' ? (
                <Building2 className="w-4 h-4 text-gray-400" />
              ) : (
                <User className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 group-hover:text-indigo-700 truncate">
                {c.fullName}
              </div>
              {c.companyName && (
                <div className="text-xs text-gray-600 truncate">{c.companyName}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {c.phone} · {c.city || 'No city'}
              </div>
            </div>
            {(c.creditHold || c.blacklisted) && (
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${c.blacklisted ? 'text-red-600' : 'text-orange-500'}`} />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}