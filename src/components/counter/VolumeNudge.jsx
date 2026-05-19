import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * Shows a nudge when a cart item is CLOSE to triggering a volume discount rule.
 * "Close" = within 20% of the minimum qty threshold.
 */
export default function VolumeNudge({ cart, equipment, volumeRules }) {
  const nudges = useMemo(() => {
    if (!cart?.length || !volumeRules?.length) return [];

    // Aggregate quantities per equipmentId and per category
    const qtyById = {};
    const qtyByCategory = {};
    cart.forEach(item => {
      const qty = item.quantity || 1;
      if (item.id) qtyById[item.id] = (qtyById[item.id] || 0) + qty;
      const eq = equipment.find(e => e.id === item.id);
      const cat = eq?.category || item.category;
      if (cat) qtyByCategory[cat] = (qtyByCategory[cat] || 0) + qty;
    });

    const results = [];
    volumeRules.forEach(rule => {
      if (!rule.active) return;
      const currentQty = rule.equipmentId
        ? (qtyById[rule.equipmentId] || 0)
        : (qtyByCategory[rule.category] || 0);

      if (currentQty === 0) return; // not in cart at all
      if (currentQty >= rule.minimumQuantity) return; // already triggered

      const needed = rule.minimumQuantity - currentQty;
      const pctThrough = currentQty / rule.minimumQuantity;
      if (pctThrough < 0.5) return; // less than halfway — not close enough to nudge

      const label = rule.equipmentId
        ? (equipment.find(e => e.id === rule.equipmentId)?.name || 'this item')
        : `${rule.category}s`;

      const savingLabel = rule.discountType === 'percent'
        ? `${rule.discountValue}% off`
        : `$${rule.discountValue} off per unit`;

      results.push({ id: rule.id, label, needed, savingLabel, minQty: rule.minimumQuantity });
    });

    return results;
  }, [cart, equipment, volumeRules]);

  if (!nudges.length) return null;

  return (
    <div className="space-y-1.5">
      {nudges.map(n => (
        <div key={n.id} className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-green-900">
            Add <strong>{n.needed} more {n.label}</strong> to unlock <strong>{n.savingLabel}</strong>
            {' '}(at {n.minQty}+)
          </div>
        </div>
      ))}
    </div>
  );
}