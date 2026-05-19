import { useEffect, useMemo } from 'react';
import { Zap, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PromoNudge({ allPromoCodes, currentPromo, onApplyPromo, subtotal }) {
  const suggestedPromo = useMemo(() => {
    if (currentPromo || !allPromoCodes?.length) return null;

    const today = new Date();
    const active = allPromoCodes.filter(p => 
      p.active && 
      (!p.expiresAt || new Date(p.expiresAt) > today) &&
      (p.usageLimit === null || p.usageCount < p.usageLimit)
    );

    if (!active.length) return null;

    // Pick the one with best savings
    return active.reduce((best, current) => {
      const bestSave = best.discountType === 'percent'
        ? (subtotal * best.discountValue / 100)
        : best.discountValue;
      const currentSave = current.discountType === 'percent'
        ? (subtotal * current.discountValue / 100)
        : current.discountValue;
      return currentSave > bestSave ? current : best;
    });
  }, [allPromoCodes, currentPromo, subtotal]);

  if (!suggestedPromo || subtotal <= 0) return null;

  const savings = suggestedPromo.discountType === 'percent'
    ? (subtotal * suggestedPromo.discountValue / 100).toFixed(2)
    : suggestedPromo.discountValue.toFixed(2);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-amber-900">Promo available</div>
          <div className="text-xs text-amber-800 mt-0.5">
            {suggestedPromo.code} saves <strong>${savings}</strong>
          </div>
        </div>
      </div>
      <Button
        onClick={() => onApplyPromo(suggestedPromo.code)}
        size="sm"
        className="w-full text-xs bg-amber-600 hover:bg-amber-700 gap-1"
      >
        <Copy className="w-3 h-3" /> Apply {suggestedPromo.code}
      </Button>
    </div>
  );
}