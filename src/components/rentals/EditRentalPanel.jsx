/**
 * EditRentalPanel — focused slide-in panel to edit an existing order.
 * Editable: customer info, addresses, dates, line items (add/remove), status, notes.
 * Does NOT re-do signature or payment — those stay as-is.
 */
import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import SignaturePad from '@/components/invoice/SignaturePad';

const STATUSES = ['quote', 'reservation', 'contract', 'out', 'returned', 'completed', 'cancelled'];

export default function EditRentalPanel({ order, equipment, onClose, onSaved }) {
  // Flatten order into editable form state
  const [form, setForm] = useState({
    customerName: order.customer.name || '',
    customerPhone: order.customer.phone || '',
    customerEmail: order.customer.email || '',
    branch: order.customer.branch || '',
    notes: order.customer.notes || '',
    status: order.status || 'contract',
    deliveryMethod: order.deliveryMethod || 'customer_pickup',
    returnMethod: order.returnMethod || 'customer_return',
    worksiteAddress: order.worksiteAddress || '',
    worksiteCity: order.worksiteCity || '',
    worksiteState: order.worksiteState || 'TX',
    worksiteZip: order.worksiteZip || '',
  });

  // Lines: each line corresponds to one rental record
  const [lines, setLines] = useState(
    order.lines.map(l => ({
      rentalId: l.rentalId,
      equipmentId: l.equipmentId || '',
      equipmentName: l.equipmentName || '',
      startDate: l.startDate || '',
      endDate: l.endDate || '',
      dailyRate: l.rate || 0,
      baseAmount: l.baseAmount || 0,
      deposit: l.deposit || 0,
      taxable: l.taxable !== false,
      isNew: false,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(order.signatureDataUrl || null);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const updateLine = (idx, field, val) => {
    setLines(ls => ls.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [field]: val };
      // Recalculate baseAmount when rate or dates change
      if (field === 'dailyRate' || field === 'startDate' || field === 'endDate') {
        const start = new Date(updated.startDate);
        const end = new Date(updated.endDate);
        const days = isNaN(start) || isNaN(end) ? 1 : Math.max(1, Math.ceil((end - start) / 86400000));
        updated.baseAmount = Math.round(parseFloat(updated.dailyRate || 0) * days * 100) / 100;
      }
      return updated;
    }));
  };

  const addLine = () => {
    setLines(ls => [...ls, {
      rentalId: null,
      equipmentId: '',
      equipmentName: '',
      startDate: lines[0]?.startDate || '',
      endDate: lines[0]?.endDate || '',
      dailyRate: 0,
      baseAmount: 0,
      deposit: 0,
      taxable: true,
      isNew: true,
    }]);
  };

  const removeLine = (idx) => {
    setLines(ls => ls.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sharedFields = {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        branch: form.branch,
        notes: form.notes,
        status: form.status,
        deliveryMethod: form.deliveryMethod,
        returnMethod: form.returnMethod,
        worksiteAddress: form.worksiteAddress,
        worksiteCity: form.worksiteCity,
        worksiteState: form.worksiteState,
        worksiteZip: form.worksiteZip,
      };

      // Update existing lines
      for (const line of lines) {
        if (line.isNew) {
          // Create new rental record
          await base44.entities.Rental.create({
            ...sharedFields,
            equipmentId: line.equipmentId,
            equipmentName: line.equipmentName,
            startDate: line.startDate,
            endDate: line.endDate,
            baseAmount: line.baseAmount,
            taxRate: 0.0825,
            taxAmount: line.taxable ? Math.round(line.baseAmount * 0.0825 * 100) / 100 : 0,
            deposit: line.deposit,
            invoiceNumber: order.invoiceNumber || '',
          });
        } else {
          await base44.entities.Rental.update(line.rentalId, {
            ...sharedFields,
            equipmentId: line.equipmentId,
            equipmentName: line.equipmentName,
            startDate: line.startDate,
            endDate: line.endDate,
            baseAmount: line.baseAmount,
            deposit: line.deposit,
          });
        }
      }

      // Delete removed lines (rentalIds no longer in lines)
      const keptIds = new Set(lines.filter(l => !l.isNew).map(l => l.rentalId));
      for (const origId of order.rentalIds) {
        if (!keptIds.has(origId)) {
          await base44.entities.Rental.delete(origId);
        }
      }

      // Save signature to all rental records if captured
      if (signatureDataUrl) {
        const allIds = [...lines.filter(l => !l.isNew).map(l => l.rentalId), ...order.rentalIds.filter(id => keptIds.has(id))];
        const uniqueIds = [...new Set([...order.rentalIds.filter(id => keptIds.has(id))])];
        for (const id of uniqueIds) {
          await base44.entities.Rental.update(id, { signatureDataUrl });
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-indigo-900 text-white px-5 py-4 flex items-center justify-between z-10">
          <div>
            <div className="font-bold text-lg">Edit Order</div>
            <div className="text-indigo-300 text-xs font-mono">
              {order.invoiceNumber ? `📄 ${order.invoiceNumber}` : order.id}
              {order.invoiceNumber && <span className="ml-2 text-indigo-400 text-xs normal-case font-sans">(locked)</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-indigo-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Customer Info */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Customer</label>
            <div className="space-y-2">
              <Input placeholder="Name" value={form.customerName} onChange={e => set('customerName', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Phone" value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} />
                <Input placeholder="Email" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
              </div>
              <Input placeholder="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          {/* Delivery */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Delivery & Return</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Delivery Method</label>
                <select value={form.deliveryMethod} onChange={e => set('deliveryMethod', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                  <option value="customer_pickup">Customer Pickup</option>
                  <option value="company_delivery">Company Delivery</option>
                  <option value="shipped">Shipped</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Return Method</label>
                <select value={form.returnMethod} onChange={e => set('returnMethod', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                  <option value="customer_return">Customer Return</option>
                  <option value="company_pickup">Company Pickup</option>
                  <option value="customer_ships">Customer Ships</option>
                </select>
              </div>
            </div>
          </div>

          {/* Worksite Address */}
          {form.deliveryMethod === 'company_delivery' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Delivery / Worksite Address</label>
              <div className="space-y-2">
                <Input placeholder="Street address" value={form.worksiteAddress} onChange={e => set('worksiteAddress', e.target.value)} />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="City" value={form.worksiteCity} onChange={e => set('worksiteCity', e.target.value)} className="col-span-1" />
                  <Input placeholder="ST" value={form.worksiteState} onChange={e => set('worksiteState', e.target.value)} maxLength={2} />
                  <Input placeholder="ZIP" value={form.worksiteZip} onChange={e => set('worksiteZip', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Line Items</label>
              <button onClick={addLine} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="bg-gray-50 border rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {line.equipmentId && !line.isNew ? (
                        <div className="text-sm font-medium text-gray-800">{line.equipmentName}</div>
                      ) : (
                        <Input
                          placeholder="Equipment / item description"
                          value={line.equipmentName}
                          onChange={e => updateLine(idx, 'equipmentName', e.target.value)}
                          className="text-sm"
                        />
                      )}
                    </div>
                    <button onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">Start</label>
                      <Input type="date" value={line.startDate} onChange={e => updateLine(idx, 'startDate', e.target.value)} className="text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">End</label>
                      <Input type="date" value={line.endDate} onChange={e => updateLine(idx, 'endDate', e.target.value)} className="text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Daily Rate</label>
                      <Input
                        type="number"
                        value={line.dailyRate}
                        onChange={e => updateLine(idx, 'dailyRate', e.target.value)}
                        className="text-xs"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="text-xs text-right text-indigo-700 font-semibold">
                    Subtotal: ${(line.baseAmount || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Signature */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Customer Signature</label>
            <SignaturePad
              onSave={setSignatureDataUrl}
              onClear={() => setSignatureDataUrl(null)}
            />
            {signatureDataUrl && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-700 font-medium">
                <span>✓ Signature captured</span>
                <button onClick={() => setSignatureDataUrl(null)} className="text-gray-400 hover:text-red-500 underline">Remove</button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-5 py-4">
          <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}