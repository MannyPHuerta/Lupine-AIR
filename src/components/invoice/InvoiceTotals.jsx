/**
 * ⚠️ CRITICAL INVOICE COMPONENT
 * DO NOT MODIFY WITHOUT DISCUSSION
 * 
 * This component handles all rental pricing calculations, discounts, and totals.
 * Any changes here affect the entire checkout workflow and financial accuracy.
 * 
 * Before editing: discuss with the team first.
 */

import { useState } from 'react';

const PAYMENT_METHODS = ['Cash', 'Check', 'Card', 'Net 30', 'Other'];

export default function InvoiceTotals({ lines, discount, onDiscountChange, taxRate, onTaxRateChange, amountPaid, onAmountPaidChange, paymentMethod, onPaymentMethodChange, autoSendCommunications, onAutoSendChange, deliveryFee = 0, returnFee = 0, deliveryMethod, returnMethod, appliedPromo, onPromoApply, onPromoRemove, loyaltyDiscount, volumeRules = [], equipment = [], promoCodes = [] }) {
  const rentalSubtotal = lines.reduce((acc, line) => acc + (line.baseAmount || 0), 0);
  const depositTotal = lines.reduce((acc, line) => acc + (line.deposit || 0) * (line.quantity || 1), 0);

  // Auto-apply volume discounts based on line item quantities + categories
  const autoVolumeDiscounts = lines
    .filter(l => l.equipmentId && l.quantity > 0)
    .flatMap(line => {
      const eqRecord = equipment.find(e => e.id === line.equipmentId);
      const lineCategory = eqRecord?.category || '';
      const matchingRules = volumeRules.filter(rule => {
        if (!rule.active) return false;
        const qty = line.quantity || 1;
        if (qty < rule.minimumQuantity) return false;
        if (rule.equipmentId && rule.equipmentId !== line.equipmentId) return false;
        if (!rule.equipmentId && rule.category && rule.category !== lineCategory) return false;
        return true;
      });
      return matchingRules.map(rule => {
        const amount = rule.discountType === 'percent'
          ? Math.round(line.baseAmount * (rule.discountValue / 100) * 100) / 100
          : Math.round(rule.discountValue * (line.quantity || 1) * 100) / 100;
        return { label: rule.name, amount };
      });
    });
  const volumeDiscountTotal = autoVolumeDiscounts.reduce((s, d) => s + (d.amount || 0), 0);

  // Promo discount
  const promoDiscount = appliedPromo
    ? appliedPromo.discountType === 'percent'
      ? Math.round(rentalSubtotal * (appliedPromo.discountValue / 100) * 100) / 100
      : Math.min(appliedPromo.discountValue, rentalSubtotal)
    : 0;

  // Loyalty discount (applied after promo + volume)
  const loyaltyDisc = loyaltyDiscount
    ? Math.round((rentalSubtotal - promoDiscount - volumeDiscountTotal) * (loyaltyDiscount / 100) * 100) / 100
    : 0;

  const discountAmount = Math.min(Math.max(parseFloat(discount) || 0, 0), rentalSubtotal);
  const taxableBase = lines.reduce((acc, line) => acc + (line.taxable !== false ? (line.baseAmount || 0) : 0), 0);
  const taxRateDecimal = Math.max(0, parseFloat(taxRate) || 8.25) / 100;
  const totalAutoDiscount = promoDiscount + loyaltyDisc + volumeDiscountTotal;
  const taxableAfterDiscounts = Math.max(0, taxableBase - discountAmount - totalAutoDiscount);
  const taxAmount = Math.round(taxableAfterDiscounts * taxRateDecimal * 100) / 100;

  const showDeliveryFee = deliveryMethod === 'company_delivery' && deliveryFee > 0;
  const showReturnFee = returnMethod === 'company_pickup' && returnFee > 0;

  // Auto-detect category-matching promo codes not yet applied
  const suggestedPromo = !appliedPromo
    ? (() => {
        const lineCategories = lines
          .filter(l => l.equipmentId)
          .map(l => (equipment.find(e => e.id === l.equipmentId)?.category || '').toLowerCase())
          .filter(Boolean);

        const now = new Date();
        return promoCodes.find(p => {
          if (!p.active) return false;
          if (p.expiresAt && new Date(p.expiresAt) < now) return false;
          if (p.usageLimit && p.usageCount >= p.usageLimit) return false;
          if (p.appliesTo === 'category' && p.appliesToCategory) {
            return lineCategories.includes(p.appliesToCategory.toLowerCase());
          }
          if (p.appliesTo === 'all') return lineCategories.length > 0;
          return false;
        }) || null;
      })()
    : null;

  const grand = Math.max(0, rentalSubtotal - discountAmount - totalAutoDiscount + taxAmount + depositTotal + (showDeliveryFee ? deliveryFee : 0) + (showReturnFee ? returnFee : 0));
  const paid = parseFloat(amountPaid) || 0;
  const balance = grand - paid;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Invoice Totals</h3>
      <div className="space-y-3 text-sm">

        {/* Category-matched promo suggestion */}
        {suggestedPromo && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2.5 text-sm text-yellow-900 flex items-center justify-between gap-3">
            <span>
              🏷 <strong>{suggestedPromo.code}</strong> applies to this order
              {suggestedPromo.appliesTo === 'category' ? ` (${suggestedPromo.appliesToCategory})` : ''} —{' '}
              {suggestedPromo.discountType === 'percent' ? `${suggestedPromo.discountValue}% off` : `$${suggestedPromo.discountValue} off`}
              {suggestedPromo.description ? ` · ${suggestedPromo.description}` : ''}
            </span>
            <button
              onClick={() => onPromoApply(suggestedPromo)}
              className="shrink-0 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Apply
            </button>
          </div>
        )}

        {/* Promo / Volume / Loyalty nudge banners */}
        {appliedPromo && promoDiscount > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5 text-sm text-purple-800 font-medium flex items-center gap-2">
            🎉 <span>You're saving <strong>${promoDiscount.toFixed(2)}</strong> with code <strong>{appliedPromo.code}</strong>{appliedPromo.description ? ` — ${appliedPromo.description}` : ''}!</span>
          </div>
        )}
        {autoVolumeDiscounts.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 text-sm text-blue-800 font-medium flex items-center gap-2">
            📦 <span>Volume pricing applied — saving <strong>${volumeDiscountTotal.toFixed(2)}</strong> on your order!</span>
          </div>
        )}
        {loyaltyDisc > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 text-sm text-green-800 font-medium flex items-center gap-2">
            ⭐ <span>Loyalty discount active — saving an extra <strong>${loyaltyDisc.toFixed(2)}</strong> today!</span>
          </div>
        )}

        {/* Rental Subtotal */}
        <div className="flex justify-between text-gray-600">
          <span>Rental Subtotal</span>
          <span>${rentalSubtotal.toFixed(2)}</span>
        </div>

        {promoDiscount > 0 && (
          <div className="flex justify-between text-purple-700 text-xs font-medium">
            <span>🏷 Promo Discount ({appliedPromo.code})</span>
            <span>−${promoDiscount.toFixed(2)}</span>
          </div>
        )}

        {autoVolumeDiscounts.map((vd, i) => (
          <div key={i} className="flex justify-between text-blue-700 text-xs font-medium">
            <span>📦 Volume: {vd.label}</span>
            <span>−${vd.amount.toFixed(2)}</span>
          </div>
        ))}

        {loyaltyDisc > 0 && (
          <div className="flex justify-between text-green-700 text-xs font-medium">
            <span>⭐ Loyalty Discount ({loyaltyDiscount}%)</span>
            <span>−${loyaltyDisc.toFixed(2)}</span>
          </div>
        )}

        {/* Manual Discount */}
        <div className="flex items-center justify-between text-gray-600 gap-4">
          <span className="shrink-0">Manual Discount</span>
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

        {(discountAmount > 0 || totalAutoDiscount > 0) && (
          <div className="flex justify-between text-green-700 text-xs font-medium">
            <span>After All Discounts</span>
            <span>${(rentalSubtotal - discountAmount - totalAutoDiscount).toFixed(2)}</span>
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

        {/* Delivery Fee */}
        {showDeliveryFee && (
          <div className="flex justify-between text-gray-600">
            <span>🚚 Delivery Fee</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </div>
        )}

        {/* Return/Pickup Fee */}
        {showReturnFee && (
          <div className="flex justify-between text-gray-600">
            <span>🚚 Pickup Fee</span>
            <span>${returnFee.toFixed(2)}</span>
          </div>
        )}

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAmountPaidChange(grand.toFixed(2))}
              className="text-xs px-2.5 py-1 rounded-full border border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-medium transition"
              title="Apply total due"
            >
              Apply
            </button>
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