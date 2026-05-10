import { useState, useEffect } from 'react';
import { Wrench, ChevronDown, ChevronUp, Plus, Trash2, Check, X, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import MechanicRecommendation from '@/components/repair/MechanicRecommendation';
import PartsPredictor from '@/components/repair/PartsPredictor';

const STATUSES = ['scheduled', 'in_progress', 'awaiting_parts', 'completed', 'cancelled'];
const CONDITIONS = ['New', 'Good', 'Fair', 'Needs Repair', 'Retired'];

export default function WorkOrderCard({ workOrder: wo, statusMeta, isEditing, onEdit, onCancelEdit, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  useEffect(() => {
    if (wo.status !== 'in_progress' || !wo.startedAt) return;
    const timer = setInterval(() => {
      const ms = Date.now() - new Date(wo.startedAt).getTime();
      const secs = Math.floor(ms / 1000);
      const mins = Math.floor(secs / 60);
      const hrs = Math.floor(mins / 60);
      setElapsed(`${hrs}h ${mins % 60}m ${secs % 60}s`);
    }, 1000);
    return () => clearInterval(timer);
  }, [wo.status, wo.startedAt]);

  const startEdit = () => {
    setForm({
      status: wo.status,
      assignedTo: wo.assignedTo || '',
      description: wo.description || '',
      notes: wo.notes || '',
      laborCost: wo.laborCost || '',
      eta: wo.eta || '',
      conditionBefore: wo.conditionBefore || '',
      conditionAfter: wo.conditionAfter || '',
      partsRequired: wo.partsRequired ? JSON.parse(JSON.stringify(wo.partsRequired)) : [],
    });
    onEdit();
    setExpanded(true);
  };

  const cancelEdit = () => {
    setForm(null);
    onCancelEdit();
  };

  const save = () => {
    const partsCost = (form.partsRequired || []).reduce((s, p) => s + ((p.cost || 0) * (p.quantity || 1)), 0);
    const laborCost = parseFloat(form.laborCost) || 0;
    const updates = {
      ...form,
      laborCost,
      partsCost,
      cost: laborCost + partsCost,
    };
    if (form.status === 'completed' && !wo.completedDate) {
      updates.completedDate = new Date().toISOString().split('T')[0];
    }
    onUpdate(updates);
    setForm(null);
  };

  const addPart = () => {
    setForm(f => ({ ...f, partsRequired: [...(f.partsRequired || []), { partName: '', quantity: 1, cost: 0, vendor: '', eta: '', received: false }] }));
  };

  const handleAddPredictedParts = (partNames) => {
    setForm(f => ({
      ...f,
      partsRequired: [
        ...(f.partsRequired || []),
        ...partNames.map(name => ({ partName: name, quantity: 1, cost: 0, vendor: '', eta: '', received: false }))
      ]
    }));
  };

  const handleAutoAssignMechanic = async (email) => {
    setForm(f => ({ ...f, assignedTo: email }));
  };

  const updatePart = (idx, field, value) => {
    setForm(f => {
      const parts = [...f.partsRequired];
      parts[idx] = { ...parts[idx], [field]: value };
      return { ...f, partsRequired: parts };
    });
  };

  const removePart = (idx) => {
    setForm(f => ({ ...f, partsRequired: f.partsRequired.filter((_, i) => i !== idx) }));
  };

  const meta = statusMeta[wo.status] || statusMeta.scheduled;
  const Icon = meta.icon;
  const partsCost = (wo.partsRequired || []).reduce((s, p) => s + ((p.cost || 0) * (p.quantity || 1)), 0);
  const allPartsReceived = (wo.partsRequired || []).length > 0 && (wo.partsRequired || []).every(p => p.received);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${wo.status === 'awaiting_parts' ? 'border-amber-300' : wo.status === 'in_progress' ? 'border-blue-300' : ''}`}>
      {/* Header row */}
      <div
        className="px-5 py-4 flex items-start gap-4 cursor-pointer"
        onClick={() => !isEditing && setExpanded(v => !v)}
      >
        <div className={`p-2 rounded-lg ${meta.color} flex-shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{wo.equipmentName || 'Unknown Equipment'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
            <span className="text-xs text-gray-400 capitalize">{wo.type?.replace('_', ' ')}</span>
            {wo.status === 'awaiting_parts' && allPartsReceived && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">All parts in ✓</span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 flex gap-3 flex-wrap">
            {wo.branch && <span>📍 {wo.branch}</span>}
            {wo.assignedTo && <span>🔧 {wo.assignedTo}</span>}
            {wo.eta && <span>📅 ETA {wo.eta}</span>}
            {wo.scheduledDate && <span>Scheduled {wo.scheduledDate}</span>}
            {wo.status === 'in_progress' && elapsed && <span className="font-mono text-blue-700 font-semibold animate-pulse">⏱ {elapsed}</span>}
          </div>
          {wo.description && <div className="text-xs text-gray-600 mt-1 line-clamp-1">{wo.description}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {(wo.cost > 0) && (
            <span className="text-sm font-semibold text-gray-700">${(wo.cost || 0).toFixed(2)}</span>
          )}
          {!isEditing && wo.status === 'scheduled' && (
            <Button
              size="sm"
              onClick={e => { e.stopPropagation(); onUpdate({ status: 'in_progress', startedAt: new Date().toISOString() }); }}
              className="bg-blue-600 hover:bg-blue-700 gap-1"
            >
              <Play className="w-3 h-3" /> Start
            </Button>
          )}
          {!isEditing && wo.status === 'in_progress' && (
            <Button
              size="sm"
              onClick={e => { e.stopPropagation(); onUpdate({ status: 'completed', completedAt: new Date().toISOString() }); }}
              className="bg-green-600 hover:bg-green-700 gap-1"
            >
              <CheckCircle2 className="w-3 h-3" /> Done
            </Button>
          )}
          {!isEditing && (
            <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); startEdit(); }}>
              Edit
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail / edit form */}
      {(expanded || isEditing) && (
        <div className="border-t px-5 py-4 space-y-4 bg-gray-50">
          {isEditing && form ? (
            <>
              {/* Status */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Assigned To</label>
                  <Input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="Tech name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">ETA</label>
                  <Input type="date" value={form.eta} onChange={e => setForm(f => ({ ...f, eta: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Condition Before</label>
                  <select value={form.conditionBefore} onChange={e => setForm(f => ({ ...f, conditionBefore: e.target.value }))}
                    className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white">
                    <option value="">—</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Condition After</label>
                  <select value={form.conditionAfter} onChange={e => setForm(f => ({ ...f, conditionAfter: e.target.value }))}
                    className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white">
                    <option value="">—</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Work Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white resize-none"
                  placeholder="What needs to be done..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Findings / Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white resize-none"
                  placeholder="Tech findings, observations..."
                />
              </div>

              {/* AI Mechanic Recommendation */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <MechanicRecommendation
                  workOrderId={wo.id}
                  onAssign={handleAutoAssignMechanic}
                  disabled={!isEditing}
                />
              </div>

              {/* Parts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Parts Required</label>
                  <div className="flex gap-2">
                    <PartsPredictor
                      workOrderId={wo.id}
                      equipmentId={wo.equipmentId}
                      onCreatePartRequirements={handleAddPredictedParts}
                    />
                    <button onClick={addPart} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add Part
                    </button>
                  </div>
                </div>
                {(form.partsRequired || []).length === 0 && (
                  <div className="text-xs text-gray-400 italic">No parts listed</div>
                )}
                {(form.partsRequired || []).map((part, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2 mb-2 items-center">
                    <Input className="col-span-2" placeholder="Part name" value={part.partName} onChange={e => updatePart(idx, 'partName', e.target.value)} />
                    <Input type="number" placeholder="Qty" min={1} value={part.quantity} onChange={e => updatePart(idx, 'quantity', parseInt(e.target.value) || 1)} />
                    <Input type="number" placeholder="Unit $" step="0.01" value={part.cost} onChange={e => updatePart(idx, 'cost', parseFloat(e.target.value) || 0)} />
                    <div className="flex items-center gap-1">
                      <input type="checkbox" checked={!!part.received} onChange={e => updatePart(idx, 'received', e.target.checked)} className="w-4 h-4 rounded" />
                      <span className="text-xs text-gray-500">Rcvd</span>
                    </div>
                    <button onClick={() => removePart(idx)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Labor */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Labor Cost ($)</label>
                  <Input type="number" step="0.01" value={form.laborCost} onChange={e => setForm(f => ({ ...f, laborCost: e.target.value }))} className="w-32" />
                </div>
                <div className="text-sm text-gray-600 mt-4">
                  Parts: <strong>${(form.partsRequired || []).reduce((s, p) => s + ((p.cost || 0) * (p.quantity || 1)), 0).toFixed(2)}</strong>
                  &nbsp;· Total: <strong>${((parseFloat(form.laborCost) || 0) + (form.partsRequired || []).reduce((s, p) => s + ((p.cost || 0) * (p.quantity || 1)), 0)).toFixed(2)}</strong>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Cancel</Button>
                <Button size="sm" onClick={save} className="bg-orange-600 hover:bg-orange-700"><Check className="w-4 h-4 mr-1" />Save</Button>
              </div>
            </>
          ) : (
            /* Read-only detail view */
            <div className="space-y-3 text-sm">
              {wo.description && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</div>
                  <div className="text-gray-700">{wo.description}</div>
                </div>
              )}
              {wo.notes && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes / Findings</div>
                  <div className="text-gray-700">{wo.notes}</div>
                </div>
              )}
              {(wo.conditionBefore || wo.conditionAfter) && (
                <div className="flex gap-6">
                  {wo.conditionBefore && <div><span className="text-xs text-gray-500">Before: </span><span className="font-medium">{wo.conditionBefore}</span></div>}
                  {wo.conditionAfter && <div><span className="text-xs text-gray-500">After: </span><span className="font-medium text-green-700">{wo.conditionAfter}</span></div>}
                </div>
              )}
              {(wo.partsRequired || []).length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Parts</div>
                  <table className="w-full text-xs border rounded overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-1.5 text-left">Part</th>
                        <th className="px-3 py-1.5 text-right">Qty</th>
                        <th className="px-3 py-1.5 text-right">Unit $</th>
                        <th className="px-3 py-1.5 text-right">Total</th>
                        <th className="px-3 py-1.5 text-center">Rcvd</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {wo.partsRequired.map((p, i) => (
                        <tr key={i} className={p.received ? 'bg-green-50' : ''}>
                          <td className="px-3 py-1.5">{p.partName}</td>
                          <td className="px-3 py-1.5 text-right">{p.quantity}</td>
                          <td className="px-3 py-1.5 text-right">${(p.cost || 0).toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right">${((p.cost || 0) * (p.quantity || 1)).toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-center">{p.received ? '✓' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex gap-6 text-xs text-gray-600">
                {wo.laborCost > 0 && <span>Labor: <strong>${wo.laborCost.toFixed(2)}</strong></span>}
                {partsCost > 0 && <span>Parts: <strong>${partsCost.toFixed(2)}</strong></span>}
                {wo.cost > 0 && <span>Total: <strong className="text-gray-900">${wo.cost.toFixed(2)}</strong></span>}
              </div>
              {wo.completedDate && (
                <div className="text-xs text-green-700 font-medium">✅ Completed {wo.completedDate}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}