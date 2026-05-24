import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PricingEditor() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [edited, setEdited] = useState({});

  useEffect(() => {
    base44.entities.Equipment.list('-created_date', 1000).then(eq => {
      setEquipment(eq);
      setLoading(false);
    });
  }, []);

  const handleFieldChange = (id, field, value) => {
    setEdited(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseFloat(value) || 0 }
    }));
  };

  const handleBoolChange = (id, field, value) => {
    setEdited(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const saveEquipment = async (id) => {
    setSaving(prev => ({ ...prev, [id]: true }));
    try {
      const me = await base44.auth.me();
      const updates = {
        ...edited[id],
        priceChangedAt: new Date().toISOString(),
        priceChangedBy: me?.email || 'manager',
      };
      await base44.entities.Equipment.update(id, updates);
      setEdited(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      // Update local state
      setEquipment(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const getDisplayValue = (equipment, field) => {
    return edited[equipment.id]?.[field] ?? equipment[field];
  };

  const hasChanges = (id) => !!edited[id];

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
      <div className="text-white sticky top-0 z-10 shadow-lg" style={{ backgroundColor: '#0d1b3e' }}>
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/availability')}
            className="text-white p-2 rounded-lg hover:opacity-80" style={{ backgroundColor: 'rgba(245, 166, 35, 0.1)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Pricing Editor</div>
            <div className="text-xs" style={{ color: '#F5A623' }}>{equipment.length} items</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Equipment</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Daily</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Weekly</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Monthly</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Deposit</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Consumable</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Specs</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.map(eq => (
                  <tr key={eq.id} className={hasChanges(eq.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{eq.name}</div>
                      <div className="text-xs text-gray-500">{eq.location}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{eq.category}</td>
                    <td className="px-4 py-3">
                      {!(edited[eq.id]?.consumable ?? eq.consumable) ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'dailyRate')} onChange={(e) => handleFieldChange(eq.id, 'dailyRate', e.target.value)} className="w-24 text-right" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!(edited[eq.id]?.consumable ?? eq.consumable) ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'weeklyRate')} onChange={(e) => handleFieldChange(eq.id, 'weeklyRate', e.target.value)} className="w-24 text-right" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!(edited[eq.id]?.consumable ?? eq.consumable) ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'monthlyRate')} onChange={(e) => handleFieldChange(eq.id, 'monthlyRate', e.target.value)} className="w-24 text-right" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!(edited[eq.id]?.consumable ?? eq.consumable) ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'depositRequired')} onChange={(e) => handleFieldChange(eq.id, 'depositRequired', e.target.value)} className="w-24 text-right" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={edited[eq.id]?.consumable ?? eq.consumable ?? false}
                        onChange={e => handleBoolChange(eq.id, 'consumable', e.target.checked)}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer"
                        title="Counter sale — no contract required"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => navigate(`/equipment-specs?id=${eq.id}`)}
                        className="text-indigo-500 hover:text-indigo-700 p-1"
                        title="Edit specs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasChanges(eq.id) ? (
                        <Button
                          size="sm"
                          onClick={() => saveEquipment(eq.id)}
                          disabled={saving[eq.id]}
                          className="bg-green-600 hover:bg-green-700 gap-1"
                        >
                          {saving[eq.id] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}