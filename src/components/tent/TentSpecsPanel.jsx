import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TentSpecsPanel({ equipmentId, equipmentName, category, tentSpecsId }) {
  const [specs, setSpecs] = useState(null);
  const [allSpecs, setAllSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    Promise.all([
      tentSpecsId ? base44.entities.TentSpecs.filter({ id: tentSpecsId }) : Promise.resolve([]),
      base44.entities.TentSpecs.list('-created_date', 100),
    ]).then(([current, all]) => {
      setSpecs(current[0] || null);
      setAllSpecs(all);
      setLoading(false);
    });
  }, [tentSpecsId]);

  const handleLink = async (specsId) => {
    await base44.entities.Equipment.update(equipmentId, { tentSpecsId: specsId });
    setSpecs(allSpecs.find(s => s.id === specsId));
    setShowForm(false);
  };

  const handleUnlink = async () => {
    await base44.entities.Equipment.update(equipmentId, { tentSpecsId: null });
    setSpecs(null);
    setShowForm(false);
  };

  if (category !== 'Tent') {
    return null;
  }

  if (loading) {
    return <div className="text-sm text-gray-400">Loading tent specs…</div>;
  }

  return (
    <div className="border rounded-lg bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          🏕 Tent Specifications
          {specs && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Linked</span>}
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pt-2 border-t">
          {specs ? (
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="font-medium text-green-900">{specs.name}</div>
                {specs.description && <div className="text-xs text-green-700 mt-1">{specs.description}</div>}
              </div>

              {/* Footprint */}
              {specs.footprint && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Footprint:</span>
                  <span className="text-gray-600 ml-1">
                    {specs.footprint.lengthFeet}' × {specs.footprint.widthFeet}'
                    {specs.footprint.lengthMeters && ` (${specs.footprint.lengthMeters}m × ${specs.footprint.widthMeters}m)`}
                  </span>
                </div>
              )}

              {/* Height */}
              {specs.height && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Height:</span>
                  <span className="text-gray-600 ml-1">
                    Peak {specs.height.peakHeightFeet}' / Eave {specs.height.eaveHeightFeet}'
                  </span>
                </div>
              )}

              {/* Weight */}
              {specs.weight && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Weight:</span>
                  <span className="text-gray-600 ml-1">{specs.weight.poundsAssembled} lbs</span>
                </div>
              )}

              {/* Capacity */}
              {specs.capacity && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Capacity:</span>
                  <span className="text-gray-600 ml-1">
                    {specs.capacity.maxPersons} standing / {specs.capacity.seatedCapacity} seated
                  </span>
                </div>
              )}

              {/* Wind Rating */}
              {specs.windRating && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Wind Rating:</span>
                  <span className="text-gray-600 ml-1">Max {specs.windRating.maxWindMph} mph</span>
                </div>
              )}

              {/* Ground Requirements */}
              {specs.groundRequirements && specs.groundRequirements.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Ground Types:</span>
                  <span className="text-gray-600 ml-1">{specs.groundRequirements.join(', ')}</span>
                </div>
              )}

              {/* Setup Info */}
              {specs.setup && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Setup:</span>
                  <span className="text-gray-600 ml-1">
                    ~{specs.setup.estimatedSetupMinutes} min with {specs.setup.crewRequired} crew
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={() => handleUnlink()}
                  className="text-xs text-red-600 hover:underline"
                >
                  Unlink Specs
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">No tent specs linked yet.</p>
              {!showForm ? (
                <Button
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="gap-1 bg-indigo-600 hover:bg-indigo-700 w-full"
                >
                  <Plus className="w-3.5 h-3.5" /> Link or Create Specs
                </Button>
              ) : (
                <div className="space-y-2 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <label className="text-xs font-medium text-gray-700 block">Select Existing Specs</label>
                  <div className="space-y-1">
                    {allSpecs.length === 0 ? (
                      <div className="text-xs text-gray-500">No tent specs available yet.</div>
                    ) : (
                      allSpecs.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleLink(s.id)}
                          className="w-full text-left px-3 py-2 text-xs bg-white border border-indigo-300 rounded hover:bg-indigo-50 transition"
                        >
                          <div className="font-medium text-gray-900">{s.name}</div>
                          {s.footprint && (
                            <div className="text-gray-500">
                              {s.footprint.lengthFeet}' × {s.footprint.widthFeet}'
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}