import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RentalCart({ items, onRemove, onCheckout, loading }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-6 h-full flex flex-col items-center justify-center">
        <div className="text-gray-400 text-center">
          <div className="text-5xl mb-2">📋</div>
          <div className="text-sm text-gray-600">Select items to add to rental</div>
        </div>
      </div>
    );
  }

  // Group items by equipment + dates
  const groupedItems = items.reduce((acc, item, idx) => {
    const key = `${item.equipmentId}-${item.startDate}-${item.endDate}`;
    if (!acc[key]) {
      acc[key] = { item, indices: [], quantity: 0 };
    }
    acc[key].indices.push(idx);
    acc[key].quantity += 1;
    return acc;
  }, {});

  const groupedArray = Object.values(groupedItems);

  const totals = items.reduce((acc, item) => {
    const baseAmount = item.baseAmount || 0;
    const taxAmount = item.taxable ? baseAmount * (item.taxRate || 0.0825) : 0;
    return {
      baseAmount: acc.baseAmount + baseAmount,
      taxAmount: acc.taxAmount + taxAmount,
      deposit: acc.deposit + (item.deposit || 0)
    };
  }, { baseAmount: 0, taxAmount: 0, deposit: 0 });

  const grandTotal = totals.baseAmount + totals.taxAmount + totals.deposit;

  return (
    <div className="bg-white rounded-xl border shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="font-bold text-lg text-gray-900">Rental Cart</h2>
        <p className="text-xs text-gray-500 mt-1">{items.length} item(s) • {groupedArray.length} line(s)</p>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {groupedArray.map(({ item, indices, quantity }) => {
          const itemTax = item.taxable ? item.baseAmount * (item.taxRate || 0.0825) : 0;
          const itemTotal = item.baseAmount + itemTax + (item.deposit || 0);
          const lineTotal = itemTotal * quantity;
          return (
            <div key={indices[0]} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm">{item.name} <span className="text-indigo-600">×{quantity}</span></div>
                  <div className="text-xs text-gray-500">
                    {item.startDate} → {item.endDate} ({item.totalDays} days)
                  </div>
                </div>
                <button
                  onClick={() => onRemove(indices[0])}
                  className="text-gray-400 hover:text-red-600 p-1"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Rental:</span>
                  <span className="font-medium">${(item.baseAmount * quantity).toFixed(2)}</span>
                </div>
                {item.taxable && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax:</span>
                    <span className="font-medium">${(itemTax * quantity).toFixed(2)}</span>
                  </div>
                )}
                {item.deposit > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Deposits:</span>
                    <span className="font-medium">${((item.deposit || 0) * quantity).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-1 flex justify-between font-bold text-gray-900">
                  <span>Line Total:</span>
                  <span>${lineTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="px-6 py-4 border-t bg-gray-50 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Rental Total:</span>
          <span className="font-medium">${totals.baseAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax:</span>
          <span className="font-medium">${totals.taxAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Deposits:</span>
          <span className="font-medium">${totals.deposit.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span className="text-indigo-600">${grandTotal.toFixed(2)}</span>
        </div>

        {/* Checkout Button */}
        <Button
          onClick={onCheckout}
          disabled={loading}
          className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '→'}
          {loading ? 'Processing...' : 'Proceed to Checkout'}
        </Button>
      </div>
    </div>
  );
}