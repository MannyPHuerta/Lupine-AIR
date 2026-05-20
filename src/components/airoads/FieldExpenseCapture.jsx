import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, Loader2, Check, X, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EXPENSE_CATEGORIES = [
  'Fuel', 'Towing', 'Meals / Per Diem', 'Lodging', 'Permits',
  'Fines / Tickets', 'Hospitality', 'Equipment Rental', 'Subcontractors',
  'Miscellaneous Field', 'Other'
];

export default function FieldExpenseCapture({ jobInvoiceNumber, jobName, branch, onSaved }) {
  const [open, setOpen] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    vendor: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Fuel',
    description: '',
    paymentMethod: 'credit_card',
  });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload and AI-extract
    setExtracting(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract expense details from this receipt/invoice image. Return ONLY a JSON object with these fields:
- vendor (string): business name on receipt
- amount (number): total amount charged
- date (string): date in YYYY-MM-DD format
- category (string): one of: ${EXPENSE_CATEGORIES.join(', ')}
- description (string): brief description of what was purchased

If any field is unclear, make your best guess. For category, pick the closest match.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          vendor: { type: 'string' },
          amount: { type: 'number' },
          date: { type: 'string' },
          category: { type: 'string' },
          description: { type: 'string' },
        }
      }
    });
    setForm(prev => ({
      ...prev,
      vendor: result.vendor || prev.vendor,
      amount: result.amount?.toString() || prev.amount,
      date: result.date || prev.date,
      category: EXPENSE_CATEGORIES.includes(result.category) ? result.category : prev.category,
      description: result.description || prev.description,
    }));
    // Store file_url for saving
    setImageFile({ ...imageFile, uploadedUrl: file_url });
    setExtracting(false);
  };

  const handleSave = async () => {
    if (!form.amount || !form.date) return;
    setSaving(true);
    const me = await base44.auth.me();
    await base44.entities.Expense.create({
      date: form.date,
      category: form.category,
      vendor: form.vendor,
      amount: parseFloat(form.amount),
      description: form.description,
      paymentMethod: form.paymentMethod,
      branch: branch || '',
      jobInvoiceNumber: jobInvoiceNumber || '',
      receiptUrl: imageFile?.uploadedUrl || '',
      capturedByDriver: true,
      capturedBy: me?.email || '',
    });
    setSaving(false);
    setSaved(true);
    if (onSaved) onSaved();
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      setImageFile(null);
      setImagePreview(null);
      setForm({ vendor: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Fuel', description: '', paymentMethod: 'credit_card' });
    }, 1500);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
      >
        <Receipt className="w-4 h-4" />
        Add Expense
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">Log Field Expense</div>
            {jobName && <div className="text-emerald-200 text-xs">{jobName}</div>}
          </div>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-emerald-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Receipt capture */}
          {!imagePreview ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 hover:bg-emerald-50 transition"
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm font-medium">Take Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:bg-gray-50 transition"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm font-medium">Upload File</span>
              </button>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => handleFileSelect(e.target.files[0])} />
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => handleFileSelect(e.target.files[0])} />
            </div>
          ) : (
            <div className="relative">
              <img src={imagePreview} alt="Receipt" className="w-full max-h-40 object-contain rounded-lg border" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          )}

          {extracting && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI reading receipt...
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600">Amount *</label>
                <div className="relative mt-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input type="number" step="0.01" placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full h-9 pl-6 pr-2 border rounded-md text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Date *</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full h-9 mt-1 px-2 border rounded-md text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full h-9 mt-1 px-2 border rounded-md text-sm bg-white">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Vendor</label>
              <input type="text" placeholder="Who was paid?"
                value={form.vendor}
                onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                className="w-full h-9 mt-1 px-2 border rounded-md text-sm" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}
                className="w-full h-9 mt-1 px-2 border rounded-md text-sm bg-white">
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="ach">ACH</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600">Notes</label>
              <input type="text" placeholder="Optional description"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full h-9 mt-1 px-2 border rounded-md text-sm" />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || extracting || !form.amount}
            className={`w-full ${saved ? 'bg-green-600' : 'bg-emerald-700 hover:bg-emerald-800'}`}
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> :
             saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
             'Save Expense'}
          </Button>
        </div>
      </div>
    </div>
  );
}