import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Tag } from 'lucide-react';

export default function DiscountCalc({
  subtotal,
  days,
  cart,
  promoCode,
  onPromoChange,
  allPromoCodes,
  allVolumeRules,
}) {
  const discount = useMemo(() => {
    let amount = 0;
    let reason = '';

    // Volume discounts
    allVolumeRules?.forEach(rule => {
      const qty = cart.filter(c => c.category === rule.category || c.id === rule.equipmentId).length;
      if (qty >= rule.minimumQuantity) {
        const disc = rule.discountType === 'percent'
          ? (subtotal * rule.discountValue / 100)
          : (rule.discountValue * qty);
        if (disc > amount) {
          amount = disc;
          reason = `${rule.minimumQuantity}+ ${rule.category || 'items'} discount`;
        }
      }
    });

    // Duration discount (7+ days)
    if (days >= 7 && !reason) {
      amount = subtotal * 0.15; // 15% for 7+ days
      reason = '7+ day discount';
    }

    // Promo code
    if (promoCode) {
      const promo = allPromoCodes?.find(p => p.code.toLowerCase() === promoCode.toLowerCase() && p.active);
      if (promo) {
        const promoDisc = promo.discountType === 'percent'
          ? (subtotal * promo.discountValue / 100)
          : promo.discountValue;
        if (promoDisc > amount) {
          amount = promoDisc;
          reason = `Promo ${promo.code}`;
        }
      }
    }

    return { amount, reason };
  }, [subtotal, days, cart, promoCode, allPromoCodes, allVolumeRules]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-gray-500" />
        <Input
          placeholder="Promo code..."
          value={promoCode}
          onChange={e => onPromoChange(e.target.value)}
          className="text-xs"
        />
      </div>

      {discount.amount > 0 && (
        <div className="text-xs bg-green-50 border border-green-200 text-green-800 px-2 py-1 rounded">
          <strong>{discount.reason}</strong>: -${discount.amount.toFixed(2)}
        </div>
      )}

      <div className="text-xs font-medium text-gray-700 flex justify-between p-2 bg-gray-50 rounded">
        <span>Subtotal</span>
        <span>${subtotal.toFixed(2)}</span>
      </div>

      {discount.amount > 0 && (
        <div className="text-xs font-medium text-green-700 flex justify-between p-2 bg-green-50 rounded">
          <span>Discount</span>
          <span>-${discount.amount.toFixed(2)}</span>
        </div>
      )}

      <div className="text-sm font-bold text-gray-900 flex justify-between p-2 bg-indigo-50 rounded border border-indigo-200">
        <span>After Discount</span>
        <span>${(subtotal - discount.amount).toFixed(2)}</span>
      </div>
    </div>
  );
}