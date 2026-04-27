import { useState } from 'react';

export default function InvoiceTotals({ lines, discount, onDiscountChange, taxRate, onTaxRateChange }) {
  const rentalSubtotal = lines.reduce((acc, line) => acc + (line.baseAmount || 0), 0);
  const depositTotal = lines.reduce((acc, line) => acc + (line.deposit || 0) * (line.quantity || 1), 0);

  const discountAmount = Math.min(Math.max(parseFloat(discount) || 0, 0), rentalSubtotal);
  const taxableBase = lines.reduce((acc, line) => acc + (line.taxable ? (line.baseAmount || 0) : 0), 0);
  const taxRateDecimal = Math.max(0, parseFloat(taxRate) || 0) / 100;
  const taxAmount = Math.round((taxableBase - discountAmount) * taxRateDecimal * 100) / 100;

  const grand = rentalSubtotal - discountAmount + taxAmount + depositTotal;

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
      </div>
    </div>
  );
}