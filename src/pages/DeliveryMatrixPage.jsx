import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BRANCHES = [
  '01 McAllen',
  '02 Weslaco',
  '03 Harlingen',
  '05 Brownsville',
  '06 Corpus',
  '99 Warehouse',
];

export default function DeliveryMatrixPage() {
  const navigate = useNavigate();
  const [matrices, setMatrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [savedBranch, setSavedBranch] = useState('');

  useEffect(() => {
    supabaseData.DeliveryMatrix.list().then(records => {
      const map = {};
      records.forEach(r => { map[r.branch] = r; });
      setMatrices(map);
      setLoading(false);
    });
  }, []);

  const getMatrix = (branch) => matrices[branch] || {
    branch,
    laborRatePerManHour: 25,
    truckRatePerHour: 15,
    defaultCrewSize: 2,
    defaultTrucks: 1,
    minimumCharge: 75,
    zones: [],
    notes: '',
  };

  const updateMatrix = (branch, field, value) => {
    setMatrices(prev => ({
      ...prev,
      [branch]: { ...getMatrix(branch), ...prev[branch], [field]: value },
    }));
  };

  const addZone = (branch) => {
    const m = { ...getMatrix(branch), ...matrices[branch] };
    const zones = [...(m.zones || []), { label: '', zipPrefixes: [], estimatedMinutes: 30, crewSize: null, trucks: null, flatRate: null }];
    updateMatrix(branch, 'zones', zones);
  };

  const updateZone = (branch, idx, field, value) => {
    const m = { ...getMatrix(branch), ...matrices[branch] };
    const zones = [...(m.zones || [])];
    zones[idx] = { ...zones[idx], [field]: value };
    updateMatrix(branch, 'zones', zones);
  };

  const removeZone = (branch, idx) => {
    const m = { ...getMatrix(branch), ...matrices[branch] };
    const zones = [...(m.zones || [])].filter((_, i) => i !== idx);
    updateMatrix(branch, 'zones', zones);
  };

  const handleSave = async (branch) => {
    setSaving(branch);
    const data = { ...getMatrix(branch), ...matrices[branch] };
    try {
      if (data.id) {
        await supabaseData.DeliveryMatrix.update(data.id, data);
      } else {
        const created = await supabaseData.DeliveryMatrix.create(data);
        setMatrices(prev => ({ ...prev, [branch]: created }));
      }
      setSavedBranch(branch);
      setTimeout(() => setSavedBranch(''), 2000);
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader title="Delivery Matrix" subtitle="Branch-specific delivery rates & zones" backTo="/availability" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
          <strong>How it works:</strong> Set labor and truck rates per branch. Add zones by zip prefix (e.g. "785" matches all 785xx zips) to override drive times or set flat rates. The fee formula is: <code className="bg-blue-100 px-1 rounded">((laborRate × crewSize) + (truckRate × trucks)) × (driveMinutes × 2 / 60)</code>, subject to the minimum charge.
        </div>

        {BRANCHES.map(branch => {
          const m = { ...getMatrix(branch), ...matrices[branch] };
          const zones = m.zones || [];
          const isSaving = saving === branch;
          const isSaved = savedBranch === branch;

          return (
            <div key={branch} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b px-5 py-3 flex items-center justify-between">
                <div className="font-semibold text-gray-800">{branch}</div>
                <Button size="sm" onClick={() => handleSave(branch)} disabled={isSaving} className="gap-2 text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSaved ? 'Saved!' : 'Save'}
                </Button>
              </div>

              <div className="p-5 space-y-4">
                {/* Base rates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Labor Rate ($/hr/person)</label>
                    <Input type="number" min="0" step="0.01" value={m.laborRatePerManHour || ''} onChange={e => updateMatrix(branch, 'laborRatePerManHour', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Truck Rate ($/hr)</label>
                    <Input type="number" min="0" step="0.01" value={m.truckRatePerHour || ''} onChange={e => updateMatrix(branch, 'truckRatePerHour', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Default Crew Size</label>
                    <Input type="number" min="1" value={m.defaultCrewSize || 2} onChange={e => updateMatrix(branch, 'defaultCrewSize', parseInt(e.target.value) || 2)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Default Trucks</label>
                    <Input type="number" min="1" value={m.defaultTrucks || 1} onChange={e => updateMatrix(branch, 'defaultTrucks', parseInt(e.target.value) || 1)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Charge ($)</label>
                    <Input type="number" min="0" step="0.01" value={m.minimumCharge || ''} onChange={e => updateMatrix(branch, 'minimumCharge', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <Input value={m.notes || ''} onChange={e => updateMatrix(branch, 'notes', e.target.value)} placeholder="Internal notes..." />
                  </div>
                </div>

                {/* Zones */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Zones</div>
                    <button onClick={() => addZone(branch)} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                      <Plus className="w-3.5 h-3.5" /> Add Zone
                    </button>
                  </div>

                  {zones.length === 0 && (
                    <div className="text-xs text-gray-400 italic">No zones configured — AI will estimate drive time from address.</div>
                  )}

                  <div className="space-y-3">
                    {zones.map((zone, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Zone Label</label>
                            <Input className="text-sm h-8" value={zone.label || ''} onChange={e => updateZone(branch, idx, 'label', e.target.value)} placeholder="e.g. McAllen Metro" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Drive Time (min one-way)</label>
                            <Input className="text-sm h-8" type="number" min="0" value={zone.estimatedMinutes || ''} onChange={e => updateZone(branch, idx, 'estimatedMinutes', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="flex items-end justify-end">
                            <button onClick={() => removeZone(branch, idx)} className="text-red-400 hover:text-red-600 p-1.5">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Zip Prefixes (comma-separated)</label>
                            <Input
                              className="text-sm h-8"
                              value={(zone.zipPrefixes || []).join(', ')}
                              onChange={e => updateZone(branch, idx, 'zipPrefixes', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                              placeholder="e.g. 785, 78501, 78502"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Flat Rate ($, optional)</label>
                            <Input className="text-sm h-8" type="number" min="0" step="0.01" value={zone.flatRate ?? ''} onChange={e => updateZone(branch, idx, 'flatRate', e.target.value === '' ? null : parseFloat(e.target.value))} placeholder="Leave blank to use formula" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Override Crew Size</label>
                            <Input className="text-sm h-8" type="number" min="1" value={zone.crewSize ?? ''} onChange={e => updateZone(branch, idx, 'crewSize', e.target.value === '' ? null : parseInt(e.target.value))} placeholder="Default" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}