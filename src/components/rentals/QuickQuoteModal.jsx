/**
 * QuickQuoteModal — lightweight phone quote builder.
 * No catalog lookup. Free-text line items. Saves as status="quote" in Rental table.
 * Can be printed immediately or left in history to convert later.
 */
import { useState } from 'react';
import { X, Plus, Trash2, Loader2, Printer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

export default function QuickQuoteModal({ onClose, onSaved, companyInfo, branchSettings }) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    branch: BRANCHES[0],
    notes: '',
    deliveryMethod: 'customer_pickup',
  });

  const [lines, setLines] = useState([
    { description: '', qty: 1, dailyRate: 0, startDate: today, endDate: tomorrow },
  ]);

  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState(null); // rental IDs after save

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const updateLine = (idx, field, val) => {
    setLines(ls => ls.map((l, i) => i !== idx ? l : { ...l, [field]: val }));
  };

  const addLine = () => setLines(ls => [...ls, { description: '', qty: 1, dailyRate: 0, startDate: today, endDate: tomorrow }]);
  const removeLine = (idx) => setLines(ls => ls.filter((_, i) => i !== idx));

  const lineTotal = (l) => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    const days = isNaN(start) || isNaN(end) ? 1 : Math.max(1, Math.ceil((end - start) / 86400000));
    return parseFloat(l.dailyRate || 0) * (parseInt(l.qty) || 1) * days;
  };

  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;

  const handleSave = async (andPrint = false) => {
    if (!form.customerName) { alert('Customer name required'); return; }
    setSaving(true);
    try {
      // Get branch invoice prefix
      const bs = branchSettings?.[form.branch];
      let invoiceNumber = `QT-${Date.now().toString().slice(-6)}`;

      const createdIds = [];
      for (const line of lines) {
        if (!line.description) continue;
        const days = Math.max(1, Math.ceil((new Date(line.endDate) - new Date(line.startDate)) / 86400000));
        const baseAmount = parseFloat(line.dailyRate || 0) * (parseInt(line.qty) || 1) * days;
        const r = await base44.entities.Rental.create({
          equipmentId: 'quote-item',
          equipmentName: line.description,
          startDate: line.startDate,
          endDate: line.endDate,
          totalDays: days,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          customerEmail: form.customerEmail,
          branch: form.branch,
          baseAmount,
          taxRate: 0.0825,
          taxAmount: Math.round(baseAmount * 0.0825 * 100) / 100,
          deposit: 0,
          amountPaid: 0,
          invoiceNumber,
          status: 'quote',
          deliveryMethod: form.deliveryMethod,
          notes: form.notes,
        });
        createdIds.push(r.id);
      }

      setSavedIds(createdIds);

      if (andPrint) {
        const orderForPrint = {
          invoiceNumber,
          customer: form,
          lines: lines.map(l => ({
            equipmentName: l.description,
            startDate: l.startDate,
            endDate: l.endDate,
            baseAmount: lineTotal(l),
            taxable: true,
            deposit: 0,
          })),
          deliveryMethod: form.deliveryMethod,
          status: 'quote',
        };
        const { openInvoiceWindow, writeInvoiceToWindow } = await import('@/lib/buildInvoiceHTML');
        const win = openInvoiceWindow();
        writeInvoiceToWindow(win, {
          ...orderForPrint,
          id: invoiceNumber,
          branchInfo: bs ? { name: bs.branchName || form.branch, address: bs.address || '', phone: bs.phone || '', email: bs.email || '' } : { name: form.branch, address: '', phone: '', email: '' },
          companyInfo: companyInfo ? { companyName: companyInfo.companyName || '', logoUrl: companyInfo.logoUrl || '', invoiceFooter: companyInfo.invoiceFooter || '' } : {},
        }, 0, null);
      }

      onSaved();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl">
        {/* Header */}
        <div className="bg-indigo-900 text-white px-5 py-4 rounded-t-xl flex items-center justify-between">
          <div>
            <div className="font-bold text-lg">Quick Quote</div>
            <div className="text-indigo-300 text-xs">Phone quote — no inventory check</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-indigo-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Customer */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Customer</label>
            <div className="space-y-2">
              <Input placeholder="Customer name *" value={form.customerName} onChange={e => set('customerName', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Phone" value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} />
                <Input placeholder="Email (optional)" value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Branch & Delivery */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Branch</label>
              <select value={form.branch} onChange={e => set('branch', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Delivery</label>
              <select value={form.deliveryMethod} onChange={e => set('deliveryMethod', e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm bg-white">
                <option value="customer_pickup">Customer Pickup</option>
                <option value="company_delivery">Company Delivery</option>
                <option value="shipped">Shipped</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase">Items</label>
              <button onClick={addLine} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="bg-gray-50 border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Item description"
                      value={line.description}
                      onChange={e => updateLine(idx, 'description', e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <button onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-400">Start</label>
                      <Input type="date" value={line.startDate} onChange={e => updateLine(idx, 'startDate', e.target.value)} className="text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">End</label>
                      <Input type="date" value={line.endDate} onChange={e => updateLine(idx, 'endDate', e.target.value)} className="text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Qty</label>
                      <Input type="number" min="1" value={line.qty} onChange={e => updateLine(idx, 'qty', e.target.value)} className="text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Daily Rate</label>
                      <Input type="number" step="0.01" value={line.dailyRate} onChange={e => updateLine(idx, 'dailyRate', e.target.value)} className="text-xs" />
                    </div>
                  </div>
                  <div className="text-xs text-right text-indigo-700 font-semibold">
                    ${lineTotal(line).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm text-gray-600">
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax (8.25%)</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 border-t pt-1"><span>Estimated Total</span><span className="text-indigo-700">${total.toFixed(2)}</span></div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes / Special Requests</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Delivery instructions, special notes…"
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Save as Quote
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Save & Print
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}