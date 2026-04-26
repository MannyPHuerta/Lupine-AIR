import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DependenciesEditor() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [availableForDep, setAvailableForDep] = useState([]);
  const [selectedDepId, setSelectedDepId] = useState('');
  const [depReason, setDepReason] = useState('');
  const [depMinQty, setDepMinQty] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Equipment.list('-created_date', 500).then(eq => {
      setEquipment(eq);
      setLoading(false);
    });
  }, []);

  const selectedEquip = equipment.find(e => e.id === selectedEquipmentId);
  const currentDeps = selectedEquip?.dependencies || [];

  useEffect(() => {
    if (selectedEquipmentId) {
      setAvailableForDep(
        equipment.filter(e => 
          e.id !== selectedEquipmentId && 
          !currentDeps.some(d => d.equipmentId === e.id)
        )
      );
    }
  }, [selectedEquipmentId, equipment, currentDeps]);

  const handleAddDependency = async () => {
    if (!selectedDepId || !selectedEquipmentId) return;

    const depItem = equipment.find(e => e.id === selectedDepId);
    const newDep = {
      equipmentId: selectedDepId,
      name: depItem.name,
      reason: depReason || undefined,
      minQuantity: depMinQty
    };

    setSaving(true);
    try {
      const updated = {
        ...selectedEquip,
        dependencies: [...currentDeps, newDep]
      };
      await base44.entities.Equipment.update(selectedEquipmentId, {
        dependencies: updated.dependencies
      });
      
      setEquipment(prev => prev.map(e => 
        e.id === selectedEquipmentId ? updated : e
      ));
      
      setSelectedDepId('');
      setDepReason('');
      setDepMinQty(1);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDependency = async (equipmentIdToRemove) => {
    setSaving(true);
    try {
      const updated = {
        ...selectedEquip,
        dependencies: currentDeps.filter(d => d.equipmentId !== equipmentIdToRemove)
      };
      await base44.entities.Equipment.update(selectedEquipmentId, {
        dependencies: updated.dependencies
      });
      
      setEquipment(prev => prev.map(e => 
        e.id === selectedEquipmentId ? updated : e
      ));
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/availability')}
            className="text-white p-2 rounded-lg hover:bg-purple-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Equipment Dependencies</div>
            <div className="text-purple-300 text-xs">Manage which items go together</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equipment Selector */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Select Equipment</h2>
            <select
              value={selectedEquipmentId || ''}
              onChange={(e) => setSelectedEquipmentId(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
            >
              <option value="">Choose an item...</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.name} ({eq.category})
                </option>
              ))}
            </select>

            {selectedEquip && (
              <div className="bg-purple-50 rounded-lg p-4 text-sm">
                <div className="font-semibold text-purple-900">{selectedEquip.name}</div>
                <div className="text-purple-700 text-xs mt-1">{selectedEquip.category}</div>
                <div className="text-purple-600 mt-2">${selectedEquip.dailyRate}/day</div>
              </div>
            )}
          </div>

          {/* Current Dependencies */}
          {selectedEquip && (
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-bold mb-4">Dependencies ({currentDeps.length})</h2>
              {currentDeps.length === 0 ? (
                <div className="text-gray-500 text-sm">No dependencies yet</div>
              ) : (
                <div className="space-y-2">
                  {currentDeps.map(dep => (
                    <div key={dep.equipmentId} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{dep.name}</div>
                        {dep.reason && (
                          <div className="text-xs text-gray-600 mt-1">{dep.reason}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">Min qty: {dep.minQuantity}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveDependency(dep.equipmentId)}
                        disabled={saving}
                        className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Dependency Form */}
        {selectedEquip && (
          <div className="bg-white rounded-xl border shadow-sm p-6 mt-6">
            <h2 className="text-lg font-bold mb-4">Add Dependency</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment to Link</label>
                <select
                  value={selectedDepId}
                  onChange={(e) => setSelectedDepId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Choose equipment...</option>
                  {availableForDep.map(eq => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} ({eq.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Why? (optional)</label>
                <Input
                  type="text"
                  placeholder="e.g., Pads for this buffer"
                  value={depReason}
                  onChange={(e) => setDepReason(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={depMinQty}
                  onChange={(e) => setDepMinQty(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <Button
                onClick={handleAddDependency}
                disabled={saving || !selectedDepId}
                className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Adding...' : 'Add Dependency'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}