import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, X } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function RentalForm({ equipment, startDate, endDate, onClose, onSuccess, onAddAnother, initialCustomer }) {
  const [form, setForm] = useState({
    customerName: initialCustomer?.customerName || '',
    customerEmail: initialCustomer?.customerEmail || '',
    customerPhone: initialCustomer?.customerPhone || '',
    notes: initialCustomer?.notes || ''
  });
  const [taxRate, setTaxRate] = useState(0.0825); // Default TX rate
  const [loading, setLoading] = useState(false);

  const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  
  // Calculate cost based on rate tier
  let rate = equipment.dailyRate;
  if (days >= 30) rate = equipment.monthlyRate / 30;
  else if (days >= 7) rate = equipment.weeklyRate / 7;

  const baseAmount = rate * days;
  const taxAmount = equipment.taxable ? baseAmount * taxRate : 0;
  const deposit = equipment.depositRequired || 0;
  const total = baseAmount + taxAmount + deposit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.customerEmail) return;

    setLoading(true);
    try {
      await base44.entities.Rental.create({
        equipmentId: equipment.id,
        startDate,
        endDate,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        totalDays: days,
        baseAmount: Math.round(baseAmount * 100) / 100,
        taxRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        deposit,
        status: 'pending',
        notes: form.notes
      });
      onSuccess(form);
      onClose();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAnother = async (e) => {
    e.preventDefault();
    if (!form.customerName || !form.customerEmail) return;

    setLoading(true);
    try {
      await base44.entities.Rental.create({
        equipmentId: equipment.id,
        startDate,
        endDate,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        totalDays: days,
        baseAmount: Math.round(baseAmount * 100) / 100,
        taxRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        deposit,
        status: 'pending',
        notes: form.notes
      });
      onAddAnother(form);
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
          <h2 className="font-bold text-lg">Create Rental</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Equipment & dates */}
          <div className="bg-indigo-50 rounded-lg p-3 text-sm space-y-1">
            <div className="font-semibold text-indigo-900">{equipment.name}</div>
            <div className="text-indigo-700">
              {startDate} → {endDate} ({days} days)
            </div>
          </div>

          {/* Customer info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
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
              placeholder="Special requests or notes..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows="3"
            />
          </div>

          {/* Tax Rate */}
          {equipment.taxable && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(taxRate * 100).toFixed(2)}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100)}
              />
            </div>
          )}

          {/* Pricing */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base ({days} days @ ${rate.toFixed(2)}/day):</span>
              <span className="font-medium">${baseAmount.toFixed(2)}</span>
            </div>
            {equipment.taxable && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({(taxRate * 100).toFixed(2)}%):</span>
                <span className="font-medium">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit:</span>
              <span className="font-medium">${deposit.toFixed(2)}</span>
            </div>
            <div className="border-t pt-1 mt-1 flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-indigo-600">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading || !form.customerName}
              onClick={handleAddAnother}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '+'}
              {loading ? 'Adding...' : 'Add Another'}
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.customerName}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓'}
              {loading ? 'Creating...' : 'Done'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}