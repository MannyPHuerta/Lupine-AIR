import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppPageHeader from '@/components/AppPageHeader';
import { useNavigate } from 'react-router-dom';

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

export default function NewPurchaseOrder() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [supplyItems, setSupplyItems] = useState([]);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    branch: '01 McAllen',
    vendorId: '',
    vendorName: '',
    vendorEmail: '',
    expectedDeliveryDate: '',
    isUrgent: false,
    notes: '',
  });
  const [lineItems, setLineItems] = useState([{ supplyItemId: '', itemName: '', category: '', unit: 'each', qtyRequested: 1, unitPrice: '', lineTotal: '' }]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    Promise.all([
      base44.entities.Vendor.list('name', 200),
      base44.entities.SupplyItem.list('name', 500),
      base44.auth.me(),
    ]).then(([vens, items, me]) => {
      setVendors(vens.filter(v => v.isActive !== false));
      setSupplyItems(items.filter(i => i.isActive !== false));
      setUser(me);

      // Pre-fill from quick reorder query params
      const itemId = params.get('itemId');
      if (itemId) {
        const qty = parseFloat(params.get('qty')) || 1;
        const price = parseFloat(params.get('price')) || '';
        const lineTotal = qty && price ? (qty * price).toFixed(2) : '';
        setLineItems([{
          supplyItemId: itemId,
          itemName: params.get('itemName') || '',
          category: params.get('category') || '',
          unit: params.get('unit') || 'each',
          qtyRequested: qty,
          unitPrice: price,
          lineTotal,
        }]);
        const vendorId = params.get('vendorId');
        if (vendorId) {
          const v = vens.find(v => v.id === vendorId);
          if (v) setForm(f => ({ ...f, vendorId: v.id, vendorName: v.name, vendorEmail: v.email || '' }));
        }
      }
    });
  }, []);

  const setFormField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleVendorChange = (vendorId) => {
    const v = vendors.find(v => v.id === vendorId);
    setForm(f => ({ ...f, vendorId, vendorName: v?.name || '', vendorEmail: v?.email || '' }));
  };

  const handleLineItemChange = (idx, key, value) => {
    setLineItems(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [key]: value };
      if (key === 'supplyItemId') {
        const item = supplyItems.find(i => i.id === value);
        if (item) {
          updated[idx].itemName = item.name;
          updated[idx].category = item.category;
          updated[idx].unit = item.unit;
          updated[idx].unitPrice = item.lastUnitPrice || '';
        }
      }
      if (key === 'qtyRequested' || key === 'unitPrice') {
        const qty = parseFloat(key === 'qtyRequested' ? value : updated[idx].qtyRequested) || 0;
        const price = parseFloat(key === 'unitPrice' ? value : updated[idx].unitPrice) || 0;
        updated[idx].lineTotal = qty && price ? (qty * price).toFixed(2) : '';
      }
      return updated;
    });
  };

  const addLine = () => setLineItems(prev => [...prev, { supplyItemId: '', itemName: '', category: '', unit: 'each', qtyRequested: 1, unitPrice: '', lineTotal: '' }]);
  const removeLine = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const totalAmount = lineItems.reduce((sum, l) => sum + (parseFloat(l.lineTotal) || 0), 0);

  const handleSave = async (status = 'draft') => {
    setSaving(true);
    const poCount = await base44.entities.PurchaseOrder.list('-created_date', 1);
    const nextNum = (poCount.length > 0 ? 1000 : 1000) + poCount.length;
    const poNumber = `PO-${nextNum}`;

    const lines = lineItems.filter(l => l.itemName).map(l => ({
      ...l,
      qtyRequested: parseFloat(l.qtyRequested) || 0,
      unitPrice: parseFloat(l.unitPrice) || null,
      lineTotal: parseFloat(l.lineTotal) || null,
      qtyReceived: 0,
    }));

    const created = await base44.entities.PurchaseOrder.create({
      ...form,
      poNumber,
      lineItems: lines,
      totalAmount,
      status,
      requestedBy: user?.email || '',
    });
    setSaving(false);
    navigate('/purchase-orders');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader title="New Purchase Order" subtitle="Create a supply order" backTo="/purchase-orders" />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header fields */}
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">Order Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Branch *</label>
              <select value={form.branch} onChange={e => setFormField('branch', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
                {BRANCHES.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Vendor *</label>
              <select value={form.vendorId} onChange={e => handleVendorChange(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">— Select vendor —</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Vendor Email</label>
              <input value={form.vendorEmail} onChange={e => setFormField('vendorEmail', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Auto-filled from vendor" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Expected Delivery</label>
              <input type="date" value={form.expectedDeliveryDate} onChange={e => setFormField('expectedDeliveryDate', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600">Notes / Special Instructions</label>
              <textarea value={form.notes} onChange={e => setFormField('notes', e.target.value)} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="urgent" checked={form.isUrgent} onChange={e => setFormField('isUrgent', e.target.checked)} className="rounded" />
              <label htmlFor="urgent" className="text-sm text-gray-700 font-medium">🚨 Mark as Urgent / Rush</label>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Line Items</h3>
            <Button size="sm" variant="outline" onClick={addLine} className="gap-1 text-xs"><Plus className="w-3.5 h-3.5" /> Add Item</Button>
          </div>
          {lineItems.map((line, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-3 last:border-0">
              <div className="col-span-5">
                {idx === 0 && <label className="text-xs font-medium text-gray-500 block mb-1">Item</label>}
                <select
                  value={line.supplyItemId}
                  onChange={e => handleLineItemChange(idx, 'supplyItemId', e.target.value)}
                  className="w-full border rounded-lg px-2 py-2 text-xs bg-white"
                >
                  <option value="">— Custom item —</option>
                  {supplyItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                {!line.supplyItemId && (
                  <input
                    value={line.itemName}
                    onChange={e => handleLineItemChange(idx, 'itemName', e.target.value)}
                    placeholder="Item name"
                    className="mt-1 w-full border rounded-lg px-2 py-2 text-xs"
                  />
                )}
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="text-xs font-medium text-gray-500 block mb-1">Unit</label>}
                <input value={line.unit} onChange={e => handleLineItemChange(idx, 'unit', e.target.value)} className="w-full border rounded-lg px-2 py-2 text-xs" placeholder="each" />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="text-xs font-medium text-gray-500 block mb-1">Qty</label>}
                <input type="number" value={line.qtyRequested} onChange={e => handleLineItemChange(idx, 'qtyRequested', e.target.value)} className="w-full border rounded-lg px-2 py-2 text-xs" />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="text-xs font-medium text-gray-500 block mb-1">Unit $</label>}
                <input type="number" value={line.unitPrice} onChange={e => handleLineItemChange(idx, 'unitPrice', e.target.value)} placeholder="0.00" className="w-full border rounded-lg px-2 py-2 text-xs" />
              </div>
              <div className="col-span-1 flex justify-end">
                {lineItems.length > 1 && (
                  <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {totalAmount > 0 && (
            <div className="text-right font-semibold text-gray-800 text-sm pt-1">
              Estimated Total: ${totalAmount.toFixed(2)}
            </div>
          )}
        </div>

        {/* Save buttons */}
        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving || !form.vendorId}>
            Save as Draft
          </Button>
          <Button onClick={() => handleSave('pending_approval')} disabled={saving || !form.vendorId || lineItems.every(l => !l.itemName)}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Approval'}
          </Button>
        </div>
      </div>
    </div>
  );
}