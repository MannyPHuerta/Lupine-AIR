import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Truck, Users, DollarSign, ChevronDown, ChevronUp, Plus, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * AI Delivery Recommendation widget.
 * Quantity-aware: scales crew and trucks for bulk orders (chairs, tables, etc.)
 * Auto-triggers when large quantities are detected.
 */
export default function DeliveryRecommendation({ cartItems, deliveryAddress, onAddDeliveryFee }) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [addedFee, setAddedFee] = useState(false);

  const hasAddress = deliveryAddress?.city || deliveryAddress?.address;

  // Detect large quantity orders — auto-fetch recommendation
  const totalQty = cartItems?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 0;
  const isBigOrder = totalQty >= 50;

  useEffect(() => {
    if (isBigOrder && hasAddress && !recommendation && !loading) {
      fetchRecommendation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBigOrder, hasAddress]);

  const fetchRecommendation = async () => {
    setLoading(true);
    setRecommendation(null);
    try {
      // Build a detailed, quantity-aware item list
      const itemsDesc = cartItems.map(i => {
        const qty = i.quantity || 1;
        return `${qty}x ${i.name} (${i.category || 'misc'})`;
      }).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a logistics coordinator for an equipment rental company.
Based on the equipment being delivered — including exact quantities — recommend the number of crew members, vehicles, and a fair delivery fee.

Equipment list (quantity x item):
${itemsDesc}

Delivery destination: ${deliveryAddress?.address || ''} ${deliveryAddress?.city || ''}, ${deliveryAddress?.state || ''} ${deliveryAddress?.zip || ''}

Scaling rules (apply based on TOTAL load, not just item type):
- Chairs/tables: every 100 units requires 1 truck and 2 crew. 1000 chairs = 10 trucks, 20 crew minimum.
- If setup/teardown is included for chairs/tables, add 50% more crew (setup takes time and manpower).
- Small/light items (1-20 qty): 1 crew, 1 pickup truck.
- Medium equipment (generators <20kW, compressors, light towers): 2 crew, 1 flatbed.
- Heavy/large equipment (excavators, boom lifts, scissor lifts, large generators >20kW): 3 crew, 1 flatbed + 1 support truck.
- Tents (any size): 4 crew minimum, 1 box truck.
- Mixed orders: sum requirements for each item type.
- Always round crew up to nearest even number for safety.

Delivery fee:
- Base fee by distance: 0-10 mi: $75, 11-30 mi: $150, 31-60 mi: $300.
- Add $50 per truck beyond the first.
- Add $35 per crew member beyond 2.
- For 1000+ chairs: minimum $400 delivery fee.

Return ONLY a JSON object.`,
        response_json_schema: {
          type: 'object',
          properties: {
            crewCount: { type: 'integer', description: 'Recommended number of crew members' },
            vehicleCount: { type: 'integer', description: 'Number of vehicles needed' },
            vehicleType: { type: 'string', description: 'Type(s) of vehicle(s) recommended' },
            recommendedFee: { type: 'number', description: 'Recommended delivery fee in USD' },
            reasoning: { type: 'string', description: 'Brief explanation (2-3 sentences) covering why this many crew/trucks are needed' },
          }
        }
      });
      setRecommendation(result);
      setAddedFee(false);
    } catch (err) {
      setRecommendation({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFee = () => {
    if (!recommendation?.recommendedFee) return;
    onAddDeliveryFee(recommendation.recommendedFee);
    setAddedFee(true);
  };

  if (!cartItems || cartItems.length === 0) return null;

  // Warn if this is a big order and no recommendation has been run yet
  const showBigOrderWarning = isBigOrder && !recommendation && !loading;

  return (
    <div className={`border rounded-lg overflow-hidden ${isBigOrder ? 'border-orange-300 bg-orange-50' : 'border-indigo-200 bg-indigo-50'}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className={`flex items-center gap-2 text-xs font-semibold ${isBigOrder ? 'text-orange-700' : 'text-indigo-700'}`}>
          {isBigOrder ? <AlertTriangle className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
          AI Delivery Sizing
          {isBigOrder && <span className="bg-orange-200 text-orange-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">LARGE ORDER — {totalQty} items</span>}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Big order nudge */}
          {showBigOrderWarning && (
            <div className="bg-orange-100 border border-orange-300 rounded p-2 text-xs text-orange-800 font-medium flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>This is a large order ({totalQty} items). You <strong>must</strong> get an AI sizing recommendation before finalizing — 1 truck is not enough.</span>
            </div>
          )}

          {!recommendation && !loading && (
            <button
              onClick={fetchRecommendation}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium rounded px-3 py-1.5 transition text-white ${
                isBigOrder ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isBigOrder ? 'Calculate Required Crew & Trucks' : 'Get AI Recommendation'}
            </button>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-indigo-600 text-xs py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Calculating crew & trucks for {totalQty} items…
            </div>
          )}

          {recommendation && !recommendation.error && (
            <div className="space-y-2">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-white border border-indigo-100 rounded p-2 text-center">
                  <Users className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-0.5" />
                  <div className="text-base font-bold text-gray-900">{recommendation.crewCount}</div>
                  <div className="text-[10px] text-gray-500">Crew</div>
                </div>
                <div className="bg-white border border-indigo-100 rounded p-2 text-center">
                  <Truck className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-0.5" />
                  <div className="text-base font-bold text-gray-900">{recommendation.vehicleCount}</div>
                  <div className="text-[10px] text-gray-500">Truck{recommendation.vehicleCount !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-white border border-indigo-100 rounded p-2 text-center">
                  <DollarSign className="w-3.5 h-3.5 text-green-500 mx-auto mb-0.5" />
                  <div className="text-base font-bold text-gray-900">${recommendation.recommendedFee}</div>
                  <div className="text-[10px] text-gray-500">Fee</div>
                </div>
              </div>

              {recommendation.vehicleType && (
                <div className="text-[11px] text-indigo-700 bg-white border border-indigo-100 rounded px-2 py-1">
                  🚛 {recommendation.vehicleType}
                </div>
              )}

              {recommendation.reasoning && (
                <div className="text-[11px] text-gray-600 italic leading-relaxed bg-white border border-gray-100 rounded px-2 py-1.5">
                  {recommendation.reasoning}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={handleAddFee}
                  disabled={addedFee}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium rounded px-2 py-1.5 transition ${
                    addedFee
                      ? 'bg-green-100 text-green-700 border border-green-300 cursor-default'
                      : 'bg-white border border-indigo-300 text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  {addedFee ? '✓ Added to Invoice' : <><Plus className="w-3 h-3" /> Add ${recommendation.recommendedFee} Fee</>}
                </button>
                <button
                  onClick={fetchRecommendation}
                  className="text-xs text-indigo-500 hover:text-indigo-700 px-2 border border-indigo-200 rounded bg-white"
                  title="Re-run recommendation"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {recommendation?.error && (
            <div className="text-xs text-red-600 bg-red-50 rounded p-2">{recommendation.error}</div>
          )}
        </div>
      )}
    </div>
  );
}