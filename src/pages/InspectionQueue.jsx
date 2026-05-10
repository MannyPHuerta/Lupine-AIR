import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InspectionQueue() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(null);
  const [conditionBefore, setConditionBefore] = useState('');
  const [needsRepair, setNeedsRepair] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState('');

  const load = async () => {
    setLoading(true);
    const eq = await base44.entities.Equipment.filter({ unitStatus: 'under_inspection' });
    setEquipment(eq);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flaggedForInspection = useMemo(() =>
    equipment.filter(e => e.unitStatus === 'under_inspection'),
    [equipment]
  );

  const handleCompleteInspection = async () => {
    if (!inspecting || !conditionBefore) {
      alert('Please select equipment and document condition');
      return;
    }

    try {
      // Update equipment status
      const newStatus = needsRepair ? 'awaiting_parts' : 'available';
      await base44.entities.Equipment.update(inspecting.id, {
        unitStatus: newStatus,
        condition: conditionBefore,
        statusNote: inspectionNotes,
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: 'inspection_queue',
      });

      // If repair needed, create a WorkOrder
      if (needsRepair) {
        await base44.entities.WorkOrder.create({
          equipmentId: inspecting.id,
          equipmentName: inspecting.name,
          type: 'repair',
          status: 'scheduled',
          branch: '01 McAllen', // TODO: get from equipment metadata or session
          description: `Return inspection flagged this unit for repair`,
          notes: inspectionNotes,
          conditionBefore,
          canStartWithoutParts: false,
        });
      }

      alert(`✓ Inspection complete. Equipment marked as ${needsRepair ? 'needing repair' : 'available'}`);
      setInspecting(null);
      setConditionBefore('');
      setNeedsRepair(false);
      setInspectionNotes('');
      load();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair', 'Retired'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-4xl mx-auto">
          <button onClick={() => navigate('/shop-floor')} className="p-2 rounded-lg hover:bg-orange-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Equipment Inspection Queue</div>
            <div className="text-orange-300 text-xs">
              {flaggedForInspection.length} item{flaggedForInspection.length !== 1 ? 's' : ''} waiting for inspection
            </div>
          </div>
          <button onClick={load} className="p-2 rounded-lg hover:bg-orange-800">
            ↻
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {flaggedForInspection.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <div className="text-sm font-medium">Queue is empty</div>
            <div className="text-xs text-gray-400 mt-1">All equipment has been inspected</div>
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedForInspection.map(eq => (
              <div
                key={eq.id}
                className={`bg-white rounded-lg border shadow-sm p-4 transition cursor-pointer ${
                  inspecting?.id === eq.id ? 'border-orange-400 bg-orange-50' : 'hover:border-orange-300'
                }`}
                onClick={() => {
                  setInspecting(eq);
                  setConditionBefore(eq.condition || '');
                  setInspectionNotes('');
                  setNeedsRepair(false);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      {eq.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                      <div>Category: {eq.category || '—'}</div>
                      <div>Current Condition: {eq.condition || '—'}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                      Awaiting Inspection
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inspection Form */}
        {inspecting && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-gray-900">Inspecting: {inspecting.name}</div>
                <div className="text-xs text-gray-600 mt-1">Complete the inspection to clear this item from the queue</div>
              </div>
              <button
                onClick={() => setInspecting(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">Equipment Condition</label>
                <select
                  value={conditionBefore}
                  onChange={e => setConditionBefore(e.target.value)}
                  className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
                >
                  <option value="">Select condition...</option>
                  {CONDITIONS.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">Inspection Notes</label>
                <textarea
                  value={inspectionNotes}
                  onChange={e => setInspectionNotes(e.target.value)}
                  placeholder="Document any damage, issues, or findings..."
                  rows={3}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                <input
                  type="checkbox"
                  id="needsRepair"
                  checked={needsRepair}
                  onChange={e => setNeedsRepair(e.target.checked)}
                  className="w-4 h-4 accent-orange-600"
                />
                <label htmlFor="needsRepair" className="flex-1 text-sm font-medium text-gray-900 cursor-pointer">
                  <Wrench className="w-4 h-4 inline mr-1.5" />
                  This equipment needs repair
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setInspecting(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCompleteInspection}
                  className="bg-orange-600 hover:bg-orange-700 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Inspection
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}