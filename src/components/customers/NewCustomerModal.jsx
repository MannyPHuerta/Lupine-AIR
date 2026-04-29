import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneUS } from '@/lib/phoneUtils';

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
};

export default function NewCustomerModal({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.fullName.trim()) { alert('Name is required'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-gray-900">New Customer</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
              <Input
                autoFocus
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
              <Input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
              <select
                value={form.accountType}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <Input
                value={form.phone}
                onChange={e => set('phone', formatPhoneUS(e.target.value))}
                placeholder="(956) 123-4567"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="McAllen" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <Input value={form.state} onChange={e => set('state', e.target.value.toUpperCase())} maxLength={2} placeholder="TX" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zip</label>
              <Input value={form.zip} onChange={e => set('zip', e.target.value)} placeholder="78501" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
              <select
                value={form.paymentTerms}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Internal notes..."
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create Customer'}</Button>
        </div>
      </div>
    </div>
  );
}