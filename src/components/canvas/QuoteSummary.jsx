import { ShoppingCart, ArrowRight, Save, Loader2, Zap } from 'lucide-react';

export default function QuoteSummary({ items, eventDate, onSave, onRequestReview, onSelfServeCheckout, saving, isCustomer, planStatus, isUnlocked }) {
  const lineItems = [];
  const seen = {};

  items.forEach(item => {
    const key = item.equipmentId;
    if (seen[key]) {
      seen[key].quantity += (item.quantity || 1);
      seen[key].subtotal += (item.dailyRate || 0) * (item.quantity || 1);
    } else {
      const entry = {
        name: item.equipmentName,
        quantity: item.quantity || 1,
        dailyRate: item.dailyRate || 0,
        subtotal: (item.dailyRate || 0) * (item.quantity || 1),
      };
      seen[key] = entry;
      lineItems.push(entry);
    }
  });

  const dailyTotal = lineItems.reduce((s, l) => s + l.subtotal, 0);
  const isDraft = planStatus === 'draft' || planStatus === 'customer_review';
  const isPlannerReview = planStatus === 'planner_review';
  const isFinalized = planStatus === 'finalized' || planStatus === 'converted';

  return (
    <div className="bg-slate-900 border-t border-white/10 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <ShoppingCart className="w-4 h-4" />
          <span>{items.length} item{items.length !== 1 ? 's' : ''} on canvas</span>
        </div>

        {lineItems.length > 0 && (
          <div className="flex-1 flex items-center gap-3 overflow-x-auto">
            {lineItems.slice(0, 5).map((l, i) => (
              <div key={i} className="flex-shrink-0 bg-slate-800 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-white/70">{l.name}</span>
                {l.quantity > 1 && <span className="text-white/40 ml-1">×{l.quantity}</span>}
                {l.dailyRate > 0 && <span className="text-cyan-400 ml-2">${l.subtotal.toFixed(0)}/day</span>}
              </div>
            ))}
            {lineItems.length > 5 && (
              <span className="text-white/30 text-xs flex-shrink-0">+{lineItems.length - 5} more</span>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {dailyTotal > 0 && (
            <div className="text-right">
              <div className="text-cyan-400 font-bold text-sm">${dailyTotal.toFixed(2)}/day</div>
              <div className="text-white/30 text-xs">est. quote</div>
            </div>
          )}

          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>

          {/* Self-serve: customer skips planner and goes straight to quote/rental */}
          {isCustomer && isDraft && isUnlocked && items.length > 0 && (
            <button
              onClick={onSelfServeCheckout}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs transition"
            >
              <Zap className="w-3.5 h-3.5" />
              Book Now (No Review)
            </button>
          )}

          {/* Request planner review */}
          {isDraft && isUnlocked && items.length > 0 && (
            <button
              onClick={onRequestReview}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs transition"
            >
              {isCustomer ? 'Request Planner Review' : 'Send to Planner Queue'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Planner: finalize and convert to rental */}
          {isPlannerReview && !isCustomer && (
            <button
              onClick={onRequestReview}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-bold text-xs transition"
            >
              Finalize → Create Rental <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isFinalized && (
            <div className="text-xs text-green-400 font-semibold px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg">
              ✅ Converted to Rental
            </div>
          )}
        </div>
      </div>
    </div>
  );
}