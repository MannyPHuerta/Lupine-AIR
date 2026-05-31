import { useState } from 'react';
import { X, ShoppingBag, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * RtoSetupModal — shown in AvailabilityManager when counter person
 * wants to set up an RTO contract BEFORE saving the rental.
 *
 * Props:
 *   equipment    — the Equipment record (has rentToOwnPrice, rentToOwnTermMonths)
 *   onConfirm(rtoData) — called with { purchasePrice, termMonths, creditPercent, expiryDate }
 *   onCancel()
 */
export default function RtoSetupModal({ equipment, onConfirm, onCancel }) {
  const [purchasePrice, setPurchasePrice] = useState(equipment?.rentToOwnPrice || '');
  const [termMonths, setTermMonths] = useState(equipment?.rentToOwnTermMonths || 12);
  const [creditPercent, setCreditPercent] = useState(50);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + (equipment?.rentToOwnTermMonths || 12) + 3);
    return d.toISOString().split('T')[0];
  });

  const monthlyPayment = purchasePrice ? (parseFloat(purchasePrice) / termMonths).toFixed(2) : '—';

  const handleConfirm = () => {
    if (!purchasePrice || !termMonths || !expiryDate) {
      alert('Please fill in all fields.');
      return;
    }
    onConfirm({
      purchasePrice: parseFloat(purchasePrice),
      termMonths: parseInt(termMonths),
      creditPercent: parseFloat(creditPercent),
      expiryDate,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-purple-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            <div>
              <div className="font-bold text-purple-900">Set Up Rent-to-Own</div>
              <div className="text-xs text-purple-600">{equipment?.name}</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Purchase Price */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Purchase Price</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={e => setPurchasePrice(e.target.value)}
                className="pl-8"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Term */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Term (months)</label>
            <Input
              type="number"
              min="1"
              max="60"
              value={termMonths}
              onChange={e => setTermMonths(e.target.value)}
            />
          </div>

          {/* Credit % */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Rental Credit Toward Purchase: <strong>{creditPercent}%</strong>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={creditPercent}
              onChange={e => setCreditPercent(parseInt(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="text-xs text-gray-500 mt-1">
              Each monthly rental payment partially counts toward the purchase price.
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Purchase Option Expiry
            </label>
            <Input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
            />
          </div>

          {/* Summary */}
          {purchasePrice && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Payment</span>
                <span className="font-bold text-purple-800">${monthlyPayment}/mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Term</span>
                <span className="font-semibold">{termMonths} months</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Purchase Price</span>
                <span className="font-semibold">${parseFloat(purchasePrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rental Credit</span>
                <span className="font-semibold">{creditPercent}% of each payment</span>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
            ⚠️ Reminder: A custom RTO addendum must be attached to the rental agreement before the customer signs.
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button
            onClick={handleConfirm}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            Set Up RTO Contract
          </Button>
        </div>
      </div>
    </div>
  );
}