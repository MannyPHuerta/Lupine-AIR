import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Loader2, Wrench, Calendar, Save, Users, Shield, Award } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BRANCHES = ['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

const EQUIPMENT_CATEGORIES = [
  'Air Compressor', 'Backhoe', 'Boom Lift', 'Bulldozer', 'Chair', 'Chipper/Shredder',
  'Compactor', 'Concrete Equipment', 'Dance Floor', 'Dump Truck', 'Excavator',
  'Floor Sander', 'Forklift', 'Generator', 'Grader', 'Inflatable', 'Light Tower',
  'Loader', 'Pallet Jack', 'Paving Equipment', 'Plate Compactor', 'Pressure Washer',
  'Sandblaster', 'Scissor Lift', 'Skid Steer', 'Staging', 'Stump Grinder', 'Table',
  'Telehandler', 'Tent', 'Tile Stripper', 'Trailer', 'Trencher', 'Water Pump',
  'Welder', 'Zero Turn Mower'
];

const COMMON_CERTS = [
  'Forklift', 'Boom Lift', 'Scissor Lift', 'OSHA 10', 'OSHA 30', 'Welding',
  'CDL Class A', 'CDL Class B', 'Event Planner Certified', 'ISES', 'First Aid/CPR'
];

const PLANNER_CERTS = [
  'Event Planner Certified', 'ISES (International Special Events Society)', 'MPI', 'APEX'
];

export default function EmployeeProfileManager() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('staff'); // 'staff' | 'mechanics' | 'planners'
  const [mechanics, setMechanics] = useState([]);
  const [planners, setPlanners] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUserForm, setEditingUserForm] = useState(null);
  const [editingPlannerId, setEditingPlannerId] = useState(null);
  const [plannerForm, setPlannerForm] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MechanicProfile.list('fullName', 200),
      base44.entities.User.list('full_name', 200),
    ]).then(([mech, u]) => {
      // Separate mechanics and planners by role tag (use a notes/tag field heuristic — planners have planner role)
      const plannerEmails = new Set(u.filter(usr => usr.role === 'planner').map(usr => usr.email));
      setMechanics(mech.filter(m => !plannerEmails.has(m.email)));
      setPlanners(mech.filter(m => plannerEmails.has(m.email)));
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const getPlannerUsers = () => users.filter(u => ['planner', 'admin'].includes(u.role));
  const getMechanicUsers = () => users.filter(u => ['mechanic', 'admin'].includes(u.role));

  const startEdit = (mechanic) => {
    setEditingId(mechanic.id);
    setForm({ ...mechanic });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(null);
  };

  const handleSave = async () => {
    if (!form.email || !form.fullName) { toast({ title: 'Required fields missing', description: 'Email and name are required.', variant: 'destructive' }); return; }
    setSaving(true);
    await base44.entities.MechanicProfile.update(editingId, form);
    setMechanics(prev => prev.map(m => m.id === editingId ? form : m));
    cancelEdit();
    setSaving(false);
    toast({ title: '✅ Mechanic profile saved' });
  };

  const handleDelete = async (id) => {
    const mech = mechanics.find(m => m.id === id);
    if (!window.confirm(`Delete profile for ${mech?.fullName || 'this mechanic'}?`)) return;
    await base44.entities.MechanicProfile.delete(id);
    setMechanics(prev => prev.filter(m => m.id !== id));
    toast({ title: 'Profile deleted' });
  };

  const startEditUser = (user) => {
    setEditingUserId(user.id);
    setEditingUserForm({ ...user });
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
    setEditingUserForm(null);
  };

  const handleSaveUser = async () => {
    setSaving(true);
    await base44.entities.User.update(editingUserId, { 
      homeBranch: editingUserForm.homeBranch,
      role: editingUserForm.role,
    });
    setUsers(prev => prev.map(u => u.id === editingUserId ? editingUserForm : u));
    cancelEditUser();
    setSaving(false);
    toast({ title: '✅ Staff record saved' });
  };

  const handleCreateNew = async (userEmail) => {
    const user = users.find(u => u.email === userEmail);
    if (!user) return;
    const newProf = await base44.entities.MechanicProfile.create({
      email: userEmail,
      fullName: user.full_name || userEmail,
      skills: [],
      certifications: [],
      branch: '01 McAllen',
      isActive: true,
      maxConcurrentJobs: 2,
    });
    setMechanics(prev => [...prev, newProf]);
    toast({ title: '✅ Mechanic profile created' });
  };

  const handleCreatePlanner = async (userEmail) => {
    const user = users.find(u => u.email === userEmail);
    if (!user) return;
    const newProf = await base44.entities.MechanicProfile.create({
      email: userEmail,
      fullName: user.full_name || userEmail,
      skills: [],
      certifications: [],
      branch: '01 McAllen',
      isActive: true,
      maxConcurrentJobs: 5,
    });
    setPlanners(prev => [...prev, newProf]);
    toast({ title: '✅ Planner profile created' });
  };

  const handleSavePlanner = async () => {
    if (!plannerForm.email || !plannerForm.fullName) {
      toast({ title: 'Required fields missing', description: 'Email and name are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    await base44.entities.MechanicProfile.update(editingPlannerId, plannerForm);
    setPlanners(prev => prev.map(p => p.id === editingPlannerId ? plannerForm : p));
    setEditingPlannerId(null);
    setPlannerForm(null);
    setSaving(false);
    toast({ title: '✅ Planner profile saved' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const mechanicEmails = new Set(mechanics.map(m => m.email));
  const plannerEmails = new Set(planners.map(p => p.email));

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Employee Credentials"
        subtitle="Manage mechanic skills, certifications & planner qualifications"
        backTo="/shop-floor"
      >
        <div className="flex gap-1 -mb-1">
          {[{ key: 'staff', label: 'Staff Home Branches', icon: Users }, { key: 'mechanics', label: 'Mechanics', icon: Wrench }, { key: 'planners', label: 'Planners', icon: Calendar }].map(t => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="px-4 py-2 text-sm font-medium border-b-2 transition flex items-center gap-1.5"
                style={{ borderBottomColor: tab === t.key ? '#F5A623' : 'transparent', color: tab === t.key ? '#F5A623' : '#a0aec0' }}
              >
                <TabIcon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </AppPageHeader>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === 'staff' ? (
          <>
            {/* Staff home branches */}
            <div className="space-y-3">
              {users.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-400">No staff registered yet</div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    {editingUserId === user.id ? (
                      // Edit mode
                      <div className="p-5 space-y-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
                            <Input value={user.full_name} disabled className="bg-gray-100" />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                            <Input type="email" value={user.email} disabled className="bg-gray-100" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-2">Home Branch</label>
                          <select
                            value={editingUserForm.homeBranch || ''}
                            onChange={e => setEditingUserForm(f => ({ ...f, homeBranch: e.target.value }))}
                            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white"
                          >
                            <option value="">— Not set —</option>
                            {BRANCHES.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-2">Role</label>
                          <select
                            value={editingUserForm.role || 'user'}
                            onChange={e => setEditingUserForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white"
                          >
                            {['admin','manager','counter','driver','mechanic','accountant','planner','user'].map(r => (
                              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={cancelEditUser}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveUser} disabled={saving} className="text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
                            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Read mode
                      <div className="px-5 py-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{user.full_name || user.email}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                          {user.homeBranch && (
                            <div className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded inline-block mt-2">
                                🏠 Home: {user.homeBranch}
                              </div>
                            )}
                            {!user.homeBranch && (
                              <div className="text-xs text-gray-500 mt-2">— no home branch set —</div>
                            )}
                            {user.role && (
                              <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block mt-1 ml-1">
                                <Shield className="w-3 h-3 inline mr-1" />{user.role}
                              </div>
                            )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditUser(user)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-gray-50">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete user "${user.full_name || user.email}"? This cannot be undone.`)) return;
                              await base44.entities.User.delete(user.id);
                              setUsers(prev => prev.filter(u => u.id !== user.id));
                            }}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-gray-50"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : tab === 'mechanics' ? (
          <>
            {/* Quick add for unassigned mechanics */}
            {getMechanicUsers().filter(u => !mechanicEmails.has(u.email)).length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-900 mb-3">Create profiles for mechanics</div>
                <div className="flex flex-wrap gap-2">
                  {getMechanicUsers()
                    .filter(u => !mechanicEmails.has(u.email))
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleCreateNew(u.email)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {u.full_name || u.email}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Mechanics list */}
            <div className="space-y-3">
              {mechanics.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-400">No mechanics registered yet</div>
              ) : (
                mechanics.map(mechanic => (
                  <div key={mechanic.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    {editingId === mechanic.id ? (
                      // Edit mode
                      <div className="p-5 space-y-4 border-t">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
                            <Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                            <Input type="email" value={form.email} disabled className="bg-gray-100" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Hourly Rate ($)</label>
                            <Input type="number" step="0.01" value={form.hourlyRate || 0} onChange={e => setForm(f => ({ ...f, hourlyRate: parseFloat(e.target.value) || 0 }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Per-Job Rate ($)</label>
                            <Input type="number" step="0.01" value={form.perJobRate || 0} onChange={e => setForm(f => ({ ...f, perJobRate: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
                            <Input value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Max Concurrent Jobs</label>
                            <Input type="number" min="1" value={form.maxConcurrentJobs || 2} onChange={e => setForm(f => ({ ...f, maxConcurrentJobs: parseInt(e.target.value) || 2 }))} />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-2">Skills (Equipment Types)</label>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {EQUIPMENT_CATEGORIES.map(cat => (
                              <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={(form.skills || []).includes(cat)}
                                  onChange={e => setForm(f => ({
                                    ...f,
                                    skills: e.target.checked
                                      ? [...(f.skills || []), cat]
                                      : (f.skills || []).filter(s => s !== cat)
                                  }))}
                                  className="w-4 h-4 rounded"
                                />
                                <span className="text-xs text-gray-700">{cat}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-2">Certifications</label>
                          <div className="grid grid-cols-2 gap-2">
                            {COMMON_CERTS.map(cert => (
                              <label key={cert} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={(form.certifications || []).includes(cert)}
                                  onChange={e => setForm(f => ({
                                    ...f,
                                    certifications: e.target.checked
                                      ? [...(f.certifications || []), cert]
                                      : (f.certifications || []).filter(c => c !== cert)
                                  }))}
                                  className="w-4 h-4 rounded"
                                />
                                <span className="text-xs text-gray-700">{cert}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-2">
                            <Input
                              placeholder="Add custom cert..."
                              onKeyDown={e => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  const cert = e.target.value.trim();
                                  setForm(f => ({
                                    ...f,
                                    certifications: [...(f.certifications || []), cert]
                                  }));
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                          <Button size="sm" onClick={handleSave} disabled={saving} className="text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
                            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Read mode
                      <>
                        <div className="px-5 py-4 flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-gray-900">{mechanic.fullName}</div>
                              {mechanic.isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>}
                              {!mechanic.isActive && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{mechanic.email} • {mechanic.branch}</div>
                            
                            {mechanic.skills && mechanic.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {mechanic.skills.map(skill => (
                                  <span key={skill} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">🔧 {skill}</span>
                                ))}
                              </div>
                            )}

                            {mechanic.certifications && mechanic.certifications.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {mechanic.certifications.map(cert => (
                                  <span key={cert} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">📜 {cert}</span>
                                ))}
                              </div>
                            )}

                            {mechanic.hourlyRate > 0 || mechanic.perJobRate > 0 ? (
                              <div className="text-xs text-gray-600 mt-2">
                                {mechanic.hourlyRate > 0 && <span className="mr-3">${mechanic.hourlyRate}/hr</span>}
                                {mechanic.perJobRate > 0 && <span>${mechanic.perJobRate}/job</span>}
                                {mechanic.maxConcurrentJobs && <span className="ml-3">Max {mechanic.maxConcurrentJobs} jobs</span>}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => startEdit(mechanic)} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-gray-50">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(mechanic.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-gray-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Planners tab */
          <>
            {getPlannerUsers().filter(u => !plannerEmails.has(u.email)).length > 0 && (
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-pink-900 mb-3">Create planner profiles for these users</div>
                <div className="flex flex-wrap gap-2">
                  {getPlannerUsers()
                    .filter(u => !plannerEmails.has(u.email))
                    .map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleCreatePlanner(u.email)}
                        className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-medium rounded transition flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> {u.full_name || u.email}
                      </button>
                    ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {planners.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-400">No planner profiles yet. Assign a user the "planner" role on the Staff tab first.</div>
              ) : (
                planners.map(planner => (
                  <div key={planner.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    {editingPlannerId === planner.id ? (
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
                            <Input value={plannerForm.fullName} onChange={e => setPlannerForm(f => ({ ...f, fullName: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                            <Input value={plannerForm.email} disabled className="bg-gray-100" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
                          <select
                            value={plannerForm.branch || ''}
                            onChange={e => setPlannerForm(f => ({ ...f, branch: e.target.value }))}
                            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white"
                          >
                            <option value="">— Select —</option>
                            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-2">Certifications</label>
                          <div className="grid grid-cols-2 gap-2">
                            {PLANNER_CERTS.map(cert => (
                              <label key={cert} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={(plannerForm.certifications || []).includes(cert)}
                                  onChange={e => setPlannerForm(f => ({
                                    ...f,
                                    certifications: e.target.checked
                                      ? [...(f.certifications || []), cert]
                                      : (f.certifications || []).filter(c => c !== cert)
                                  }))}
                                  className="w-4 h-4 rounded"
                                />
                                <span className="text-xs text-gray-700">{cert}</span>
                              </label>
                            ))}
                          </div>
                          <Input
                            className="mt-2"
                            placeholder="Add custom cert…"
                            onKeyDown={e => {
                              if (e.key === 'Enter' && e.target.value.trim()) {
                                const cert = e.target.value.trim();
                                setPlannerForm(f => ({ ...f, certifications: [...(f.certifications || []), cert] }));
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                          <Input value={plannerForm.notes || ''} onChange={e => setPlannerForm(f => ({ ...f, notes: e.target.value }))} placeholder="Availability constraints, specialties…" />
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t">
                          <Button variant="outline" size="sm" onClick={() => { setEditingPlannerId(null); setPlannerForm(null); }}>Cancel</Button>
                          <Button size="sm" onClick={handleSavePlanner} disabled={saving} className="text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
                            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-4 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-gray-900">{planner.fullName}</div>
                            {planner.isActive !== false && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Active</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{planner.email}{planner.branch ? ` · ${planner.branch}` : ''}</div>
                          {planner.certifications?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {planner.certifications.map(c => (
                                <span key={c} className="text-xs bg-pink-50 text-pink-700 px-2 py-1 rounded flex items-center gap-1">
                                  <Award className="w-3 h-3" /> {c}
                                </span>
                              ))}
                            </div>
                          )}
                          {planner.notes && <div className="text-xs text-gray-400 mt-1 italic">{planner.notes}</div>}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingPlannerId(planner.id); setPlannerForm({ ...planner }); }} className="text-gray-400 hover:text-indigo-600 p-1.5 rounded hover:bg-gray-50">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={async () => {
                            if (!window.confirm(`Delete planner profile for ${planner.fullName}?`)) return;
                            await base44.entities.MechanicProfile.delete(planner.id);
                            setPlanners(prev => prev.filter(p => p.id !== planner.id));
                            toast({ title: 'Planner profile deleted' });
                          }} className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-gray-50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}