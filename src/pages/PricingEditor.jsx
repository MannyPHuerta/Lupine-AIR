import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, ExternalLink, Sparkles, CheckCircle2, ShoppingBag } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PricingEditor() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [edited, setEdited] = useState({});
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');

  useEffect(() => {
    supabaseData.CompanySettings.list().then(rows => {
      if (rows[0]?.websiteUrl) setWebsiteUrl(rows[0].websiteUrl);
    });
  }, []);

  const handleEnrichImages = async () => {
    if (!websiteUrl) return alert('Please enter the subscriber website URL first.');
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/functions/enrichEquipmentImages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl }),
      });
      const data = await res.json();
      setEnrichResult(data);
    } catch (err) {
      alert(`Enrichment failed: ${err.message}`);
    } finally {
      setEnriching(false);
    }
  };

  useEffect(() => {
    supabaseData.Equipment.list('created_at', 1000).then(eq => {
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

  const handleIntChange = (id, field, value) => {
    setEdited(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseInt(value) || 0 }
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
      const updates = {
        ...edited[id],
        price_changed_at: new Date().toISOString(),
        price_changed_by: 'manager',
      };
      await supabaseData.Equipment.update(id, updates);
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
      <AppPageHeader title="Pricing Editor" subtitle={`${equipment.length} items`} backTo="/availability" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* AI Image Enrichment Panel */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Sparkles className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <div className="font-semibold text-gray-800 text-sm">AI Store Image Enrichment</div>
            <div className="text-xs text-gray-500 mt-0.5">Enter the subscriber's website URL and click Enrich — the AI will find equipment images from that site and save them to the catalog for the online store.</div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="https://rentalworld.com"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              className="text-sm w-full sm:w-56"
            />
            <Button
              onClick={handleEnrichImages}
              disabled={enriching || !websiteUrl}
              className="bg-indigo-600 hover:bg-indigo-700 gap-1.5 flex-shrink-0"
              size="sm"
            >
              {enriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {enriching ? 'Enriching…' : 'Enrich Images'}
            </Button>
          </div>
          {enrichResult && (
            <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {enrichResult.imagesFound} of {enrichResult.uniqueNames} items matched
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-xs">Equipment</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700 text-xs">Category</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 text-xs">Daily</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 text-xs">Weekly</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 text-xs">Monthly</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 text-xs">Hourly</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700 text-xs">Deposit</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 text-xs">Hr<br/>Meter</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 text-xs">Con-<br/>sumable</th>
                  <th className="px-3 py-2 text-center font-semibold text-purple-700 text-xs">RTO Settings</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 text-xs">Specs</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700 text-xs">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.map(eq => {
                  const isConsumable = edited[eq.id]?.consumable ?? eq.consumable;
                  const isRto = edited[eq.id]?.rentToOwnEligible ?? eq.rentToOwnEligible;
                  return (
                  <tr key={eq.id} className={hasChanges(eq.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 text-sm">{eq.name}</div>
                      <div className="text-xs text-gray-400">{eq.location}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{eq.category}</td>
                    <td className="px-3 py-2">
                      {!isConsumable ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'dailyRate')} onChange={(e) => handleFieldChange(eq.id, 'dailyRate', e.target.value)} className="w-20 text-right h-8 text-sm" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {!isConsumable ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'weeklyRate')} onChange={(e) => handleFieldChange(eq.id, 'weeklyRate', e.target.value)} className="w-20 text-right h-8 text-sm" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {!isConsumable ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'monthlyRate')} onChange={(e) => handleFieldChange(eq.id, 'monthlyRate', e.target.value)} className="w-20 text-right h-8 text-sm" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'hourlyRate') ?? ''} onChange={(e) => handleFieldChange(eq.id, 'hourlyRate', e.target.value)} className="w-20 text-right h-8 text-sm" placeholder="—" />
                    </td>
                    <td className="px-3 py-2">
                      {!isConsumable ? (
                        <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'depositRequired')} onChange={(e) => handleFieldChange(eq.id, 'depositRequired', e.target.value)} className="w-20 text-right h-8 text-sm" />
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={edited[eq.id]?.hasHourMeter ?? eq.hasHourMeter ?? false} onChange={e => handleBoolChange(eq.id, 'hasHourMeter', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" title="Enable hour meter tracking" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={isConsumable ?? false} onChange={e => handleBoolChange(eq.id, 'consumable', e.target.checked)} className="w-4 h-4 accent-indigo-600 cursor-pointer" title="Counter sale — no contract required" />
                    </td>
                    {/* RTO — all 4 fields in one compact cell */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <label className="flex items-center gap-1 text-xs text-purple-700 font-medium cursor-pointer whitespace-nowrap">
                          <input type="checkbox" checked={isRto ?? false} onChange={e => handleBoolChange(eq.id, 'rentToOwnEligible', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 cursor-pointer" />
                          RTO
                        </label>
                        {isRto && (
                          <div className="flex items-center gap-1">
                            <Input type="number" step="0.01" min="0" value={getDisplayValue(eq, 'rentToOwnPrice') ?? ''} onChange={(e) => handleFieldChange(eq.id, 'rentToOwnPrice', e.target.value)} className="w-20 text-right h-7 text-xs" placeholder="Price $" title="RTO purchase price" />
                            <Input type="number" step="1" min="1" value={getDisplayValue(eq, 'rentToOwnTermMonths') ?? ''} onChange={(e) => handleIntChange(eq.id, 'rentToOwnTermMonths', e.target.value)} className="w-14 text-right h-7 text-xs" placeholder="mo" title="Max term months" />
                            <Input type="number" step="1" min="0" max="100" value={getDisplayValue(eq, 'rentToOwnCreditPercent') ?? 50} onChange={(e) => handleFieldChange(eq.id, 'rentToOwnCreditPercent', e.target.value)} className="w-14 text-right h-7 text-xs" placeholder="%" title="Credit %" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => navigate(`/equipment-specs?id=${eq.id}`)} className="text-indigo-500 hover:text-indigo-700 p-1" title="Edit specs">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {hasChanges(eq.id) ? (
                        <Button size="sm" onClick={() => saveEquipment(eq.id)} disabled={saving[eq.id]} className="bg-green-600 hover:bg-green-700 h-7 px-2">
                          {saving[eq.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        </Button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}