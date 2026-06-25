import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AvailabilityConfigPage() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      supabaseData.BranchSettings.list(),
      supabaseData.AvailabilityConfig.list('-created_at', 100),
    ]).then(([branchSettings, configs]) => {
      const map = {};
      branchSettings.forEach(b => {
        const config = configs.find(c => c.branch === b.branch) || { branch: b.branch };
        map[b.branch] = { ...config, branchName: b.branch };
      });
      setBranches(map);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const branch of Object.keys(branches)) {
        const config = branches[branch];
        const payload = {
          branch: config.branch,
          allowOverbookingByDefault: config.allowOverbookingByDefault || false,
          defaultMaxOverbookPercent: parseFloat(config.defaultMaxOverbookPercent || 0),
          requireApprovalAbovePercent: parseFloat(config.requireApprovalAbovePercent || 5),
          defaultBufferDays: parseInt(config.defaultBufferDays || 0),
          enableCrossBranchReservations: config.enableCrossBranchReservations !== false,
          notes: config.notes || '',
        };

        if (config.id) {
          await supabaseData.AvailabilityConfig.update(config.id, payload);
        } else {
          await supabaseData.AvailabilityConfig.create(payload);
        }
      }
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Error: ${err.message}`);
      setSaving(false);
    }
  };

  const updateBranch = (branchName, field, value) => {
    setBranches(prev => ({
      ...prev,
      [branchName]: { ...prev[branchName], [field]: value },
    }));
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
      <AppPageHeader
        title="Availability Configuration"
        subtitle="Branch-level overbooking & buffer settings"
        backTo="/lupine"
        action={
          <Button onClick={handleSave} disabled={saving} className="gap-2 text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Branch Availability Rules:</strong> Configure whether individual items can be overbooked, how many days
          between rentals are required for cleaning/maintenance, and whether cross-branch reservations are allowed.
        </div>

        {/* Branches */}
        <div className="space-y-4">
          {Object.keys(branches)
            .sort()
            .map(branchName => {
              const config = branches[branchName];
              return (
                <div key={branchName} className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
                  <div className="font-semibold text-gray-900 text-lg border-b pb-3">{branchName}</div>

                  {/* Overbooking */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Allow Overbooking by Default?
                      </label>
                      <select
                        value={config.allowOverbookingByDefault ? 'yes' : 'no'}
                        onChange={e => updateBranch(branchName, 'allowOverbookingByDefault', e.target.value === 'yes')}
                        className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
                      >
                        <option value="no">No (strict inventory)</option>
                        <option value="yes">Yes (allow overselling)</option>
                      </select>
                    </div>

                    {config.allowOverbookingByDefault && (
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">
                          Max Overbook % (default)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={config.defaultMaxOverbookPercent || 0}
                          onChange={e => updateBranch(branchName, 'defaultMaxOverbookPercent', e.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                    )}
                  </div>

                  {/* Approval threshold */}
                  {config.allowOverbookingByDefault && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Require Manager Approval Above %
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={config.requireApprovalAbovePercent || 5}
                        onChange={e => updateBranch(branchName, 'requireApprovalAbovePercent', e.target.value)}
                        placeholder="e.g. 5"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Overbooking above this % requires manager PIN approval at counter.
                      </div>
                    </div>
                  )}

                  {/* Buffer days */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Default Buffer Days Between Rentals
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="7"
                      value={config.defaultBufferDays || 0}
                      onChange={e => updateBranch(branchName, 'defaultBufferDays', e.target.value)}
                      placeholder="0"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Days equipment must sit idle between rentals (e.g. 1 = must rest 1 day between rentals for cleaning).
                    </div>
                  </div>

                  {/* Cross-branch */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">
                      Cross-Branch Reservations
                    </label>
                    <select
                      value={config.enableCrossBranchReservations !== false ? 'yes' : 'no'}
                      onChange={e => updateBranch(branchName, 'enableCrossBranchReservations', e.target.value === 'yes')}
                      className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
                    >
                      <option value="yes">Yes (can reserve from other branches)</option>
                      <option value="no">No (same-branch only)</option>
                    </select>
                    <div className="text-xs text-gray-500 mt-1">
                      If enabled, customers can reserve equipment from other branches and have it transferred for
                      delivery.
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                    <Input
                      value={config.notes || ''}
                      onChange={e => updateBranch(branchName, 'notes', e.target.value)}
                      placeholder="Internal notes about this branch's policies..."
                    />
                  </div>
                </div>
              );
            })}
        </div>


      </div>
    </div>
  );
}