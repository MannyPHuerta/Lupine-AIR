import { useState, useEffect } from 'react';
import { X, Plus, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneUS } from '@/lib/phoneUtils';

const PAYMENT_DEFAULTS = {
  individual: 'due_on_receipt',
  business:   'net_30',
  municipal:  'net_30',
  nonprofit:  'net_30',
};

const EMPTY = {
  fullName: '',
  companyName: '',
  accountType: 'individual',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'TX',
  zip: '',
  paymentTerms: 'due_on_receipt',
  preferredBranch: '',
  notes: '',
  taxExempt: false,
  taxExemptCertNumber: '',
  taxExemptExpiry: '',
  linkedContacts: [],
};

const EMPTY_CONTACT = { name: '', role: '', phone: '', email: '', authorizedToRent: true };

function Field({ label, children, colSpan }) {
  return (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function NewCustomerModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('info'); // 'info' | 'contacts'

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // Auto-set payment terms when account type changes
  useEffect(() => {
    set('paymentTerms', PAYMENT_DEFAULTS[form.accountType] || 'due_on_receipt');
  }, [form.accountType]);

  const isCompany = form.accountType !== 'individual';

  const addContact = () => {
    set('linkedContacts', [...(form.linkedContacts || []), { ...EMPTY_CONTACT }]);
  };

  const updateContact = (idx, field, value) => {
    const updated = [...(form.linkedContacts || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    set('linkedContacts', updated);
  };

  const removeContact = (idx) => {
    set('linkedContacts', (form.linkedContacts || []).filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) { alert('Name is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">New Customer</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs — only show Contacts for non-individual */}
        {isCompany && (
          <div className="flex border-b px-5">
            {['info', 'contacts'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition capitalize ${
                  tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'contacts' ? `Contacts (${(form.linkedContacts || []).length})` : 'Info'}
              </button>
            ))}
          </div>
        )}

        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3">

          {/* ── INFO TAB ── */}
          {tab === 'info' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Account Type — first, drives everything else */}
              <Field label="Account Type">
                <select value={form.accountType} onChange={e => set('accountType', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="individual">👤 Individual</option>
                  <option value="business">🏢 Business</option>
                  <option value="municipal">🏛️ Municipal / Gov't</option>
                  <option value="nonprofit">🤝 Nonprofit</option>
                </select>
              </Field>

              <Field label={isCompany ? 'Primary Contact Name *' : 'Full Name *'}>
                <Input autoFocus value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  placeholder={isCompany ? 'John Doe (primary contact)' : 'John Doe'} />
              </Field>

              {isCompany && (
                <Field label="Company / Organization Name *" colSpan>
                  <Input value={form.companyName} onChange={e => set('companyName', e.target.value)}
                    placeholder="Acme Corp" />
                </Field>
              )}

              <Field label="Phone">
                <Input value={form.phone} onChange={e => set('phone', formatPhoneUS(e.target.value))}
                  placeholder="(956) 123-4567" inputMode="numeric" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="john@example.com" />
              </Field>

              <Field label="Address" colSpan>
                <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
              </Field>
              <Field label="City">
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="McAllen" />
              </Field>
              <Field label="State">
                <Input value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} placeholder="TX" />
              </Field>
              <Field label="Zip">
                <Input value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="78501" />
              </Field>

              {/* Payment Terms — auto-set but editable */}
              <Field label="Payment Terms">
                <select value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_60">Net 60</option>
                </select>
              </Field>

              <Field label="Preferred Branch">
                <select value={form.preferredBranch} onChange={e => set('preferredBranch', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm">
                  <option value="">— Any —</option>
                  <option>01 McAllen</option>
                  <option>02 Weslaco</option>
                  <option>03 Harlingen</option>
                  <option>05 Brownsville</option>
                  <option>06 Corpus</option>
                </select>
              </Field>

              {/* Tax Exemption — shown for municipal/nonprofit always, optional for business */}
              {(form.accountType === 'municipal' || form.accountType === 'nonprofit' || form.taxExempt) && (
                <div className="sm:col-span-2 border rounded-xl p-4 bg-green-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-800">🛡️ Tax Exemption</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.taxExempt}
                        onChange={e => set('taxExempt', e.target.checked)} className="w-4 h-4 accent-green-600" />
                      <span className="text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                  {form.taxExempt && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Certificate #</label>
                        <Input placeholder="Cert number" value={form.taxExemptCertNumber}
                          onChange={e => set('taxExemptCertNumber', e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
                        <Input type="date" value={form.taxExemptExpiry}
                          onChange={e => set('taxExemptExpiry', e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tax exempt toggle for business */}
              {form.accountType === 'business' && !form.taxExempt && (
                <div className="sm:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                    <input type="checkbox" checked={false}
                      onChange={e => set('taxExempt', e.target.checked)} className="w-4 h-4" />
                    Tax exempt account
                  </label>
                </div>
              )}

              <Field label="Internal Notes" colSpan>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Internal notes..." />
              </Field>
            </div>
          )}

          {/* ── CONTACTS TAB ── */}
          {tab === 'contacts' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Add authorized contacts who can pick up or rent equipment under this account.
              </p>
              {(form.linkedContacts || []).map((c, idx) => (
                <div key={idx} className="border rounded-xl p-4 space-y-2 relative bg-gray-50">
                  <button onClick={() => removeContact(idx)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <Input value={c.name} onChange={e => updateContact(idx, 'name', e.target.value)} placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Role / Title</label>
                      <Input value={c.role} onChange={e => updateContact(idx, 'role', e.target.value)} placeholder="Project Manager" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <Input value={c.phone} onChange={e => updateContact(idx, 'phone', formatPhoneUS(e.target.value))}
                        placeholder="(956) 000-0000" inputMode="numeric" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <Input type="email" value={c.email} onChange={e => updateContact(idx, 'email', e.target.value)}
                        placeholder="jane@company.com" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 mt-1">
                    <input type="checkbox" checked={c.authorizedToRent !== false}
                      onChange={e => updateContact(idx, 'authorizedToRent', e.target.checked)}
                      className="w-4 h-4 accent-indigo-600" />
                    Authorized to pick up / rent equipment
                  </label>
                </div>
              ))}
              <button onClick={addContact}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center gap-2">
                <UserPlus className="w-4 h-4" /> Add Authorized Contact
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create Customer'}</Button>
        </div>
      </div>
    </div>
  );
}