import { useMemo, useState } from 'react';
import { User, Building2, AlertCircle, UserPlus, Phone, CheckCircle2, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import PhoneVerificationModal from './PhoneVerificationModal';

export default function CustomerSearchPanel({ searchTerm, customers, onSelect, scannedDL, currentUser }) {
  const [creating, setCreating] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState(null);
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [secondaryPhoneName, setSecondaryPhoneName] = useState('');
  const [secondaryPhoneRelation, setSecondaryPhoneRelation] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null); // null | 'verified' | 'failed' | 'override'

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
    setPendingCustomer(newCustomer);
    setPhone('');
    setSecondaryPhone('');
    setSecondaryPhoneName('');
    setSecondaryPhoneRelation('');
    setVerificationResult(null);
  };

  // Called after phone is entered — show verification modal
  const handlePhoneEntered = () => {
    if (!phone) return;
    setShowVerifyModal(true);
  };

  // After verification completes (success or override), save everything and proceed
  const handleVerified = async () => {
    setShowVerifyModal(false);
    setVerificationResult('verified');
    setSavingPhone(true);
    const updated = await base44.entities.Customer.update(pendingCustomer.id, {
      phone,
      phoneVerified: true,
      phoneVerifiedAt: new Date().toISOString(),
      phoneVerifiedBy: currentUser?.email || 'counter',
      secondaryPhone: secondaryPhone || undefined,
      secondaryPhoneName: secondaryPhoneName || undefined,
      secondaryPhoneRelation: secondaryPhoneRelation || undefined,
    });
    setSavingPhone(false);
    onSelect({ ...pendingCustomer, phone, phoneVerified: true, secondaryPhone, secondaryPhoneName, secondaryPhoneRelation });
    setPendingCustomer(null);
  };

  const handleVerificationFailed = async ({ override } = {}) => {
    setShowVerifyModal(false);
    if (override) {
      setVerificationResult('override');
      // Log the override, then allow select
      await base44.entities.Customer.update(pendingCustomer.id, {
        phone,
        phoneVerified: false,
        secondaryPhone: secondaryPhone || undefined,
        secondaryPhoneName: secondaryPhoneName || undefined,
        secondaryPhoneRelation: secondaryPhoneRelation || undefined,
      });
      onSelect({ ...pendingCustomer, phone, phoneVerified: false, secondaryPhone, secondaryPhoneName, secondaryPhoneRelation });
      setPendingCustomer(null);
    } else {
      setVerificationResult('failed');
    }
  };

  // Handle existing customer selected — check if they have a phone and show verify modal
  const handleSelectExisting = (c) => {
    if (c.phone) {
      // Show verify modal inline for existing customer
      setPendingCustomer(c);
      setPhone(c.phone);
      setSecondaryPhone(c.secondaryPhone || '');
      setSecondaryPhoneName(c.secondaryPhoneName || '');
      setSecondaryPhoneRelation(c.secondaryPhoneRelation || '');
      setVerificationResult(null);
      setShowVerifyModal(true);
    } else {
      onSelect(c);
    }
  };

  // Always render modal on top if active
  if (showVerifyModal && pendingCustomer) {
    return (
      <PhoneVerificationModal
        customer={{ ...pendingCustomer, phone }}
        currentUser={currentUser}
        onVerified={handleVerified}
        onFailed={handleVerificationFailed}
        onClose={() => {
          setShowVerifyModal(false);
          setPendingCustomer(null);
        }}
      />
    );
  }

  // Phone capture step (new customer from scan, no phone yet)
  if (pendingCustomer) {
    return (
      <div className="space-y-4 py-2">
        <div className={`border rounded-lg p-3 text-xs ${
          verificationResult === 'failed'
            ? 'bg-red-50 border-red-400 text-red-800'
            : verificationResult === 'override'
            ? 'bg-orange-50 border-orange-400 text-orange-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          {verificationResult === 'failed' ? (
            <><ShieldAlert className="w-4 h-4 inline mr-1" /> <strong>Phone verification failed.</strong> Ask customer for a valid number.</>
          ) : verificationResult === 'override' ? (
            <><ShieldAlert className="w-4 h-4 inline mr-1" /> <strong>Override applied</strong> — rental proceeding without verified phone. Logged.</>
          ) : (
            <>✅ <strong>{pendingCustomer.fullName}</strong> {pendingCustomer.id ? 'loaded' : 'created from DL scan'}</>
          )}
        </div>

        <div className="bg-white border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Phone className="w-4 h-4 text-indigo-600" />
            Primary Phone
            {verificationResult === 'verified' && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
          </div>
          <Input
            type="tel"
            placeholder="(956) 555-0100"
            value={phone}
            onChange={e => { setPhone(e.target.value); setVerificationResult(null); }}
            onKeyDown={e => e.key === 'Enter' && phone && handlePhoneEntered()}
            className={`text-sm ${verificationResult === 'failed' ? 'border-red-300' : ''}`}
            autoFocus
          />
          <button
            onClick={handlePhoneEntered}
            disabled={!phone}
            className={`w-full py-2 text-white text-xs font-semibold rounded disabled:opacity-50 transition ${
              verificationResult === 'failed' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {verificationResult === 'failed' ? 'Retry Verification →' : phone ? 'Verify Phone →' : 'Enter phone to continue'}
          </button>
        </div>

        {phone && (
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Phone className="w-4 h-4 text-gray-400" />
              Secondary Contact <span className="text-xs font-normal text-gray-400">(optional)</span>
            </div>
            <Input type="tel" placeholder="Secondary phone number" value={secondaryPhone} onChange={e => setSecondaryPhone(e.target.value)} className="text-sm" />
            <Input placeholder="Contact name (e.g. Maria Gomez)" value={secondaryPhoneName} onChange={e => setSecondaryPhoneName(e.target.value)} className="text-sm" />
            <Input placeholder="Relationship (e.g. Spouse, Parent, Employer)" value={secondaryPhoneRelation} onChange={e => setSecondaryPhoneRelation(e.target.value)} className="text-sm" />
          </div>
        )}
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
          onClick={() => handleSelectExisting(c)}
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
              <div className="font-medium text-gray-900 group-hover:text-indigo-700 truncate">{c.fullName}</div>
              {c.companyName && <div className="text-xs text-gray-600 truncate">{c.companyName}</div>}
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {c.phone}
                {c.phoneVerified && <CheckCircle2 className="w-3 h-3 text-green-500" title="Phone verified" />}
                · {c.city || 'No city'}
              </div>
              {c.secondaryPhone && (
                <div className="text-xs text-gray-400">Alt: {c.secondaryPhone} {c.secondaryPhoneRelation ? `(${c.secondaryPhoneRelation})` : ''}</div>
              )}
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