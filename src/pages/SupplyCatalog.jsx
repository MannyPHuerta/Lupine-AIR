import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, AlertTriangle, Check, Package, ShoppingCart, History, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppPageHeader from '@/components/AppPageHeader';
import { useNavigate } from 'react-router-dom';
import PriceHistoryModal from '@/components/procurement/PriceHistoryModal';

const CATEGORIES = ['Office Supplies', 'Safety & PPE', 'Cleaning', 'Uniforms', 'Fuel', 'Breakroom', 'Technology', 'Printing', 'Maintenance', 'Other'];
const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];
const EMPTY = { name: '', category: 'Office Supplies', unit: 'each', preferredVendorId: '', preferredVendorName: '', lastUnitPrice: '', currentStock: 0, minStockLevel: 0, reorderQuantity: 1, branch: '', sku: '', notes: '', isActive: true };

function ItemForm({ item, vendors, onSave, onCancel }) {
  const [form, setForm] = useState(item || EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleVendorChange = (vendorId) => {
    const v = vendors.find(v => v.id === vendorId);
    set('preferredVendorId', vendorId);
    set('preferredVendorName', v?.name || '');
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, lastUnitPrice: form.lastUnitPrice ? parseFloat(form.lastUnitPrice) : null };
    const saved = item?.id
      ? await base44.entities.SupplyItem.update(item.id, data)
      : await base44.entities.SupplyItem.create(data);
    onSave(saved);
    setSaving(false);
  };

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-600">Item Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Category *</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Unit</label>
          <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="each, box, case..." className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Preferred Vendor</label>
          <select value={form.preferredVendorId} onChange={e => handleVendorChange(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">— None —</option>
            {vendors.filter(v => v.isActive).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Last Unit Price ($)</label>
          <input type="number" value={form.lastUnitPrice} onChange={e => set('lastUnitPrice', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Current Stock</label>
          <input type="number" value={form.currentStock} onChange={e => set('currentStock', parseFloat(e.target.value) || 0)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Min Stock Level</label>
          <input type="number" value={form.minStockLevel} onChange={e => set('minStockLevel', parseFloat(e.target.value) || 0)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Reorder Qty</label>
          <input type="number" value={form.reorderQuantity} onChange={e => set('reorderQuantity', parseFloat(e.target.value) || 1)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Branch</label>
          <select value={form.branch} onChange={e => set('branch', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">Company-wide</option>
            {BRANCHES.slice(1).map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Vendor SKU</label>
          <input value={form.sku} onChange={e => set('sku', e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs font-medium text-gray-600">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !form.name}>
          {saving ? 'Saving...' : <><Check className="w-3.5 h-3.5 mr-1" /> Save Item</>}
        </Button>
      </div>
    </div>
  );
}

export default function SupplyCatalog() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterCat, setFilterCat] = useState('All');
  const [filterBranch, setFilterBranch] = useState('All Branches');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [priceHistoryItem, setPriceHistoryItem] = useState(null);
  const [creatingDrafts, setCreatingDrafts] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.SupplyItem.list('name', 500),
      base44.entities.Vendor.list('name', 200),
    ]).then(([its, vens]) => { setItems(its.filter(i => i.isActive !== false)); setVendors(vens); setLoading(false); });
  }, []);

  const handleQuickReorder = (item) => {
    const params = new URLSearchParams({
      itemId: item.id,
      itemName: item.name,
      vendorId: item.preferredVendorId || '',
      qty: item.reorderQuantity || 1,
      unit: item.unit || 'each',
      price: item.lastUnitPrice || '',
      category: item.category || '',
    });
    navigate(`/purchase-order-new?${params.toString()}`);
  };

  const handleAutoCreateDraftPOs = async () => {
    const lowStock = items.filter(i => i.minStockLevel > 0 && i.currentStock <= i.minStockLevel && i.preferredVendorId);
    if (lowStock.length === 0) return;
    setCreatingDrafts(true);

    // Group by preferred vendor
    const byVendor = {};
    lowStock.forEach(item => {
      const v = vendors.find(v => v.id === item.preferredVendorId);
      if (!v) return;
      if (!byVendor[item.preferredVendorId]) byVendor[item.preferredVendorId] = { vendor: v, items: [] };
      byVendor[item.preferredVendorId].items.push(item);
    });

    const allPos = await base44.entities.PurchaseOrder.list('-created_date', 1);
    let nextNum = 1000 + allPos.length;

    for (const { vendor, items: vItems } of Object.values(byVendor)) {
      const lineItems = vItems.map(item => ({
        supplyItemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unit,
        qtyRequested: item.reorderQuantity || 1,
        unitPrice: item.lastUnitPrice || null,
        lineTotal: item.lastUnitPrice ? (item.reorderQuantity || 1) * item.lastUnitPrice : null,
        qtyReceived: 0,
      }));
      const total = lineItems.reduce((s, l) => s + (l.lineTotal || 0), 0);
      await base44.entities.PurchaseOrder.create({
        poNumber: `PO-${nextNum++}`,
        branch: items[0]?.branch || '01 McAllen',
        vendorId: vendor.id,
        vendorName: vendor.name,
        vendorEmail: vendor.email || '',
        lineItems,
        totalAmount: total,
        status: 'draft',
        notes: 'Auto-generated from low stock alert',
      });
    }
    setCreatingDrafts(false);
    navigate('/purchase-orders');
  };

  const filtered = useMemo(() => items.filter(i => {
    const catMatch = filterCat === 'All' || i.category === filterCat;
    const branchMatch = filterBranch === 'All Branches' || !i.branch || i.branch === filterBranch;
    const lowMatch = !lowStockOnly || (i.currentStock <= i.minStockLevel);
    return catMatch && branchMatch && lowMatch;
  }), [items, filterCat, filterBranch, lowStockOnly]);

  const lowStockCount = items.filter(i => i.currentStock <= i.minStockLevel && i.minStockLevel > 0).length;

  const handleSave = (saved) => {
    setItems(prev => prev.find(i => i.id === saved.id) ? prev.map(i => i.id === saved.id ? saved : i) : [saved, ...prev]);
    setAdding(false);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Supply Catalog"
        subtitle={`${items.length} items · ${lowStockCount > 0 ? `⚠️ ${lowStockCount} low stock` : 'All stocked'}`}
        action={
          <div className="flex gap-2">
            {lowStockCount > 0 && (
              <Button size="sm" variant="outline" onClick={handleAutoCreateDraftPOs} disabled={creatingDrafts} className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50">
                {creatingDrafts ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Auto-Draft POs ({lowStockCount})
              </Button>
            )}
            <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>
        }
      />
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} className="h-8 border rounded-lg px-3 text-sm bg-white">
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
          <button
            onClick={() => setLowStockOnly(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5 ${lowStockOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock Only
          </button>
        </div>

        {adding && <ItemForm vendors={vendors} onSave={handleSave} onCancel={() => setAdding(false)} />}

        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-20 text-sm">No items match your filters.</div>
        ) : (
          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Item</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Vendor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Min</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Last Price</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(item => {
                  const isLow = item.minStockLevel > 0 && item.currentStock <= item.minStockLevel;
                  return editingId === item.id ? (
                    <tr key={item.id}>
                      <td colSpan={8} className="p-3">
                        <ItemForm item={item} vendors={vendors} onSave={handleSave} onCancel={() => setEditingId(null)} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.id} className={isLow ? 'bg-amber-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.sku && <div className="text-xs text-gray-400">SKU: {item.sku}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-gray-600">{item.preferredVendorName || '—'}</td>
                      <td className="px-4 py-3 text-center font-medium">{item.currentStock} {item.unit}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{item.minStockLevel} {item.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.lastUnitPrice ? `$${item.lastUnitPrice.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="flex items-center justify-center gap-1 text-amber-600 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs font-medium">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Price History" onClick={() => setPriceHistoryItem(item)}>
                            <History className="w-3.5 h-3.5 text-indigo-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Quick Reorder" onClick={() => handleQuickReorder(item)}>
                            <ShoppingCart className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(item.id)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {priceHistoryItem && <PriceHistoryModal item={priceHistoryItem} onClose={() => setPriceHistoryItem(null)} />}
    </div>
  );
}