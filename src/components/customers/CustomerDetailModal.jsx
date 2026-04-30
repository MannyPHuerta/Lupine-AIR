import { useState } from 'react';
import {
  X, AlertTriangle, Ban, ShieldCheck, Phone, Mail, MapPin,
  Edit2, Trash2, ScanLine, CheckCircle2, Clock, CreditCard,
  FileText, User, Building2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAYMENT_TERMS_LABELS = {
  due_on_receipt: 'Due on Receipt',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_60: 'Net 60',
};

const STATUS_COLORS = {
  quote:      'bg-gray-100 text-gray-700',
  reservation:'bg-blue-100 text-blue-700',
  contract:   'bg-indigo-100 text-indigo-700',
  out:        'bg-yellow-100 text-yellow-700',
  returned:   'bg-purple-100 text-purple-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

const TABS = [
  { key: 'profile',   label: 'Profile' },
  { key: 'id',        label: 'ID / Verification' },
  { key: 'rentals',   label: 'Rental History' },
  { key: 'flags',     label: 'Flags & Terms' },
];

export default function CustomerDetailModal({ customer, rentals = [], onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...customer });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setEditing(false);
  };

  const sorted = [...rentals].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  const totalSpend = rentals.reduce((s, r) => s + (r.baseAmount || 0) + (r.taxAmount || 0), 0);
  const activeRentals = rentals.filter(r => ['out', 'contract', 'reservation'].includes(r.status));
  const outstandingBalance = rentals.reduce((s, r) => {
    const total = (r.baseAmount || 0) + (r.taxAmount || 0) + (r.deposit || 0);
    return s + Math.max(0, total - (r.amountPaid || 0));
  }, 0);

  const idExpired = customer.idVerified && customer.taxExemptExpiry
    ? new Date(customer.taxExemptExpiry) < new Date()
    : false;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              {customer.accountType === 'business' || customer.accountType === 'municipal'
                ? <Building2 className="w-5 h-5 text-indigo-600" />
                : <User className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">{customer.fullName}</h2>
              {customer.companyName && <p className="text-sm text-gray-500">{customer.companyName}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {customer.blacklisted && (
                  <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                    <Ban className="w-3 h-3" /> BLACKLISTED
                  </span>
                )}
                {customer.creditHold && (
                  <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                    <AlertTriangle className="w-3 h-3" /> CREDIT HOLD
                  </span>
                )}
                {customer.taxExempt && (
                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    <ShieldCheck className="w-3 h-3" /> TAX EXEMPT
                  </span>
                )}
                {customer.idVerified && (
                  <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
                    <ScanLine className="w-3 h-3" /> ID VERIFIED
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1">
                <Edit2 className="w-3 h-3" /> Edit
              </Button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-3 divide-x border-b bg-gray-50 text-center text-sm">
          <div className="py-3">
            <div className="font-bold text-gray-900">{rentals.length}</div>
            <div className="text-xs text-gray-500">Rentals</div>
          </div>
          <div className="py-3">
            <div className="font-bold text-gray-900">${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 0 })}</div>
            <div className="text-xs text-gray-500">Lifetime Spend</div>
          </div>
          <div className="py-3">
            <div className={`font-bold ${outstandingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${outstandingBalance.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">Outstanding</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.key === 'rentals' ? `Rentals (${rentals.length})` : tab.label}
              {tab.key === 'flags' && (customer.blacklisted || customer.creditHold) && (
                <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto">

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Full Name *">
                    <Input value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} />
                  </Field>
                  <Field label="Company Name">
                    <Input value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
                  </Field>
                  <Field label="Address" colSpan>
                    <Input value={form.address || ''} onChange={e => set('address', e.target.value)} />
                  </Field>
                  <Field label="City">
                    <Input value={form.city || ''} onChange={e => set('city', e.target.value)} />
                  </Field>
                  <Field label="State">
                    <Input value={form.state || ''} onChange={e => set('state', e.target.value)} maxLength={2} />
                  </Field>
                  <Field label="Zip">
                    <Input value={form.zip || ''} onChange={e => set('zip', e.target.value)} />
                  </Field>
                  <Field label="Account Type">
                    <select value={form.accountType || 'individual'} onChange={e => set('accountType', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="municipal">Municipal</option>
                      <option value="nonprofit">Nonprofit</option>
                    </select>
                  </Field>
                  <Field label="Preferred Branch">
                    <Input value={form.preferredBranch || ''} onChange={e => set('preferredBranch', e.target.value)} />
                  </Field>
                  <Field label="Internal Notes" colSpan>
                    <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)}
                      rows={2} className="w-full border rounded-md px-3 py-2 text-sm" />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Account Type" value={(customer.accountType || 'individual').replace('_', ' ')} />
                  <InfoRow label="Preferred Branch" value={customer.preferredBranch || '—'} />
                  {customer.phone && (
                    <InfoRow label="Phone" value={customer.phone} icon={<Phone className="w-3 h-3" />} />
                  )}
                  {customer.email && (
                    <InfoRow label="Email" value={customer.email} icon={<Mail className="w-3 h-3" />} />
                  )}
                  {(customer.address || customer.city) && (
                    <InfoRow label="Address"
                      value={[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                      icon={<MapPin className="w-3 h-3" />} colSpan />
                  )}
                  {customer.notes && <InfoRow label="Notes" value={customer.notes} colSpan />}
                </div>
              )}

              {editing && (
                <div className="flex justify-between pt-2 border-t">
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { if (confirm('Delete this customer record?')) onDelete(customer.id); }}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ ...customer }); }}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ID / VERIFICATION TAB ── */}
          {activeTab === 'id' && (
            <div className="space-y-4">

              {/* Verification status card */}
              <div className={`rounded-xl border-2 p-4 ${form.idVerified ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {form.idVerified
                      ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                      : <ScanLine className="w-5 h-5 text-gray-400" />}
                    <span className="font-semibold text-sm">
                      {form.idVerified ? 'ID Verified' : 'ID Not Yet Verified'}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.idVerified || false}
                      onChange={e => set('idVerified', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                    <span className="text-sm text-gray-700">Verified</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ID Type">
                    <select value={form.idType || ''} onChange={e => set('idType', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm bg-white">
                      <option value="">— Select —</option>
                      <option value="TX Driver's License">TX Driver's License</option>
                      <option value="Out-of-State DL">Out-of-State DL</option>
                      <option value="Passport">Passport</option>
                      <option value="Military ID">Military ID</option>
                      <option value="State ID">State ID</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                  <Field label="ID Last 4 Digits">
                    <Input placeholder="e.g. 1234" maxLength={4}
                      value={form.idNumber || ''} onChange={e => set('idNumber', e.target.value.replace(/\D/g, '').slice(0, 4))} />
                  </Field>
                </div>
              </div>

              {/* Scanner info — read-only display if data was auto-filled by DL scan */}
              {customer._dlVerified && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-indigo-800">
                    <ScanLine className="w-4 h-4" /> Scanned from Driver's License
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {customer._dlLast4 && <InfoRow label="DL Last 4" value={`···${customer._dlLast4}`} />}
                    {customer._dlExpiry && <InfoRow label="Expiry" value={customer._dlExpiry} />}
                    {customer._dlDob && <InfoRow label="Date of Birth" value={customer._dlDob} />}
                  </div>
                </div>
              )}

              {/* Tax exemption */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldCheck className="w-4 h-4 text-green-500" /> Tax Exempt
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.taxExempt || false}
                      onChange={e => set('taxExempt', e.target.checked)} className="w-4 h-4 accent-green-600" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                {form.taxExempt && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Certificate #">
                      <Input placeholder="Certificate number" value={form.taxExemptCertNumber || ''}
                        onChange={e => set('taxExemptCertNumber', e.target.value)} />
                    </Field>
                    <Field label="Expiry Date">
                      <Input type="date" value={form.taxExemptExpiry || ''}
                        onChange={e => set('taxExemptExpiry', e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {/* ── RENTAL HISTORY TAB ── */}
          {activeTab === 'rentals' && (
            <div className="space-y-2">
              {activeRentals.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800 font-medium mb-3">
                  ⚡ {activeRentals.length} active rental{activeRentals.length !== 1 ? 's' : ''} currently out
                </div>
              )}
              {sorted.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-10">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No rental history
                </div>
              ) : (
                sorted.map(r => {
                  const total = (r.baseAmount || 0) + (r.taxAmount || 0) + (r.deposit || 0);
                  const balance = total - (r.amountPaid || 0);
                  return (
                    <div key={r.id} className="border rounded-lg px-4 py-3 text-sm hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{r.equipmentName}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {r.startDate} – {r.endDate}
                            {r.branch && <span className="text-gray-400">· {r.branch}</span>}
                          </div>
                          {r.invoiceNumber && (
                            <div className="text-xs text-indigo-600 font-medium mt-0.5">{r.invoiceNumber}</div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-gray-900">${total.toFixed(0)}</div>
                          {balance > 0 && (
                            <div className="text-xs text-red-600 font-medium">Bal: ${balance.toFixed(0)}</div>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${STATUS_COLORS[r.status] || STATUS_COLORS.quote}`}>
                            {r.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── FLAGS & TERMS TAB ── */}
          {activeTab === 'flags' && (
            <div className="space-y-4">

              {/* Credit Hold */}
              <div className={`border-2 rounded-xl p-4 ${form.creditHold ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <AlertTriangle className={`w-4 h-4 ${form.creditHold ? 'text-amber-500' : 'text-gray-400'}`} />
                    Credit Hold
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.creditHold || false}
                      onChange={e => set('creditHold', e.target.checked)} className="w-4 h-4 accent-amber-500" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                {form.creditHold && (
                  <Input placeholder="Reason for credit hold..."
                    value={form.creditHoldReason || ''} onChange={e => set('creditHoldReason', e.target.value)} />
                )}
                {!form.creditHold && (
                  <p className="text-xs text-gray-400">Staff must collect payment upfront when this is active.</p>
                )}
              </div>

              {/* Blacklist */}
              <div className={`border-2 rounded-xl p-4 ${form.blacklisted ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Ban className={`w-4 h-4 ${form.blacklisted ? 'text-red-500' : 'text-gray-400'}`} />
                    Blacklist
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.blacklisted || false}
                      onChange={e => set('blacklisted', e.target.checked)} className="w-4 h-4 accent-red-500" />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                {form.blacklisted && (
                  <Input placeholder="Reason for blacklist..."
                    value={form.blacklistReason || ''} onChange={e => set('blacklistReason', e.target.value)} />
                )}
                {!form.blacklisted && (
                  <p className="text-xs text-gray-400">Do not rent to this customer. High-visibility alert shown on checkout.</p>
                )}
              </div>

              {/* Payment Terms */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-sm mb-3">
                  <CreditCard className="w-4 h-4 text-indigo-500" /> Payment Terms
                </div>
                <select value={form.paymentTerms || 'due_on_receipt'} onChange={e => set('paymentTerms', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_60">Net 60</option>
                </select>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Flags'}
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Field({ label, children, colSpan }) {
  return (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon, colSpan }) {
  return (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="flex items-center gap-1 text-gray-800 font-medium">{icon}{value}</div>
    </div>
  );
}