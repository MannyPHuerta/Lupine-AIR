import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppPageHeader from '@/components/AppPageHeader';

const CATEGORIES = ['Office Supplies', 'Safety & PPE', 'Cleaning', 'Uniforms', 'Fuel', 'Breakroom', 'Technology', 'Printing', 'Maintenance', 'Other'];

const EMPTY = { name: '', category: 'Office Supplies', contactName: '', phone: '', email: '', website: '', accountNumber: '', paymentTerms: '', notes: '', isActive: true };

function VendorForm({ vendor, onSave, onCancel }) {
  const [form, setForm] = useState(vendor || EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (vendor?.id) {
      const updated = await base44.entities.Vendor.update(vendor.id, form);
      onSave(updated);
    } else {
      const created = await base44.entities.Vendor.create(form);
      onSave(created);
    }
    setSaving(false);
  };

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Vendor Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Category *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Contact Name</label>
          <input value={form.contactName} onChange={e => set('contactName', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Email</label>
          <input value={form.email} onChange={e => set('email', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Website</label>
          <input value={form.website} onChange={e => set('website', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Account #</label>
          <input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Payment Terms</label>
          <input value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} placeholder="e.g. Net 30" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-600">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? 'Saving...' : <><Check className="w-3.5 h-3.5 mr-1" /> Save Vendor</>}
        </Button>
      </div>
    </div>
  );
}

export default function VendorManager() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    base44.entities.Vendor.list('-created_date', 200).then(v => { setVendors(v); setLoading(false); });
  }, []);

  const handleSave = (saved) => {
    setVendors(prev => prev.find(v => v.id === saved.id) ? prev.map(v => v.id === saved.id ? saved : v) : [saved, ...prev]);
    setAdding(false);
    setEditingId(null);
  };

  const handleToggleActive = async (vendor) => {
    const updated = await base44.entities.Vendor.update(vendor.id, { isActive: !vendor.isActive });
    setVendors(prev => prev.map(v => v.id === vendor.id ? updated : v));
  };

  const CATEGORY_COLORS = {
    'Office Supplies': 'bg-blue-100 text-blue-700',
    'Safety & PPE': 'bg-orange-100 text-orange-700',
    'Cleaning': 'bg-cyan-100 text-cyan-700',
    'Uniforms': 'bg-purple-100 text-purple-700',
    'Fuel': 'bg-yellow-100 text-yellow-700',
    'Breakroom': 'bg-green-100 text-green-700',
    'Technology': 'bg-indigo-100 text-indigo-700',
    'Printing': 'bg-pink-100 text-pink-700',
    'Maintenance': 'bg-red-100 text-red-700',
    'Other': 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Vendor Directory"
        subtitle="Manage approved supply vendors"
        action={
          <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Vendor
          </Button>
        }
      />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {adding && <VendorForm onSave={handleSave} onCancel={() => setAdding(false)} />}
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center text-gray-400 py-20 text-sm">No vendors yet. Add your first vendor above.</div>
        ) : (
          <div className="space-y-2">
            {vendors.map(vendor => (
              <div key={vendor.id}>
                {editingId === vendor.id ? (
                  <VendorForm vendor={vendor} onSave={handleSave} onCancel={() => setEditingId(null)} />
                ) : (
                  <div className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-3 ${!vendor.isActive ? 'opacity-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{vendor.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[vendor.category] || 'bg-gray-100 text-gray-600'}`}>{vendor.category}</span>
                        {!vendor.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
                        {vendor.contactName && <span>{vendor.contactName}</span>}
                        {vendor.phone && <span>{vendor.phone}</span>}
                        {vendor.email && <span>{vendor.email}</span>}
                        {vendor.accountNumber && <span>Acct: {vendor.accountNumber}</span>}
                        {vendor.paymentTerms && <span>{vendor.paymentTerms}</span>}
                      </div>
                      {vendor.notes && <div className="mt-1 text-xs text-gray-400 italic">{vendor.notes}</div>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(vendor.id)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" onClick={() => handleToggleActive(vendor)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}