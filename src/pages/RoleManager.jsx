import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Loader2, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PERMISSIONS, BUILT_IN_ROLES } from '@/lib/permissions';

function RoleForm({ role, onSave, onCancel }) {
  const [form, setForm] = useState(role ? { ...role } : {
    name: '',
    description: '',
    level: 50,
    scope: 'branch',
    permissions: [],
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Role name required'); return; }
    setSaving(true);
    try {
      if (role) {
        await base44.entities.Role.update(role.id, form);
      } else {
        await base44.entities.Role.create(form);
      }
      onSave();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (perm) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  // Group permissions by category
  const permGroups = {
    Equipment: Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('EQUIPMENT')).map(([, v]) => v),
    Rentals: Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('RENTAL')).map(([, v]) => v),
    Customers: Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('CUSTOMER')).map(([, v]) => v),
    Financial: Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('DISCOUNT') || k.startsWith('PAYMENT')).map(([, v]) => v),
    Maintenance: Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('MAINTENANCE')).map(([, v]) => v),
    Reports: Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('REPORT')).map(([, v]) => v),
    Admin: Object.entries(PERMISSIONS).filter(([k]) => k.startsWith('USER') || k.startsWith('ROLE') || k.startsWith('SETTINGS') || k.startsWith('AUDIT')).map(([, v]) => v),
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
      <div className="font-semibold text-indigo-900">{role ? 'Edit Role' : 'New Role'}</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Role Name *</label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Event Planner" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Hierarchy Level (1-100)</label>
          <Input type="number" min="1" max="100" value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Scope</label>
          <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white">
            <option value="platform">Platform-wide</option>
            <option value="subscriber">Subscriber-scoped</option>
            <option value="branch">Branch-scoped</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
          <Input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Permissions</label>
        <div className="space-y-2 max-h-64 overflow-y-auto bg-white border rounded-lg p-3">
          {Object.entries(permGroups).map(([category, perms]) => (
            <div key={category}>
              <div className="text-xs font-semibold text-gray-700 mb-1.5 pt-2 first:pt-0">{category}</div>
              <div className="space-y-1 ml-2 border-l border-gray-200 pl-2">
                {perms.map(perm => (
                  <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1.5 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="w-3 h-3"
                    />
                    <span className="text-xs text-gray-600">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Save
        </Button>
      </div>
    </div>
  );
}

function RoleCard({ role, onEdit, onDelete }) {
  const levelLabel = role.level >= 80 ? 'Admin' : role.level >= 60 ? 'Manager' : role.level >= 40 ? 'Staff' : 'Limited';
  const scopeColors = {
    platform: 'bg-red-100 text-red-800',
    subscriber: 'bg-blue-100 text-blue-800',
    branch: 'bg-green-100 text-green-800',
  };

  return (
    <div className="border rounded-lg bg-white p-4 hover:border-indigo-300 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <div className="font-semibold text-gray-900">{role.name}</div>
            {role.isBuiltIn && <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">Built-in</span>}
          </div>
          {role.description && <div className="text-xs text-gray-500 mt-1">{role.description}</div>}
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded ${scopeColors[role.scope]}`}>{role.scope}</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">Level {role.level}</span>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{role.permissions?.length || 0} permissions</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {!role.isBuiltIn && (
            <>
              <button onClick={() => onEdit(role)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-gray-50">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(role.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-gray-50">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RoleManager() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.Role.list('-created_date', 100)
      .then(setRoles)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this role?')) return;
    await base44.entities.Role.delete(id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/lupine')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Role Manager</div>
            <div className="text-indigo-300 text-xs">{roles.length} roles defined</div>
          </div>
          <Button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="gap-2 bg-white text-indigo-900 hover:bg-indigo-50"
          >
            <Plus className="w-4 h-4" /> New Role
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Form */}
        {showForm && (
          <RoleForm
            role={editing}
            onSave={() => { setShowForm(false); setEditing(null); load(); }}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : roles.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm bg-white rounded-lg border">
            No roles defined. Built-in roles will appear after first load.
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map(role => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={(r) => { setEditing(r); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}