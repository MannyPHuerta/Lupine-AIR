import { useState, useEffect, useMemo } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, Search, CheckCircle, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSpecsTemplate } from '@/lib/equipmentSpecs';

const CATEGORIES_WITH_SPECS = [
  'Generator', 'Air Compressor', 'Scissor Lift', 'Boom Lift', 'Forklift',
  'Telehandler', 'Pressure Washer', 'Tent', 'Trailer', 'Welder', 'Pallet Jack',
  'Excavator', 'Skid Steer', 'Backhoe', 'Bulldozer', 'Compactor', 'Plate Compactor',
  'Light Tower', 'Trencher', 'Water Pump', 'Sandblaster', 'Floor Sander', 'Tile Stripper',
  'Stump Grinder', 'Chipper/Shredder', 'Zero Turn Mower', 'Concrete Equipment',
  'Paving Equipment', 'Dump Truck', 'Grader', 'Loader', 'Inflatable', 'Dance Floor',
  'Staging', 'Table', 'Chair', 'Fleet Vehicle', 'Tool',
];

function EnrichButton({ equipmentId, onEnriched }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleEnrich = async (e) => {
    e.stopPropagation();
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/functions/enrichFromManufacturer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipmentId }),
      });
      const data = await res.json();
      const item = data?.results?.[0];
      if (item?.specs || item?.imageUrl) onEnriched(item.specs || {}, item.imageUrl || null);
      setStatus(item?.enriched?.length > 0 ? `✓ Filled: ${item.enriched.join(', ')}` : 'No new data found');
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleEnrich}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-100 hover:bg-violet-200 text-violet-800 rounded-lg transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        {loading ? 'Searching…' : 'Enrich from Web'}
      </button>
      {status && <span className="text-xs text-gray-500">{status}</span>}
    </div>
  );
}

function SpecRow({ eq, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [specs, setSpecs] = useState(eq.specs || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageUrl, setImageUrl] = useState(eq.imageUrl || null);

  const template = getSpecsTemplate(eq.category);
  const filledCount = template.filter(t => specs[t.key] && String(specs[t.key]).trim()).length;
  const hasAny = filledCount > 0;

  const handleSave = async () => {
    setSaving(true);
    await supabaseData.Equipment.update(eq.id, { specs });
    setSaving(false);
    setSaved(true);
    onSave({ ...eq, specs });
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`border rounded-lg bg-white transition ${expanded ? 'border-indigo-300 shadow-md' : 'hover:border-gray-300'}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm truncate">{eq.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">{eq.category}{eq.location ? ` · ${eq.location}` : ''}{eq.assetNumber ? ` · #${eq.assetNumber}` : ''}</div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {saved && <CheckCircle className="w-4 h-4 text-green-500" />}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            filledCount === template.length ? 'bg-green-100 text-green-700' :
            hasAny ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {filledCount}/{template.length} specs
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {imageUrl && (
            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border">
              <img src={imageUrl} alt={eq.name} className="w-20 h-14 object-contain rounded bg-white border" onError={() => setImageUrl(null)} />
              <div className="text-xs text-gray-500">Image found — saved to equipment record &amp; used in the online store.</div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {template.map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{field.label}</label>
                <Input
                  value={specs[field.key] || ''}
                  onChange={e => setSpecs(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-1">
            <EnrichButton equipmentId={eq.id} onEnriched={(enrichedSpecs, foundImageUrl) => {
              setSpecs(prev => ({ ...prev, ...enrichedSpecs }));
              if (foundImageUrl) setImageUrl(foundImageUrl);
            }} />
            <Button
              onClick={handleSave}
              disabled={saving}
              size="sm"
              className="gap-1.5 text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Saving…' : 'Save Specs'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EquipmentSpecsEditor() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filterMissing, setFilterMissing] = useState(false);

  useEffect(() => {
    supabaseData.Equipment.list('name', 2000).then(eq => {
      setEquipment(eq.filter(e => CATEGORIES_WITH_SPECS.includes(e.category)));
      setLoading(false);
    });
  }, []);

  const handleSave = (updated) => {
    setEquipment(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const categories = useMemo(() => {
    const cats = [...new Set(equipment.map(e => e.category).filter(Boolean))].sort();
    return ['All', ...cats];
  }, [equipment]);

  const filtered = useMemo(() => equipment.filter(eq => {
    const matchCat = category === 'All' || eq.category === category;
    const matchSearch = !search ||
      eq.name?.toLowerCase().includes(search.toLowerCase()) ||
      eq.assetNumber?.toLowerCase().includes(search.toLowerCase());
    const template = getSpecsTemplate(eq.category);
    const filledCount = template.filter(t => eq.specs?.[t.key] && String(eq.specs[t.key]).trim()).length;
    const matchMissing = !filterMissing || filledCount < template.length;
    return matchCat && matchSearch && matchMissing;
  }), [equipment, category, search, filterMissing]);

  // Summary stats
  const stats = useMemo(() => {
    let complete = 0, partial = 0, empty = 0;
    equipment.forEach(eq => {
      const template = getSpecsTemplate(eq.category);
      const filled = template.filter(t => eq.specs?.[t.key] && String(eq.specs[t.key]).trim()).length;
      if (filled === template.length) complete++;
      else if (filled > 0) partial++;
      else empty++;
    });
    return { complete, partial, empty };
  }, [equipment]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader title="Equipment Specs" subtitle={`${filtered.length} of ${equipment.length} items shown`} backTo="/equipment-status" />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-green-700">{stats.complete}</div>
            <div className="text-xs text-green-600 mt-0.5">Complete</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-yellow-700">{stats.partial}</div>
            <div className="text-xs text-yellow-600 mt-0.5">Partial</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-gray-600">{stats.empty}</div>
            <div className="text-xs text-gray-500 mt-0.5">No Specs</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name or asset number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-9 border border-input rounded-md px-3 text-sm bg-white"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setFilterMissing(f => !f)}
            className={`h-9 px-3 rounded-md text-sm border font-medium transition ${
              filterMissing ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-input hover:bg-gray-50'
            }`}
          >
            {filterMissing ? '⚠ Incomplete only' : 'Show all'}
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">No equipment matches your filters</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(eq => (
              <SpecRow key={eq.id} eq={eq} onSave={handleSave} />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-8">
          Specs appear on invoices, help counter staff answer questions, and power the AIRoads load planner.
        </p>
      </div>
    </div>
  );
}