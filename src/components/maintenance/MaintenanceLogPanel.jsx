import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Wrench, CheckCircle2, Clock, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';

const TYPE_LABELS = {
  preventive: { label: 'Preventive', color: 'bg-blue-100 text-blue-800' },
  repair: { label: 'Repair', color: 'bg-red-100 text-red-800' },
  inspection: { label: 'Inspection', color: 'bg-purple-100 text-purple-800' },
  cleaning: { label: 'Cleaning', color: 'bg-green-100 text-green-800' },
  parts_replacement: { label: 'Parts Replacement', color: 'bg-orange-100 text-orange-800' },
  other: { label: 'Other', color: 'bg-gray-100 text-gray-800' },
};

const STATUS_ICONS = {
  completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-500" />,
  scheduled: <Clock className="w-4 h-4 text-blue-500" />,
  cancelled: <X className="w-4 h-4 text-gray-400" />,
};

const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair', 'Retired'];

const EMPTY_FORM = {
  type: 'preventive',
  status: 'completed',
  description: '',
  performedBy: '',
  cost: '',
  scheduledDate: new Date().toISOString().slice(0, 10),
  completedDate: new Date().toISOString().slice(0, 10),
  nextServiceDate: '',
  conditionBefore: '',
  conditionAfter: '',
  partsUsed: '',
  notes: '',
};

function LogEntryForm({ equipmentId, equipmentName, onSave, onCancel, existing }) {
  const [form, setForm] = useState(existing ? { ...existing } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.description) { alert('Please enter a description.'); return; }
    setSaving(true);
    const payload = { ...form, equipmentId, equipmentName, cost: parseFloat(form.cost) || 0 };
    if (existing) {
      await base44.entities.MaintenanceLog.update(existing.id, payload);
    } else {
      await base44.entities.MaintenanceLog.create(payload);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4 space-y-3">
      <div className="font-semibold text-indigo-900 text-sm">{existing ? 'Edit Entry' : 'New Maintenance Entry'}</div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Description *</label>
        <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="What was done or needs to be done..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Scheduled Date</label>
          <Input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Completed Date</label>
          <Input type="date" value={form.completedDate} onChange={e => set('completedDate', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Performed By</label>
          <Input value={form.performedBy} onChange={e => set('performedBy', e.target.value)} placeholder="Tech name or vendor" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Cost ($)</label>
          <Input type="number" min="0" step="0.01" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="0.00" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Condition Before</label>
          <select value={form.conditionBefore} onChange={e => set('conditionBefore', e.target.value)}
            className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="">— select —</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Condition After</label>
          <select value={form.conditionAfter} onChange={e => set('conditionAfter', e.target.value)}
            className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="">— select —</option>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Parts Used</label>
        <Input value={form.partsUsed} onChange={e => set('partsUsed', e.target.value)} placeholder="e.g. Oil filter, spark plugs..." />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Next Service Date</label>
        <Input type="date" value={form.nextServiceDate} onChange={e => set('nextServiceDate', e.target.value)} />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
        <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional findings or notes..." />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving ? 'Saving…' : 'Save Entry'}
        </Button>
      </div>
    </div>
  );
}

function LogEntry({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const type = TYPE_LABELS[entry.type] || TYPE_LABELS.other;

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(e => !e)}>
        <div>{STATUS_ICONS[entry.status]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${type.color}`}>{type.label}</span>
            <span className="text-sm font-medium text-gray-900 truncate">{entry.description}</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex gap-3 flex-wrap">
            {entry.completedDate && <span>📅 {format(parseISO(entry.completedDate), 'MMM d, yyyy')}</span>}
            {entry.performedBy && <span>👤 {entry.performedBy}</span>}
            {entry.cost > 0 && <span>💲{entry.cost.toFixed(2)}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t bg-gray-50 space-y-2 text-sm text-gray-700">
          {entry.partsUsed && <div><span className="font-medium">Parts:</span> {entry.partsUsed}</div>}
          {(entry.conditionBefore || entry.conditionAfter) && (
            <div><span className="font-medium">Condition:</span> {entry.conditionBefore} → {entry.conditionAfter}</div>
          )}
          {entry.nextServiceDate && <div><span className="font-medium">Next Service:</span> {format(parseISO(entry.nextServiceDate), 'MMM d, yyyy')}</div>}
          {entry.notes && <div><span className="font-medium">Notes:</span> {entry.notes}</div>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onEdit(entry)} className="text-xs text-indigo-600 hover:underline">Edit</button>
            <button onClick={() => onDelete(entry)} className="text-xs text-red-500 hover:underline">Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MaintenanceLogPanel({ equipmentId, equipmentName }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    base44.entities.MaintenanceLog.filter({ equipmentId }, '-scheduledDate', 100).then(data => {
      setLogs(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [equipmentId]);

  const handleDelete = async (entry) => {
    if (!confirm('Delete this maintenance entry?')) return;
    await base44.entities.MaintenanceLog.delete(entry.id);
    load();
  };

  const totalCost = logs.filter(l => l.status === 'completed').reduce((s, l) => s + (l.cost || 0), 0);
  const upcoming = logs.find(l => l.status === 'scheduled');

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-4 text-sm text-gray-600">
          <span><strong>{logs.length}</strong> entries</span>
          <span>Total cost: <strong>${totalCost.toFixed(2)}</strong></span>
          {upcoming && (
            <span className="text-blue-700 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Next: {format(parseISO(upcoming.scheduledDate), 'MMM d, yyyy')}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }} className="gap-1 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-3.5 h-3.5" /> Add Entry
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <LogEntryForm
          equipmentId={equipmentId}
          equipmentName={equipmentName}
          existing={editing}
          onSave={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Log list */}
      {loading ? (
        <div className="text-sm text-gray-400 py-4 text-center">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center border-2 border-dashed rounded-xl">
          No maintenance records yet. Add the first entry above.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(entry => (
            <LogEntry
              key={entry.id}
              entry={entry}
              onEdit={(e) => { setEditing(e); setShowForm(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}