import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSpecsTemplate } from '@/lib/equipmentSpecs';
import MaintenanceLogPanel from '@/components/maintenance/MaintenanceLogPanel';
import TentSpecsPanel from '@/components/tent/TentSpecsPanel';

const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair', 'Retired'];

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eq, setEq] = useState(null);
  const [specs, setSpecs] = useState({});
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.Equipment.list().then(all => {
      const found = all.find(e => e.id === id);
      if (found) {
        setEq(found);
        setSpecs(found.specs || {});
        setForm({
          condition: found.condition || 'Good',
          assetNumber: found.assetNumber || '',
          serialNumber: found.serialNumber || '',
          modelNumber: found.modelNumber || '',
          purchaseDate: found.purchaseDate || '',
          purchaseCost: found.purchaseCost || '',
          location: found.location || '',
          notes: found.notes || '',
        });
      }
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Equipment.update(id, { ...form, specs, purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : undefined });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!eq) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const specTemplate = getSpecsTemplate(eq.category);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate">{eq.name}</div>
            <div className="text-indigo-300 text-xs">{eq.category}</div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-white text-indigo-900 hover:bg-indigo-50 gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Basic Info */}
        <section className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Unit Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Asset Number">
              <Input value={form.assetNumber} onChange={e => setForm(f => ({ ...f, assetNumber: e.target.value }))} placeholder="e.g. AST-2024-001" />
            </Field>
            <Field label="Serial Number">
              <Input value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} placeholder="e.g. SN-2043881" />
            </Field>
            <Field label="Model Number">
              <Input value={form.modelNumber} onChange={e => setForm(f => ({ ...f, modelNumber: e.target.value }))} placeholder="e.g. XP12000EH" />
            </Field>
            <Field label="Condition">
              <select
                value={form.condition}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                className="w-full h-9 border border-input rounded-md px-3 text-sm bg-transparent shadow-sm"
              >
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Location / Branch">
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. 01 McAllen" />
            </Field>
            <Field label="Purchase Date">
              <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
            </Field>
            <Field label="Purchase Cost ($)">
              <Input type="number" value={form.purchaseCost} onChange={e => setForm(f => ({ ...f, purchaseCost: e.target.value }))} placeholder="e.g. 4500" />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Condition notes, restrictions, special handling..." />
            </Field>
          </div>
        </section>

        {/* Specs */}
        <section className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1">Technical Specifications</h2>
          <p className="text-xs text-gray-400 mb-4">These print on rental invoices — customer acknowledges specs at time of rental.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {specTemplate.map(field => (
              <Field key={field.key} label={field.label}>
                <Input
                  value={specs[field.key] || ''}
                  onChange={e => setSpecs(s => ({ ...s, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              </Field>
            ))}
          </div>

          {/* Custom additional specs */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-400 mb-3">Additional custom specs</p>
            {Object.entries(specs)
              .filter(([k]) => !specTemplate.find(t => t.key === k))
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 mb-2">
                  <Input
                    value={k}
                    readOnly
                    className="w-40 bg-gray-50 text-xs"
                  />
                  <Input
                    value={v}
                    onChange={e => setSpecs(s => ({ ...s, [k]: e.target.value }))}
                    className="flex-1 text-xs"
                  />
                  <button
                    onClick={() => setSpecs(s => { const n = { ...s }; delete n[k]; return n; })}
                    className="text-red-400 hover:text-red-600 text-xs px-2"
                  >✕</button>
                </div>
              ))
            }
            <AddCustomSpec onAdd={(k, v) => setSpecs(s => ({ ...s, [k]: v }))} />
          </div>
        </section>

        {/* Tent Specs */}
        {eq.category === 'Tent' && (
          <section className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-semibold text-gray-800 mb-1">🏕 Tent Specifications</h2>
            <p className="text-xs text-gray-400 mb-4">Physical dimensions, anchoring, and ground requirements for sandbox designer.</p>
            <TentSpecsPanel
              equipmentId={id}
              equipmentName={eq.name}
              category={eq.category}
              tentSpecsId={eq.tentSpecsId}
            />
          </section>
        )}

        {/* Maintenance Log */}
        <section className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
            🔧 Maintenance Log
          </h2>
          <p className="text-xs text-gray-400 mb-4">Service history, repairs, and scheduled maintenance for this unit.</p>
          <MaintenanceLogPanel equipmentId={id} equipmentName={eq.name} />
        </section>

        <div className="flex justify-end pb-8">
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function AddCustomSpec({ onAdd }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const handleAdd = () => {
    if (!key.trim()) return;
    onAdd(key.trim().toLowerCase().replace(/\s+/g, '_'), value);
    setKey('');
    setValue('');
  };
  return (
    <div className="flex items-center gap-2 mt-2">
      <Input value={key} onChange={e => setKey(e.target.value)} placeholder="Field name" className="w-40 text-xs" />
      <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Value" className="flex-1 text-xs" onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <button onClick={handleAdd} className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold px-2 border border-indigo-200 rounded py-1">+ Add</button>
    </div>
  );
}