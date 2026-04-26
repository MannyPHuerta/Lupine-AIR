import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';

export default function CheckoutForm({ items, onClose, onSuccess }) {
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.customerEmail) return;

    setLoading(true);
    try {
      // Create all rentals in batch
      for (const item of items) {
        await base44.entities.Rental.create({
          equipmentId: item.equipmentId,
          startDate: item.startDate,
          endDate: item.endDate,
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          totalDays: item.totalDays,
          baseAmount: Math.round(item.baseAmount * 100) / 100,
          taxRate: item.taxRate,
          taxAmount: Math.round((item.taxable ? item.baseAmount * item.taxRate : 0) * 100) / 100,
          deposit: item.deposit || 0,
          status: 'pending',
          notes: form.notes
        });
      }
      onSuccess(form);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">Checkout</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary */}
          <div className="bg-indigo-50 rounded-lg p-3 text-sm space-y-1">
            <div className="font-semibold text-indigo-900">{items.length} Item(s)</div>
            <div className="text-indigo-700">
              Total: ${items.reduce((sum, i) => sum + i.baseAmount + (i.taxable ? i.baseAmount * (i.taxRate || 0.0825) : 0) + (i.deposit || 0), 0).toFixed(2)}
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <Input
              required
              value={form.customerName}
              onChange={(e) => setForm(f => ({ ...f, customerName: e.target.value }))}
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              required
              type="email"
              value={form.customerEmail}
              onChange={(e) => setForm(f => ({ ...f, customerEmail: e.target.value }))}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => setForm(f => ({ ...f, customerPhone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Special requests..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows="3"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.customerName}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
              {loading ? 'Creating...' : 'Complete Rental'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}