import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, RefreshCw, ExternalLink, Download, Copy, X, Loader2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Input } from '@/components/ui/input';
import UnitStatusBadge, { STATUS_CONFIG } from '@/components/equipment/UnitStatusBadge';

const STATUSES = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, ...cfg }));

function StatusPicker({ current, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUSES.map(s => (
        <button
          key={s.value}
          onClick={() => onSelect(s.value)}
          className={`flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium transition
            ${current === s.value ? s.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </button>
      ))}
    </div>
  );
}

function EquipmentRow({ eq, onSave, onDetail }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(eq.unitStatus || 'available');
  const [note, setNote] = useState(eq.statusNote || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isDirty = status !== (eq.unitStatus || 'available') || note !== (eq.statusNote || '');

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Equipment.update(eq.id, {
      unitStatus: status,
      statusNote: note,
      statusUpdatedAt: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setEditing(false);
    onSave({ ...eq, unitStatus: status, statusNote: note });
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCancel = () => {
    setStatus(eq.unitStatus || 'available');
    setNote(eq.statusNote || '');
    setEditing(false);
  };

  return (
    <div className={`border rounded-lg bg-white p-4 transition ${editing ? 'border-indigo-300 shadow-md' : 'hover:border-gray-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 text-sm truncate">{eq.name}</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {eq.category}{eq.location ? ` · ${eq.location}` : ''}{eq.assetNumber ? ` · #${eq.assetNumber}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <CheckCircle className="w-4 h-4 text-green-500" />}
          <UnitStatusBadge status={status} note={!editing ? note : undefined} />
          {!editing && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded px-2 py-0.5 hover:bg-indigo-50 transition"
              >
                Edit
              </button>
              <button
                onClick={() => onDetail(eq.id)}
                className="text-gray-400 hover:text-indigo-600 transition"
                title="View specs & details"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-4 space-y-3 border-t pt-3">
          <StatusPicker current={status} onSelect={setStatus} />
          <Input
            placeholder="ETA or reason (e.g. 'Belt ordered, ETA Thursday')"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition hover:opacity-90" style={{ backgroundColor: '#F5A623' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BulkAddModal({ equipment, onClose, onDone }) {
  const [sourceId, setSourceId] = useState('');
  const [quantity, setQuantity] = useState(2);
  const [creating, setCreating] = useState(false);

  const sourceEq = equipment.find(e => e.id === sourceId);
  const sorted = [...equipment].sort((a, b) => a.name.localeCompare(b.name));

  const handleCreate = async () => {
    if (!sourceEq || quantity < 1) return;
    setCreating(true);
    const { id, created_date, updated_date, created_by, ...template } = sourceEq;
    const copies = Array.from({ length: quantity }, () => ({
      ...template,
      unitStatus: 'available',
      statusNote: '',
      statusUpdatedAt: new Date().toISOString(),
    }));
    await base44.entities.Equipment.bulkCreate(copies);
    setCreating(false);
    onDone(quantity);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Bulk Add Units</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Pick an existing equipment item and how many additional copies to create. All copies will inherit the same specs and be set to <strong>Available</strong>.</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Source Equipment</label>
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">— Select equipment —</option>
              {sorted.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}{eq.category ? ` (${eq.category})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Number of copies to create</label>
            <input
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {sourceEq && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700">
              Will create <strong>{quantity}</strong> copies of <strong>{sourceEq.name}</strong>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!sourceEq || creating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition"
            style={{ backgroundColor: '#F5A623' }}
          >
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Copy className="w-4 h-4" /> Create {quantity} Units</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EquipmentStatusManager() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const load = () => {
    setLoading(true);
    base44.entities.Equipment.list('-updated_date', 500)
      .then(eq => setEquipment(eq.sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = (updated) => {
    setEquipment(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const filtered = useMemo(() => equipment.filter(eq => {
    const matchSearch = !search || 
      eq.name.toLowerCase().includes(search.toLowerCase()) || 
      eq.category?.toLowerCase().includes(search.toLowerCase()) ||
      eq.assetNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || (eq.unitStatus || 'available') === filterStatus;
    return matchSearch && matchStatus;
  }), [equipment, search, filterStatus]);

  // Status counts for filter bar
  const counts = useMemo(() => {
    const c = { all: equipment.length };
    equipment.forEach(eq => {
      const s = eq.unitStatus || 'available';
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [equipment]);

  return (
    <div className="min-h-screen bg-gray-50">
      {showBulkAdd && (
        <BulkAddModal
          equipment={equipment}
          onClose={() => setShowBulkAdd(false)}
          onDone={(qty) => { setShowBulkAdd(false); load(); alert(`✅ Created ${qty} new units successfully!`); }}
        />
      )}
      <AppPageHeader
        title="Equipment Status"
        subtitle={`${equipment.length} units in catalog`}
        backTo="/lupine"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowBulkAdd(true)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition text-white hover:opacity-90 bg-green-600 hover:bg-green-700">
              <Copy className="w-3.5 h-3.5" /> Bulk Add Units
            </button>
            <button onClick={() => navigate('/inventory-export')} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:opacity-80 text-white transition" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, category, or asset number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterStatus('all')}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition
              ${filterStatus === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            All ({counts.all || 0})
          </button>
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium transition
                ${filterStatus === s.value ? s.color + ' ring-2 ring-offset-1 ring-current' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label} {counts[s.value] ? `(${counts[s.value]})` : ''}
            </button>
          ))}
        </div>

        {/* Equipment list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">No equipment found</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(eq => (
              <EquipmentRow key={eq.id} eq={eq} onSave={handleSave} onDetail={(id) => navigate(`/equipment/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}