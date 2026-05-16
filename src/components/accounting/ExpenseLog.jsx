import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Upload, X } from 'lucide-react';

const CATEGORIES = [
  'Fuel', 'Repairs / Parts', 'Labor', 'Shop Supplies', 'Insurance',
  'Rent / Lease', 'Utilities', 'Vehicle', 'Subcontractors', 'Equipment Purchase', 'Other'
];

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

const PAYMENT_METHODS = ['check', 'ach', 'credit_card', 'cash', 'wire', 'other'];

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  category: 'Fuel',
  vendor: '',
  vendorInvoiceNumber: '',
  vendorInvoiceDate: '',
  paymentMethod: '',
  amount: '',
  branch: '01 McAllen',
  description: '',
  jobInvoiceNumber: '',
  receiptUrl: '',
  isCapitalized: false,
};

function fmt(n) {
  return `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ExpenseLog({ expenses, onRefresh, capitalizationThreshold = 2500 }) {
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (!form.amount || !form.date || !form.branch) return;
    setSaving(true);
    const amt = parseFloat(form.amount);
    const isCapitalized = form.category === 'Equipment Purchase' && amt >= capitalizationThreshold;
    await base44.entities.Expense.create({ ...form, amount: amt, isCapitalized });
    setForm(EMPTY);
    setShowForm(false);
    setSaving(false);
    onRefresh();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await base44.entities.Expense.delete(id);
    onRefresh();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, receiptUrl: file_url }));

    // AI extraction from receipt image
    try {
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an accounting assistant. Extract structured data from this receipt/invoice image.
Return ONLY a JSON object with these fields (use null if not found):
- vendor: string (vendor/payee name)
- vendorInvoiceNumber: string (invoice or PO number on the document)
- vendorInvoiceDate: string (date on the document, format YYYY-MM-DD)
- amount: number (total amount due or total paid, as a number with no $ sign)
- paymentMethod: one of: check, ach, credit_card, cash, wire, other, or null
- description: string (brief description of what was purchased)`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            vendor: { type: 'string' },
            vendorInvoiceNumber: { type: 'string' },
            vendorInvoiceDate: { type: 'string' },
            amount: { type: 'number' },
            paymentMethod: { type: 'string' },
            description: { type: 'string' },
          }
        }
      });
      setForm(f => ({
        ...f,
        receiptUrl: file_url,
        vendor: extracted.vendor || f.vendor,
        vendorInvoiceNumber: extracted.vendorInvoiceNumber || f.vendorInvoiceNumber,
        vendorInvoiceDate: extracted.vendorInvoiceDate || f.vendorInvoiceDate,
        amount: extracted.amount != null ? String(extracted.amount) : f.amount,
        paymentMethod: extracted.paymentMethod || f.paymentMethod,
        description: extracted.description || f.description,
      }));
    } catch (_) {
      // silently ignore extraction errors — receipt is still attached
    }

    setUploading(false);
  };

  const isEquipmentPurchase = form.category === 'Equipment Purchase';
  const wouldCapitalize = isEquipmentPurchase && parseFloat(form.amount || 0) >= capitalizationThreshold;

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <div className="font-semibold text-gray-900 text-sm">Expense Log ({expenses.length})</div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Expense
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-emerald-50 border-b px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vendor</label>
              <input type="text" placeholder="Vendor / payee" value={form.vendor}
                onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount ($)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Branch</label>
              <select value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs">
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs bg-white">
                <option value="">— select —</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-indigo-600 mb-1 block">Vendor Invoice # <span className="font-normal text-gray-400">(their bill to us)</span></label>
              <input type="text" placeholder="e.g. VND-8891" value={form.vendorInvoiceNumber}
                onChange={e => setForm(f => ({ ...f, vendorInvoiceNumber: e.target.value }))}
                className="w-full border border-indigo-200 rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vendor Invoice Date</label>
              <input type="date" value={form.vendorInvoiceDate} onChange={e => setForm(f => ({ ...f, vendorInvoiceDate: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-xs font-semibold text-emerald-700 mb-1 block">Our Job Invoice # <span className="font-normal text-gray-400">(links to rental)</span></label>
              <input type="text" placeholder="e.g. MCL-1042" value={form.jobInvoiceNumber}
                onChange={e => setForm(f => ({ ...f, jobInvoiceNumber: e.target.value }))}
                className="w-full border border-emerald-200 rounded px-2 py-1.5 text-xs font-mono focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
              <input type="text" placeholder="Description" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-xs" />
            </div>
          </div>

          {/* Receipt upload */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer border border-dashed border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 transition">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? '🤖 Scanning receipt…' : form.receiptUrl ? '✓ Receipt + AI filled' : 'Attach receipt (AI auto-fill)'}
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} />
            </label>
            {form.receiptUrl && (
              <button onClick={() => setForm(f => ({ ...f, receiptUrl: '' }))} className="text-red-400 hover:text-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {wouldCapitalize && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠ ≥ ${capitalizationThreshold.toLocaleString()} — will be capitalized (depreciation, not expensed)
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || !form.amount}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg px-4 py-1.5 transition">
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr className="text-left text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Category</th>
              <th className="px-4 py-2 font-medium">Vendor</th>
              <th className="px-4 py-2 font-medium">Branch</th>
              <th className="px-4 py-2 font-medium text-indigo-600">Vendor Inv #</th>
              <th className="px-4 py-2 font-medium text-emerald-700">Our Job Inv #</th>
              <th className="px-4 py-2 font-medium">Paid Via</th>
              <th className="px-4 py-2 font-medium">Note</th>
              <th className="px-4 py-2 font-medium text-right">Amount</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.length === 0 ? (
              <tr><td colSpan={11} className="text-center text-gray-400 py-8">No expenses logged for this period</td></tr>
            ) : expenses.map(e => (
              <tr key={e.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-600">{e.date}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{e.category}</td>
                <td className="px-4 py-2 text-gray-600">{e.vendor || '—'}</td>
                <td className="px-4 py-2 text-gray-500">{e.branch}</td>
                <td className="px-4 py-2 font-mono text-indigo-700">{e.vendorInvoiceNumber || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2 font-mono text-emerald-700">{e.jobInvoiceNumber || e.invoiceNumber || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{e.paymentMethod ? e.paymentMethod.replace('_', ' ').toUpperCase() : '—'}</td>
                <td className="px-4 py-2 text-gray-400">{e.description || '—'}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmt(e.amount)}</td>
                <td className="px-4 py-2">
                  {e.isCapitalized
                    ? <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs">Capitalized</span>
                    : <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">Expensed</span>
                  }
                </td>
                <td className="px-4 py-2">
                  <button onClick={() => handleDelete(e.id)} className="text-gray-300 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}