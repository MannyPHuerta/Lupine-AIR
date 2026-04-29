import { useState } from 'react';
import { X, AlertTriangle, Ban, ShieldCheck, Phone, Mail, MapPin, Edit2, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAYMENT_TERMS_LABELS = {
  due_on_receipt: 'Due on Receipt',
  net_15: 'Net 15',
  net_30: 'Net 30',
  net_60: 'Net 60',
};

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

  const totalSpend = rentals.reduce((s, r) => s + (r.baseAmount || 0) + (r.taxAmount || 0), 0);
  const recentRentals = [...rentals].sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')).slice(0, 10);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{customer.fullName}</h2>
            {customer.companyName && <p className="text-sm text-gray-500">{customer.companyName}</p>}
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

        {/* Status Flags */}
        {(customer.blacklisted || customer.creditHold) && (
          <div className="px-5 py-3 flex gap-3 flex-wrap">
            {customer.blacklisted && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <Ban className="w-4 h-4 text-red-600" />
                <div>
                  <div className="text-xs font-bold text-red-700">BLACKLISTED</div>
                  {customer.blacklistReason && <div className="text-xs text-red-600">{customer.blacklistReason}</div>}
                </div>
              </div>
            )}
            {customer.creditHold && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <div>
                  <div className="text-xs font-bold text-amber-700">CREDIT HOLD</div>
                  {customer.creditHoldReason && <div className="text-xs text-amber-600">{customer.creditHoldReason}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b">
          {['profile', 'rentals', 'flags'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition ${
                activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'rentals' ? `Rentals (${rentals.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                    <Input value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                    <Input value={form.companyName || ''} onChange={e => set('companyName', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                    <Input value={form.address || ''} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <Input value={form.city || ''} onChange={e => set('city', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                    <Input value={form.state || ''} onChange={e => set('state', e.target.value)} maxLength={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Zip</label>
                    <Input value={form.zip || ''} onChange={e => set('zip', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
                    <select
                      value={form.accountType || 'individual'}
                      onChange={e => set('accountType', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="municipal">Municipal</option>
                      <option value="nonprofit">Nonprofit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
                    <select
                      value={form.paymentTerms || 'due_on_receipt'}
                      onChange={e => set('paymentTerms', e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    >
                      <option value="due_on_receipt">Due on Receipt</option>
                      <option value="net_15">Net 15</option>
                      <option value="net_30">Net 30</option>
                      <option value="net_60">Net 60</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
                    <textarea
                      value={form.notes || ''}
                      onChange={e => set('notes', e.target.value)}
                      rows={2}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <InfoRow label="Account Type" value={customer.accountType?.replace('_', ' ') || 'Individual'} />
                  <InfoRow label="Payment Terms" value={PAYMENT_TERMS_LABELS[customer.paymentTerms] || 'Due on Receipt'} />
                  {customer.phone && <InfoRow label="Phone" value={customer.phone} icon={<Phone className="w-3 h-3" />} />}
                  {customer.email && <InfoRow label="Email" value={customer.email} icon={<Mail className="w-3 h-3" />} />}
                  {customer.address && (
                    <InfoRow
                      label="Address"
                      value={[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                      icon={<MapPin className="w-3 h-3" />}
                      colSpan
                    />
                  )}
                  {customer.taxExempt && (
                    <InfoRow label="Tax Exemption #" value={`${customer.taxExemptCertNumber || 'On file'}${customer.taxExemptExpiry ? ` (expires ${customer.taxExemptExpiry})` : ''}`} />
                  )}
                  {customer.notes && <InfoRow label="Notes" value={customer.notes} colSpan />}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <StatBox label="Total Rentals" value={rentals.length} />
                <StatBox label="Lifetime Spend" value={`$${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 0 })}`} />
                <StatBox label="Preferred Branch" value={customer.preferredBranch || '—'} />
              </div>

              {editing && (
                <div className="flex justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { if (confirm('Delete this customer record?')) onDelete(customer.id); }}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm({ ...customer }); }}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rentals Tab */}
          {activeTab === 'rentals' && (
            <div className="space-y-2">
              {recentRentals.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No rental history</p>
              ) : (
                recentRentals.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900">{r.equipmentName}</div>
                      <div className="text-xs text-gray-500">{r.startDate} – {r.endDate} · {r.branch}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800">${((r.baseAmount || 0) + (r.taxAmount || 0)).toFixed(0)}</div>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Flags Tab */}
          {activeTab === 'flags' && (
            <div className="space-y-4">
              {/* Credit Hold */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Credit Hold
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.creditHold || false}
                      onChange={e => set('creditHold', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                {form.creditHold && (
                  <Input
                    placeholder="Reason for credit hold..."
                    value={form.creditHoldReason || ''}
                    onChange={e => set('creditHoldReason', e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>

              {/* Blacklist */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Ban className="w-4 h-4 text-red-500" />
                    Blacklist
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.blacklisted || false}
                      onChange={e => set('blacklisted', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                {form.blacklisted && (
                  <Input
                    placeholder="Reason for blacklist..."
                    value={form.blacklistReason || ''}
                    onChange={e => set('blacklistReason', e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>

              {/* Tax Exempt */}
              <div className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Tax Exempt
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.taxExempt || false}
                      onChange={e => set('taxExempt', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                </div>
                {form.taxExempt && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      placeholder="Certificate #"
                      value={form.taxExemptCertNumber || ''}
                      onChange={e => set('taxExemptCertNumber', e.target.value)}
                    />
                    <Input
                      type="date"
                      value={form.taxExemptExpiry || ''}
                      onChange={e => set('taxExemptExpiry', e.target.value)}
                    />
                  </div>
                )}
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

function InfoRow({ label, value, icon, colSpan }) {
  return (
    <div className={colSpan ? 'sm:col-span-2' : ''}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="flex items-center gap-1 text-gray-800 font-medium">{icon}{value}</div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-base font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}