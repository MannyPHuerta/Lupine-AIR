import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';

const PAYMENT_METHODS = ['Cash', 'Check', 'Card', 'Net 30', 'Other'];

export default function InvoiceTotals({ lines, discount, onDiscountChange, taxRate, onTaxRateChange, amountPaid, onAmountPaidChange, paymentMethod, onPaymentMethodChange, autoSendCommunications, onAutoSendChange }) {
  const rentalSubtotal = lines.reduce((acc, line) => acc + (line.baseAmount || 0), 0);
  const depositTotal = lines.reduce((acc, line) => acc + (line.deposit || 0) * (line.quantity || 1), 0);

  const discountAmount = Math.min(Math.max(parseFloat(discount) || 0, 0), rentalSubtotal);
  const taxableBase = lines.reduce((acc, line) => acc + (line.taxable !== false ? (line.baseAmount || 0) : 0), 0);
  const taxRateDecimal = Math.max(0, parseFloat(taxRate) || 8.25) / 100;
  const taxAmount = Math.round((taxableBase - discountAmount) * taxRateDecimal * 100) / 100;

  const grand = rentalSubtotal - discountAmount + taxAmount + depositTotal;
  const paid = parseFloat(amountPaid) || 0;
  const balance = grand - paid;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Invoice Totals</h3>
      <div className="space-y-3 text-sm">

        {/* Rental Subtotal */}
        <div className="flex justify-between text-gray-600">
          <span>Rental Subtotal</span>
          <span>${rentalSubtotal.toFixed(2)}</span>
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between text-gray-600 gap-4">
          <span className="shrink-0">Discount</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">−$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={e => onDiscountChange(e.target.value)}
              placeholder="0.00"
              className="w-24 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-green-700 text-xs font-medium">
            <span>After Discount</span>
            <span>${(rentalSubtotal - discountAmount).toFixed(2)}</span>
          </div>
        )}

        {/* Tax Rate */}
        <div className="flex items-center justify-between text-gray-600 gap-4">
          <span className="shrink-0">Sales Tax</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="0"
              max="30"
              step="0.01"
              value={taxRate}
              onChange={e => onTaxRateChange(e.target.value)}
              placeholder="8.25"
              className="w-20 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <span className="text-gray-400">%</span>
            <span className="text-gray-500 ml-2">${taxAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Deposits */}
        {depositTotal > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>Deposits</span>
            <span>${depositTotal.toFixed(2)}</span>
          </div>
        )}

        {/* Total */}
        <div className="border-t pt-3 flex justify-between text-lg font-bold">
          <span>Total Due</span>
          <span className="text-indigo-700">${grand.toFixed(2)}</span>
        </div>

        {/* Amount Paid */}
        <div className="flex items-center justify-between text-gray-600 gap-4">
          <span className="shrink-0">Amount Paid</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={e => onAmountPaidChange(e.target.value)}
              placeholder="0.00"
              className="w-24 text-right border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>

        {paid > 0 && (
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>Balance</span>
            <span className={balance <= 0 ? 'text-green-600' : 'text-red-600'}>${balance.toFixed(2)}</span>
          </div>
        )}

        {/* Payment Method */}
        <div className="flex items-center justify-between text-gray-600 gap-4 border-t pt-3 pb-3">
          <span className="shrink-0">Payment Method</span>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => onPaymentMethodChange && onPaymentMethodChange(m)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition
                  ${paymentMethod === m
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-send communications */}
        <div className="border-t pt-3 flex items-center justify-between">
          <span className="text-gray-600 text-sm">Auto-send communications</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAutoSendChange && onAutoSendChange(!autoSendCommunications)}
              className={`relative inline-flex h-6 w-11 rounded-full transition ${
                autoSendCommunications ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  autoSendCommunications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
                style={{ marginTop: '2px' }}
              />
            </button>
            <span className="text-xs text-gray-500">
              {autoSendCommunications ? '✓ Email & SMS' : 'Manual'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}