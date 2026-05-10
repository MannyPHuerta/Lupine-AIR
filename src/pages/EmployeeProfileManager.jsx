import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, Loader2, Badge, Wrench, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [tab, setTab] = useState('mechanics'); // 'mechanics' | 'planners'
  const [mechanics, setMechanics] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.MechanicProfile.list('fullName', 200),
      base44.entities.User.list('full_name', 200),
    ]).then(([mech, u]) => {
      setMechanics(mech);
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
    if (!form.email || !form.fullName) { alert('Email and name required'); return; }
    setSaving(true);
    try {
      await base44.entities.MechanicProfile.update(editingId, form);
      setMechanics(prev => prev.map(m => m.id === editingId ? form : m));
      cancelEdit();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this mechanic profile?')) return;
    await base44.entities.MechanicProfile.delete(id);
    setMechanics(prev => prev.filter(m => m.id !== id));
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const mechanicEmails = new Set(mechanics.map(m => m.email));
  const plannerEmails = new Set();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/shop-floor')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Employee Credentials</div>
            <div className="text-indigo-300 text-xs">Manage mechanic skills, certifications & planner qualifications</div>
          </div>
        </div>
        {/* Tabs */}
        <div className="px-4 max-w-6xl mx-auto flex gap-1">
          {[{ key: 'mechanics', label: 'Mechanics', icon: Wrench }, { key: 'planners', label: 'Planners', icon: Calendar }].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
                  tab === t.key ? 'border-white text-white' : 'border-transparent text-indigo-300 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === 'mechanics' ? (
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
                          <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
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
          /* Planners tab - placeholder */
          <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
            Planner certification management coming soon. Set certs per state requirements (ISES, MPI, APEX, etc.)
          </div>
        )}
      </div>
    </div>
  );
}