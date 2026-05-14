import { useState } from 'react';
import { Sparkles, Loader2, Truck, Users, DollarSign, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * AI Delivery Recommendation widget.
 * Shows recommended # of crew and vehicles for the delivery,
 * and lets the counter person add a delivery fee to the invoice.
 */
export default function DeliveryRecommendation({ cartItems, deliveryAddress, onAddDeliveryFee }) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [addedFee, setAddedFee] = useState(false);

  const hasAddress = deliveryAddress?.city || deliveryAddress?.address;

  const fetchRecommendation = async () => {
    setLoading(true);
    setRecommendation(null);
    try {
      const itemsDesc = cartItems.map(i => `${i.name} (${i.category || 'misc'}, ${i.weight || 'unknown weight'})`).join(', ');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a logistics coordinator for an equipment rental company.
Based on the equipment being delivered, recommend the number of crew members and vehicles needed, and suggest a fair delivery fee.

Equipment to deliver:
${itemsDesc}

Delivery destination: ${deliveryAddress?.address || ''} ${deliveryAddress?.city || ''}, ${deliveryAddress?.state || ''} ${deliveryAddress?.zip || ''}

Rules:
- Small/light items (chairs, tables, small tools): 1 crew, 1 pickup truck
- Medium equipment (generators <20kW, compressors, light towers, plate compactors): 2 crew, 1 flatbed truck
- Heavy/large equipment (excavators, boom lifts, scissor lifts, large generators >20kW): 2-3 crew, 1 flatbed + 1 support truck
- Tents (any size): 3 crew minimum, 1 box truck (for setup + teardown)
- Multiple pieces: add 1 extra crew per additional large item

Delivery fee guidance:
- 0-10 miles: $50-$75 base
- 11-30 miles: $75-$150
- 31-60 miles: $150-$300
- Each crew member over 1: add $25-$40

Return a JSON object only.`,
        response_json_schema: {
          type: 'object',
          properties: {
            crewCount: { type: 'integer', description: 'Recommended number of crew members' },
            vehicleCount: { type: 'integer', description: 'Number of vehicles needed' },
            vehicleType: { type: 'string', description: 'Type of vehicle(s) recommended' },
            recommendedFee: { type: 'number', description: 'Recommended delivery fee in USD' },
            reasoning: { type: 'string', description: 'Brief explanation (1-2 sentences)' },
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

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold">
          <Truck className="w-3.5 h-3.5" />
          AI Delivery Recommendation
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {!recommendation && !loading && (
            <button
              onClick={fetchRecommendation}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-medium bg-indigo-600 text-white rounded px-3 py-1.5 hover:bg-indigo-700 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get AI Recommendation
            </button>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-indigo-600 text-xs py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing delivery requirements…
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
                  <div className="text-[10px] text-gray-500">Vehicle{recommendation.vehicleCount !== 1 ? 's' : ''}</div>
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
                <div className="text-[11px] text-gray-600 italic leading-relaxed">
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