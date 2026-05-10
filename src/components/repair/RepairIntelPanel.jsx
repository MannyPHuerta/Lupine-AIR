import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, TrendingUp, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RepairIntelPanel({ maintenanceLog, equipment, rentals, onStatusUpdate }) {
  const [loading, setLoading] = useState(false);
  const [intel, setIntel] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [costEstimate, setCostEstimate] = useState('');
  const [notes, setNotes] = useState(maintenanceLog.notes || '');

  const generateIntel = async () => {
    if (!equipment) return;
    setLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeRepairIntel', {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        equipmentCategory: equipment.category,
        purchaseCost: equipment.purchaseCost,
        dailyRate: equipment.dailyRate,
        currentCondition: maintenanceLog.conditionBefore,
        maintenanceType: maintenanceLog.type,
        rentalHistory: rentals.slice(0, 20).map(r => ({
          startDate: r.startDate,
          endDate: r.endDate,
          baseAmount: r.baseAmount,
        })),
      });
      setIntel(response.data);
    } catch (err) {
      console.error('Intel generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    await onStatusUpdate(newStatus);
    setExpanded(false);
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition">
      {/* Summary Row */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              maintenanceLog.status === 'scheduled' ? 'bg-blue-500' :
              maintenanceLog.status === 'in_progress' ? 'bg-amber-500' :
              'bg-green-500'
            }`} />
            <div>
              <div className="font-semibold text-gray-900">{equipment?.name || 'Unknown Equipment'}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {maintenanceLog.type} • {maintenanceLog.scheduledDate}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-900">${maintenanceLog.cost || '—'}</div>
          <div className="text-xs text-gray-500">{maintenanceLog.status}</div>
        </div>
      </div>

      {/* Expanded Intel Panel */}
      {expanded && (
        <div className="border-t bg-gray-50 px-6 py-4 space-y-4">
          {/* Generate Intel Button */}
          {!intel && (
            <div className="flex gap-2">
              <Button
                onClick={generateIntel}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Generate AI Intel
              </Button>
            </div>
          )}

          {/* Intel Results */}
          {intel && (
            <div className="space-y-3 bg-white rounded-lg p-4 border border-indigo-200 bg-indigo-50">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">Business Impact</div>
                  <p className="text-xs text-gray-600 mt-1">{intel.businessImpact}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-indigo-200">
                <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">ROI Analysis</div>
                  <p className="text-xs text-gray-600 mt-1">{intel.roiAnalysis}</p>
                  <div className="mt-2 p-2 bg-white rounded text-xs font-medium text-green-700">
                    Estimated Recovery: ${intel.estimatedRecovery}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-indigo-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">Risk & Success Rate</div>
                  <p className="text-xs text-gray-600 mt-1">{intel.riskAssessment}</p>
                  <div className="mt-2 p-2 bg-white rounded text-xs font-medium text-amber-700">
                    Success Probability: {intel.successProbability}%
                  </div>
                </div>
              </div>

              {intel.recommendedParts && (
                <div className="flex items-start gap-3 pt-2 border-t border-indigo-200">
                  <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">Recommended Parts</div>
                    <p className="text-xs text-gray-600 mt-1">{intel.recommendedParts}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 pt-2 border-t border-indigo-200">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm">Recommendation</div>
                  <p className="text-xs text-gray-600 mt-1">{intel.recommendation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Cost & Notes */}
          <div className="space-y-3 bg-white rounded-lg p-4 border">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Estimated Cost</label>
              <Input
                type="number"
                value={costEstimate}
                onChange={e => setCostEstimate(e.target.value)}
                placeholder="Labor + parts total"
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Findings, decisions, next steps..."
                className="w-full text-sm p-2 border rounded-md resize-none h-20"
              />
            </div>
          </div>

          {/* Status Transitions */}
          <div className="flex gap-2 flex-wrap">
            {maintenanceLog.status === 'scheduled' && (
              <Button
                onClick={() => handleStatusUpdate('in_progress')}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm"
              >
                Start Repair
              </Button>
            )}
            {maintenanceLog.status === 'in_progress' && (
              <Button
                onClick={() => handleStatusUpdate('completed')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                Mark Complete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setExpanded(false)}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}