import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BLANK_ITEM = {
  lineNumber: '',
  description: '',
  equipmentCategory: '',
  quantity: 1,
  unit: 'each',
  unitPrice: 0,
  totalPrice: 0,
  specs: '',
  notes: '',
};

const UNITS = ['each', 'day', 'week', 'month', 'lot', 'hour', 'set'];

export default function RFQLineItems({ items = [], onChange, totalValue = 0 }) {
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-calc total
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(updated[index].quantity) || 0;
      const price = field === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(updated[index].unitPrice) || 0;
      updated[index].totalPrice = qty * price;
    }
    onChange(updated);
  };

  const addItem = () => {
    const newItem = { ...BLANK_ITEM, lineNumber: String(items.length + 1) };
    onChange([...items, newItem]);
  };

  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 grid grid-cols-12 gap-2 border-b">
          <div className="col-span-1">Line</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2">Specs</div>
          <div className="col-span-1">Qty</div>
          <div className="col-span-1">Unit</div>
          <div className="col-span-1">Unit Price</div>
          <div className="col-span-1">Total</div>
          <div className="col-span-2">Notes</div>
          <div className="col-span-1"></div>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No line items yet. Add items or run AI analysis.</div>
        ) : (
          <div className="divide-y">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-start hover:bg-gray-50 transition">
                <div className="col-span-1">
                  <input value={item.lineNumber || ''} onChange={e => updateItem(i, 'lineNumber', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="1" />
                </div>
                <div className="col-span-3">
                  <textarea value={item.description || ''} onChange={e => updateItem(i, 'description', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Equipment / service description" />
                </div>
                <div className="col-span-2">
                  <textarea value={item.specs || ''} onChange={e => updateItem(i, 'specs', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Technical specs" />
                </div>
                <div className="col-span-1">
                  <input type="number" value={item.quantity || ''} onChange={e => updateItem(i, 'quantity', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="col-span-1">
                  <select value={item.unit || 'each'} onChange={e => updateItem(i, 'unit', e.target.value)}
                    className="w-full border rounded px-1 py-1 text-xs bg-white focus:outline-none">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <input type="number" value={item.unitPrice || ''} onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="0.00" />
                </div>
                <div className="col-span-1">
                  <div className="text-xs font-semibold text-gray-900 py-1.5 text-right">
                    ${(item.totalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="col-span-2">
                  <textarea value={item.notes || ''} onChange={e => updateItem(i, 'notes', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs h-16 resize-none focus:outline-none focus:ring-1 focus:ring-green-500" placeholder="Notes / exceptions" />
                </div>
                <div className="col-span-1 flex justify-end pt-1">
                  <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 transition p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="bg-gray-50 border-t px-4 py-3 flex justify-end">
          <div className="text-right">
            <div className="text-xs text-gray-500">Estimated Total Bid Value</div>
            <div className="text-2xl font-bold text-green-800">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <Button onClick={addItem} variant="outline" size="sm" className="w-full border-dashed">
        <Plus className="w-4 h-4 mr-1" /> Add Line Item
      </Button>
    </div>
  );
}