import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Loader2, Shield, Users, Mail, UserPlus, RefreshCw } from 'lucide-react';
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

const USER_ROLES = ['admin', 'manager', 'accountant', 'counter', 'driver', 'user'];
const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

const EMPTY_STAFF = { fullName: '', email: '', phone: '', role: 'counter', branch: '01 McAllen', title: '', notes: '' };

const INVITE_STATUS_COLORS = {
  not_invited: 'bg-gray-100 text-gray-600',
  invited: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
};

function StaffForm({ staff, onSave, onCancel }) {
  const [form, setForm] = useState(staff ? { ...staff } : { ...EMPTY_STAFF });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.fullName.trim()) { alert('Full name required'); return; }
    setSaving(true);
    if (staff) {
      await base44.entities.StaffMember.update(staff.id, form);
    } else {
      await base44.entities.StaffMember.create({ ...form, inviteStatus: 'not_invited' });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
      <div className="font-semibold text-indigo-900">{staff ? 'Edit Employee' : 'New Employee'}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
          <Input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Jane Smith" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Job Title</label>
          <Input value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder="e.g. Counter Manager" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
          <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
          <Input type="tel" value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="(956) 123-4567" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">App Role</label>
          <select value={form.role} onChange={e => set('role', e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white">
            {USER_ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
          <select value={form.branch || ''} onChange={e => set('branch', e.target.value)} className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white">
            <option value="">— Select branch —</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
          <Input value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="Optional internal notes" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Employee
        </Button>
      </div>
    </div>
  );
}

function EmployeeSection() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [invitingId, setInvitingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const s = await base44.entities.StaffMember.list('fullName', 200);
    setStaff(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Remove this employee record?')) return;
    await base44.entities.StaffMember.delete(id);
    load();
  };

  const handleSendInvite = async (member) => {
    if (!member.email) { alert('Employee needs an email address before sending an invite.'); return; }
    if (!confirm(`Send app invite to ${member.email}?`)) return;
    setInvitingId(member.id);
    try {
      await base44.users.inviteUser(member.email, member.role || 'user');
      await base44.entities.StaffMember.update(member.id, { inviteStatus: 'invited', invitedAt: new Date().toISOString() });
      load();
    } catch (err) {
      alert(`Invite failed: ${err.message}`);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {showForm && (
        <StaffForm
          staff={editing}
          onSave={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Employees ({staff.length})</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded">
              <RefreshCw className="w-4 h-4" />
            </button>
            {!showForm && (
              <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Add Employee
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>
        ) : staff.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">
            <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No employees yet. Add one to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {staff.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{s.fullName}</span>
                    {s.title && <span className="text-xs text-gray-500">· {s.title}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${INVITE_STATUS_COLORS[s.inviteStatus || 'not_invited']}`}>
                      {s.inviteStatus === 'active' ? 'Active' : s.inviteStatus === 'invited' ? 'Invited' : 'Not Invited'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                    {s.email && <span>{s.email}</span>}
                    {s.phone && <span>{s.phone}</span>}
                    {s.branch && <span>{s.branch}</span>}
                    <span className="capitalize font-medium text-indigo-600">{s.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {s.inviteStatus !== 'active' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendInvite(s)}
                      disabled={invitingId === s.id || !s.email}
                      className="text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      title={!s.email ? 'Add email first' : 'Send app invite'}
                    >
                      {invitingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      {s.inviteStatus === 'invited' ? 'Resend' : 'Invite'}
                    </Button>
                  )}
                  <button onClick={() => { setEditing(s); setShowForm(true); }} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-gray-50">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded hover:bg-gray-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
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
            <div className="text-lg font-bold">Role & Employee Manager</div>
            <div className="text-indigo-300 text-xs">{roles.length} roles defined</div>
          </div>
          {tab === 'roles' && (
            <Button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="gap-2 bg-white text-indigo-900 hover:bg-indigo-50"
            >
              <Plus className="w-4 h-4" /> New Role
            </Button>
          )}
          {tab === 'employees' && <div />}
        </div>
        {/* Tabs */}
        <div className="px-4 max-w-5xl mx-auto flex gap-1">
          {[{ key: 'roles', label: 'Roles' }, { key: 'employees', label: 'Employees' }].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t.key ? 'border-white text-white' : 'border-transparent text-indigo-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

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