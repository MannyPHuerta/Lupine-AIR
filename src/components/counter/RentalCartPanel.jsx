import { useState, useMemo } from 'react';
import { Trash2, DollarSign, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function RentalCartPanel({
  cart,
  customer,
  branch,
  branchSettings,
  companySettings,
  onRemoveItem,
  onCompleteRental,
}) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const days = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / 86400000);
  }, [startDate, endDate]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      let rate = item.dailyRate;
      if (days >= 7 && item.weeklyRate) rate = item.weeklyRate;
      if (days >= 30 && item.monthlyRate) rate = item.monthlyRate;
      return sum + (rate * days);
    }, 0);
  }, [cart, days]);

  const tax = subtotal * 0.0825; // 8.25% TBD per branch
  const deposit = cart.reduce((sum, item) => sum + (item.depositRequired || 0), 0);
  const total = subtotal + tax;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const invoice = await base44.functions.invoke('createRental', {
        customerId: customer.id,
        customerName: customer.fullName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerCity: customer.city,
        customerState: customer.state,
        customerZip: customer.zip,
        items: cart.map(item => ({
          equipmentId: item.id,
          equipmentName: item.name,
        })),
        startDate,
        endDate,
        totalDays: days,
        baseAmount: subtotal,
        taxAmount: tax,
        deposit,
        branch,
        deliveryMethod: 'customer_pickup',
        returnMethod: 'company_pickup',
      });

      setCompleted(true);
      setTimeout(() => {
        onCompleteRental();
        setCompleted(false);
      }, 1500);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-center p-4">
        <div>
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div className="text-sm">Add equipment to build order</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {cart.map(item => (
          <div key={item.lineId} className="bg-white rounded border p-3 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 text-sm">{item.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                ${item.dailyRate}/day × {days} days = <strong>${(item.dailyRate * days).toFixed(2)}</strong>
              </div>
            </div>
            <button
              onClick={() => onRemoveItem(item.lineId)}
              className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Dates & Summary */}
      <div className="border-t p-4 space-y-3 bg-white">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Start</label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">End</label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1 text-sm bg-gray-50 p-2 rounded border">
          <div className="flex justify-between text-gray-700">
            <span>{days} days</span>
            <span className="font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Tax (8.25%)</span>
            <span className="font-medium">${tax.toFixed(2)}</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Deposit</span>
              <span className="font-medium">${deposit.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-1 mt-1 flex justify-between font-bold text-gray-900">
            <span>Total Due</span>
            <span className="text-lg text-indigo-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Complete Button */}
        <Button
          onClick={handleComplete}
          disabled={completing || completed}
          className={`w-full gap-2 ${completed ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {completing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Creating…
            </>
          ) : completed ? (
            <>
              <Check className="w-4 h-4" /> Done!
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4" /> Complete Rental
            </>
          )}
        </Button>
      </div>
    </div>
  );
}