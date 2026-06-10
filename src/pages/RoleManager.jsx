import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Loader2, Shield, Users, Mail, UserPlus, RefreshCw } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
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
        await supabaseData.Role.update(role.id, form);
      } else {
        await supabaseData.Role.create(form);
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

  const allPerms = Object.values(PERMISSIONS);
  const allSelected = allPerms.every(p => form.permissions.includes(p));
  const toggleAll = () => setForm(f => ({ ...f, permissions: allSelected ? [] : allPerms }));

  const toggleCategory = (perms) => {
    const allCatSelected = perms.every(p => form.permissions.includes(p));
    setForm(f => ({
      ...f,
      permissions: allCatSelected
        ? f.permissions.filter(p => !perms.includes(p))
        : [...new Set([...f.permissions, ...perms])],
    }));
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
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600">Permissions</label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-indigo-700 hover:text-indigo-900">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-3.5 h-3.5 accent-indigo-600"
            />
            Select All
          </label>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto bg-white border rounded-lg p-3">
          {Object.entries(permGroups).map(([category, perms]) => {
            const allCatSelected = perms.every(p => form.permissions.includes(p));
            const someCatSelected = perms.some(p => form.permissions.includes(p));
            return (
              <div key={category}>
                <div className="flex items-center gap-2 pt-2 first:pt-0 mb-1.5">
                  <input
                    type="checkbox"
                    checked={allCatSelected}
                    ref={el => { if (el) el.indeterminate = someCatSelected && !allCatSelected; }}
                    onChange={() => toggleCategory(perms)}
                    className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-700 cursor-pointer" onClick={() => toggleCategory(perms)}>{category}</span>
                </div>
                <div className="space-y-1 ml-5 border-l border-gray-200 pl-2">
                  {perms.map(perm => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1.5 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="w-3 h-3 accent-indigo-600"
                      />
                      <span className="text-xs text-gray-600">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
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

const USER_ROLES = ['admin', 'user', 'manager', 'accountant', 'counter', 'driver'];

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

function EmployeeSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('counter');
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    const u = await supabaseData.User.list('full_name', 200);
    setUsers(u);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { alert('Enter an email address'); return; }
    setInviting(true);
    try {
      await supabaseData.User.invite(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      alert(`Invitation sent to ${inviteEmail.trim()}`);
      loadUsers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    await supabaseData.User.update(userId, { role: newRole });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Invite new employee */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Invite Employee</h3>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Input
            className="flex-1 min-w-48"
            placeholder="employee@example.com"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="h-9 border border-input rounded-md px-3 text-sm bg-white"
          >
            {USER_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
          <Button onClick={handleInvite} disabled={inviting} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Invite
          </Button>
        </div>
      </div>

      {/* Employee list */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Employees ({users.length})</h3>
          </div>
          <button onClick={loadUsers} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">No employees yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{u.full_name || '—'}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {updatingId === u.id && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                  <select
                    value={u.role || 'user'}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    disabled={updatingId === u.id}
                    className="h-8 border border-input rounded-md px-2 text-xs bg-white"
                  >
                    {USER_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [tab, setTab] = useState('roles'); // 'roles' | 'employees'

  const load = () => {
    setLoading(true);
    supabaseData.Role.list('-created_at', 100)
      .then(setRoles)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this role?')) return;
    await supabaseData.Role.delete(id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Role & Employee Manager"
        subtitle={`${roles.length} roles defined`}
        icon={Shield}
        action={
          <div className="flex items-center gap-2">
            {tab === 'roles' && (
              <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
                <Plus className="w-4 h-4" /> New Role
              </Button>
            )}
          </div>
        }
      >
        <div className="flex gap-1">
          {[{ key: 'roles', label: 'Roles' }, { key: 'employees', label: 'Employees' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${tab === t.key ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </AppPageHeader>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {tab === 'roles' ? (
          <>
            {showForm && (
              <RoleForm
                role={editing}
                onSave={() => { setShowForm(false); setEditing(null); load(); }}
                onCancel={() => { setShowForm(false); setEditing(null); }}
              />
            )}
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
          </>
        ) : (
          <EmployeeSection />
        )}
      </div>
    </div>
  );
}