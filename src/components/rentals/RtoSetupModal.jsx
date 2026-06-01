import { useState } from 'react';
import { X, ShoppingBag, Calendar, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * RtoSetupModal — counter staff view for setting up an RTO contract.
 *
 * Management controls (read-only here):
 *   equipment.rentToOwnPrice         — purchase price
 *   equipment.rentToOwnCreditPercent — % of monthly rental credited toward purchase
 *   equipment.rentToOwnTermMonths    — hard cap on term length
 *
 * Counter staff only picks:
 *   termMonths — how many months for THIS contract (≤ management cap)
 */
export default function RtoSetupModal({ equipment, onConfirm, onCancel }) {
  const purchasePrice = equipment?.rentToOwnPrice || 0;
  const creditPercent = equipment?.rentToOwnCreditPercent ?? 50;
  const maxTerm = equipment?.rentToOwnTermMonths || 36;
  const monthlyRentalRate = equipment?.monthlyRate || 0;

  const [termMonths, setTermMonths] = useState(maxTerm);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + maxTerm + 1);
    return d.toISOString().split('T')[0];
  });

  // Live breakdown math
  const creditPerMonth = monthlyRentalRate * (creditPercent / 100);
  const totalCreditOverTerm = creditPerMonth * termMonths;
  const monthsToOwn = creditPerMonth > 0 ? Math.ceil(purchasePrice / creditPerMonth) : null;
  const termIsLongEnough = monthsToOwn !== null && termMonths >= monthsToOwn;

  const handleTermChange = (val) => {
    const clamped = Math.min(Math.max(1, parseInt(val) || 1), maxTerm);
    setTermMonths(clamped);
    // Auto-update expiry date to match term + 1 buffer month
    const d = new Date();
    d.setMonth(d.getMonth() + clamped + 1);
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  const handleConfirm = () => {
    if (!purchasePrice || !termMonths || !expiryDate) {
      alert('Missing required RTO fields. Please ensure this equipment has a purchase price and term set by management.');
      return;
    }
    onConfirm({
      purchasePrice,
      termMonths,
      creditPercent,
      expiryDate,
    });
  };

  const missingConfig = !purchasePrice || !monthlyRentalRate;

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

          {missingConfig && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
              ⚠️ This equipment is missing a purchase price or monthly rate. Contact management to configure RTO settings in the Pricing Editor before proceeding.
            </div>
          )}

          {/* Management-locked fields */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              <Lock className="w-3 h-3" /> Set by Management
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Purchase Price</span>
              <span className="font-bold text-gray-900">${purchasePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Rental Rate</span>
              <span className="font-semibold text-gray-800">${monthlyRentalRate.toFixed(2)}/mo</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rental Credit</span>
              <span className="font-semibold text-gray-800">{creditPercent}% of each payment</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Max Term</span>
              <span className="font-semibold text-gray-800">{maxTerm} months</span>
            </div>
          </div>

          {/* Counter staff input — term only */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Contract Term (months)
              <span className="ml-1.5 text-xs font-normal text-gray-400">max {maxTerm}</span>
            </label>
            <Input
              type="number"
              min="1"
              max={maxTerm}
              value={termMonths}
              onChange={e => handleTermChange(e.target.value)}
            />
            {termMonths > maxTerm && (
              <div className="text-xs text-red-600 mt-1">Cannot exceed the {maxTerm}-month management cap.</div>
            )}
          </div>

          {/* Live breakdown */}
          {!missingConfig && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Credit Earned / Month</span>
                <span className="font-semibold text-green-700">+${creditPerMonth.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Credit Over {termMonths} Months</span>
                <span className="font-semibold">${(creditPerMonth * termMonths).toFixed(2)}</span>
              </div>
              {monthsToOwn !== null && (
                <div className={`flex justify-between border-t border-purple-200 pt-2 mt-1 ${!termIsLongEnough ? 'text-amber-700' : ''}`}>
                  <span className={`font-medium ${termIsLongEnough ? 'text-gray-700' : 'text-amber-700'}`}>
                    Est. Months to Own
                  </span>
                  <span className={`font-bold ${termIsLongEnough ? 'text-purple-900' : 'text-amber-700'}`}>
                    {monthsToOwn} months
                    {!termIsLongEnough && ' ⚠️'}
                  </span>
                </div>
              )}
              {!termIsLongEnough && monthsToOwn !== null && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  At {termMonths} months the customer won't accumulate enough credit to cover the full purchase price. Consider extending the term to at least {monthsToOwn} months.
                </div>
              )}
            </div>
          )}

          {/* Expiry */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Purchase Option Expiry
              <span className="ml-1.5 text-xs font-normal text-gray-400">auto-set, adjust if needed</span>
            </label>
            <Input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
            ℹ️ An RTO addendum will be automatically printed with the invoice for the customer to sign.
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={missingConfig}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
          >
            <ShoppingBag className="w-4 h-4 mr-1.5" />
            Set Up RTO Contract
          </Button>
        </div>
      </div>
    </div>
  );
}