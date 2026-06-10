import { useState, useEffect, useMemo } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Tag, BarChart2, Trash2, Edit2, Check, X, TrendingDown } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const TABS = ['Promo Codes', 'Volume Rules', 'Discount Log'];

const EMPTY_PROMO = { code: '', description: '', discountType: 'percent', discountValue: '', active: true, usageLimit: '', expiresAt: '', appliesTo: 'all', appliesToCategory: '' };
const EMPTY_VOLUME = { name: '', category: '', minimumQuantity: '', discountType: 'percent', discountValue: '', active: true };

export default function DiscountManager() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Promo Codes');
  const [promos, setPromos] = useState([]);
  const [volumeRules, setVolumeRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPromo, setEditingPromo] = useState(null);
  const [editingVolume, setEditingVolume] = useState(null);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [promoForm, setPromoForm] = useState(EMPTY_PROMO);
  const [volumeForm, setVolumeForm] = useState(EMPTY_VOLUME);

  useEffect(() => {
    Promise.all([
      supabaseData.PromoCode.list('-created_at', 200),
      supabaseData.VolumeDiscountRule.list('-created_at', 200),
      supabaseData.DiscountLog.list('-created_at', 500),
    ]).then(([p, v, l]) => {
      setPromos(p);
      setVolumeRules(v);
      setLogs(l);
      setLoading(false);
    });
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = logs.reduce((s, l) => s + (l.discountAmount || 0), 0);
    const byType = {};
    logs.forEach(l => {
      byType[l.discountType] = (byType[l.discountType] || 0) + (l.discountAmount || 0);
    });
    return { total, byType, count: logs.length };
  }, [logs]);

  // ── Promo CRUD ──
  const savePromo = async () => {
    const payload = {
      ...promoForm,
      code: promoForm.code.toUpperCase().trim(),
      discountValue: parseFloat(promoForm.discountValue) || 0,
      usageLimit: promoForm.usageLimit ? parseInt(promoForm.usageLimit) : null,
      expiresAt: promoForm.expiresAt || null,
    };
    if (editingPromo) {
      const updated = await supabaseData.PromoCode.update(editingPromo.id, payload);
      setPromos(prev => prev.map(p => p.id === editingPromo.id ? { ...p, ...payload } : p));
    } else {
      const created = await supabaseData.PromoCode.create({ ...payload, usageCount: 0, active: payload.active !== false });
      setPromos(prev => [created, ...prev]);
    }
    setShowPromoForm(false);
    setEditingPromo(null);
    setPromoForm(EMPTY_PROMO);
  };

  const deletePromo = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    await supabaseData.PromoCode.delete(id);
    setPromos(prev => prev.filter(p => p.id !== id));
  };

  const togglePromo = async (promo) => {
    await supabaseData.PromoCode.update(promo.id, { active: !promo.active });
    setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, active: !p.active } : p));
  };

  // ── Volume CRUD ──
  const saveVolume = async () => {
    const payload = {
      ...volumeForm,
      minimumQuantity: parseInt(volumeForm.minimumQuantity) || 1,
      discountValue: parseFloat(volumeForm.discountValue) || 0,
    };
    if (editingVolume) {
      await supabaseData.VolumeDiscountRule.update(editingVolume.id, payload);
      setVolumeRules(prev => prev.map(v => v.id === editingVolume.id ? { ...v, ...payload } : v));
    } else {
      const created = await supabaseData.VolumeDiscountRule.create(payload);
      setVolumeRules(prev => [created, ...prev]);
    }
    setShowVolumeForm(false);
    setEditingVolume(null);
    setVolumeForm(EMPTY_VOLUME);
  };

  const deleteVolume = async (id) => {
    if (!confirm('Delete this volume rule?')) return;
    await supabaseData.VolumeDiscountRule.delete(id);
    setVolumeRules(prev => prev.filter(v => v.id !== id));
  };

  const toggleVolume = async (rule) => {
    await supabaseData.VolumeDiscountRule.update(rule.id, { active: !rule.active });
    setVolumeRules(prev => prev.map(v => v.id === rule.id ? { ...v, active: !v.active } : v));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Discount Manager"
        subtitle="Promo codes · Volume rules · Audit log"
        icon={Tag}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Discounted" value={`$${stats.total.toFixed(0)}`} icon={<TrendingDown className="w-4 h-4 text-red-500" />} />
          <StatCard label="Discount Events" value={stats.count} icon={<BarChart2 className="w-4 h-4 text-indigo-500" />} />
          <StatCard label="Active Promos" value={promos.filter(p => p.active).length} icon={<Tag className="w-4 h-4 text-green-500" />} />
          <StatCard label="Volume Rules" value={volumeRules.filter(v => v.active).length} icon={<Tag className="w-4 h-4 text-blue-500" />} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1 w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── PROMO CODES ── */}
            {tab === 'Promo Codes' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button onClick={() => { setPromoForm(EMPTY_PROMO); setEditingPromo(null); setShowPromoForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-1">
                    <Plus className="w-4 h-4" /> New Promo Code
                  </Button>
                </div>

                {showPromoForm && (
                  <PromoForm
                    form={promoForm}
                    onChange={setPromoForm}
                    onSave={savePromo}
                    onCancel={() => { setShowPromoForm(false); setEditingPromo(null); }}
                    isEdit={!!editingPromo}
                  />
                )}

                {promos.length === 0 ? (
                  <EmptyState label="No promo codes yet" />
                ) : promos.map(p => (
                  <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start justify-between gap-3 ${!p.active ? 'opacity-50' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 font-mono tracking-wider">{p.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                          {p.discountType === 'percent' ? `${p.discountValue}% off` : `$${p.discountValue} off`}
                        </span>
                      </div>
                      {p.description && <div className="text-sm text-gray-600 mt-0.5">{p.description}</div>}
                      <div className="text-xs text-gray-400 mt-1 flex gap-3 flex-wrap">
                        {p.usageLimit ? <span>Used {p.usageCount || 0}/{p.usageLimit}</span> : <span>Used {p.usageCount || 0}×</span>}
                        {p.expiresAt && <span>Expires {p.expiresAt}</span>}
                        {p.appliesTo !== 'all' && <span>Applies to: {p.appliesToCategory || p.appliesTo}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => togglePromo(p)} className="text-xs px-2 py-1 rounded border text-gray-500 hover:bg-gray-50">
                        {p.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => { setPromoForm({ ...p, usageLimit: p.usageLimit || '', expiresAt: p.expiresAt || '' }); setEditingPromo(p); setShowPromoForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deletePromo(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── VOLUME RULES ── */}
            {tab === 'Volume Rules' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button onClick={() => { setVolumeForm(EMPTY_VOLUME); setEditingVolume(null); setShowVolumeForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-1">
                    <Plus className="w-4 h-4" /> New Volume Rule
                  </Button>
                </div>

                {showVolumeForm && (
                  <VolumeForm
                    form={volumeForm}
                    onChange={setVolumeForm}
                    onSave={saveVolume}
                    onCancel={() => { setShowVolumeForm(false); setEditingVolume(null); }}
                    isEdit={!!editingVolume}
                  />
                )}

                {volumeRules.length === 0 ? (
                  <EmptyState label="No volume rules yet" />
                ) : volumeRules.map(v => (
                  <div key={v.id} className={`bg-white rounded-xl border shadow-sm p-4 flex items-start justify-between gap-3 ${!v.active ? 'opacity-50' : ''}`}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{v.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {v.active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {v.discountType === 'percent' ? `${v.discountValue}% off` : `$${v.discountValue} off/unit`}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex gap-3 flex-wrap">
                        <span>Min qty: {v.minimumQuantity}</span>
                        {v.category && <span>Category: {v.category}</span>}
                        {v.equipmentName && <span>Item: {v.equipmentName}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => toggleVolume(v)} className="text-xs px-2 py-1 rounded border text-gray-500 hover:bg-gray-50">
                        {v.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => { setVolumeForm({ ...v, minimumQuantity: v.minimumQuantity || '', discountValue: v.discountValue || '' }); setEditingVolume(v); setShowVolumeForm(true); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteVolume(v.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── DISCOUNT LOG ── */}
            {tab === 'Discount Log' && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {logs.length === 0 ? (
                  <EmptyState label="No discounts applied yet" />
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Customer</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Details</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Applied By</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l, i) => (
                        <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2 text-xs text-gray-500">{l.created_date?.slice(0, 10)}</td>
                          <td className="px-4 py-2 font-medium text-gray-800">
                            {l.customerName || '—'}
                            {l.invoiceNumber && <span className="ml-1 text-xs text-indigo-500">{l.invoiceNumber}</span>}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[l.discountType] || 'bg-gray-100 text-gray-600'}`}>
                              {l.discountType?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-600">{l.discountLabel || '—'}</td>
                          <td className="px-4 py-2 text-xs text-gray-500">{l.appliedBy || '—'}</td>
                          <td className="px-4 py-2 text-right font-semibold text-red-600">−${(l.discountAmount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-gray-50">
                      <tr>
                        <td colSpan={5} className="px-4 py-2 text-sm font-semibold text-gray-700">Total</td>
                        <td className="px-4 py-2 text-right font-bold text-red-700">−${stats.total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const TYPE_COLORS = {
  promo_code: 'bg-purple-100 text-purple-700',
  volume:     'bg-blue-100 text-blue-700',
  loyalty:    'bg-green-100 text-green-700',
  manual:     'bg-gray-100 text-gray-700',
  duration:   'bg-orange-100 text-orange-700',
};

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="text-center py-12 text-gray-400 text-sm bg-white rounded-xl border">
      {label}
    </div>
  );
}

function PromoForm({ form, onChange, onSave, onCancel, isEdit }) {
  const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }));
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
      <div className="font-semibold text-indigo-900 text-sm">{isEdit ? 'Edit Promo Code' : 'New Promo Code'}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Code *">
          <Input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="SUMMER10" className="font-mono tracking-wider" />
        </Field>
        <Field label="Description">
          <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Summer promo 2026" />
        </Field>
        <Field label="Discount Type">
          <select value={form.discountType} onChange={e => set('discountType', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
            <option value="percent">Percent Off (%)</option>
            <option value="flat">Flat Amount ($)</option>
          </select>
        </Field>
        <Field label={form.discountType === 'percent' ? 'Percent Off *' : 'Dollar Off *'}>
          <Input type="number" min="0" step="0.01" value={form.discountValue} onChange={e => set('discountValue', e.target.value)} placeholder={form.discountType === 'percent' ? '10' : '25'} />
        </Field>
        <Field label="Usage Limit (blank = unlimited)">
          <Input type="number" min="1" value={form.usageLimit} onChange={e => set('usageLimit', e.target.value)} placeholder="Leave blank for unlimited" />
        </Field>
        <Field label="Expires (blank = no expiry)">
          <Input type="date" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
        </Field>
        <Field label="Applies To">
          <select value={form.appliesTo} onChange={e => set('appliesTo', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
            <option value="all">All Equipment</option>
            <option value="category">Specific Category</option>
          </select>
        </Field>
        {form.appliesTo === 'category' && (
          <Field label="Category Name">
            <Input value={form.appliesToCategory} onChange={e => set('appliesToCategory', e.target.value)} placeholder="e.g. Chair" />
          </Field>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X className="w-3 h-3 mr-1" />Cancel</Button>
        <Button size="sm" onClick={onSave} className="bg-indigo-600 hover:bg-indigo-700"><Check className="w-3 h-3 mr-1" />Save</Button>
      </div>
    </div>
  );
}

function VolumeForm({ form, onChange, onSave, onCancel, isEdit }) {
  const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }));
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="font-semibold text-blue-900 text-sm">{isEdit ? 'Edit Volume Rule' : 'New Volume Rule'}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Rule Name *">
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="50+ Chairs" />
        </Field>
        <Field label="Category (optional)">
          <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Chair" />
        </Field>
        <Field label="Minimum Quantity *">
          <Input type="number" min="1" value={form.minimumQuantity} onChange={e => set('minimumQuantity', e.target.value)} placeholder="50" />
        </Field>
        <Field label="Discount Type">
          <select value={form.discountType} onChange={e => set('discountType', e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm bg-white">
            <option value="percent">Percent Off (%)</option>
            <option value="flat">Flat Per Unit ($)</option>
          </select>
        </Field>
        <Field label={form.discountType === 'percent' ? 'Percent Off *' : 'Dollar Off per unit *'}>
          <Input type="number" min="0" step="0.01" value={form.discountValue} onChange={e => set('discountValue', e.target.value)} placeholder={form.discountType === 'percent' ? '10' : '0.50'} />
        </Field>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}><X className="w-3 h-3 mr-1" />Cancel</Button>
        <Button size="sm" onClick={onSave} className="bg-blue-600 hover:bg-blue-700"><Check className="w-3 h-3 mr-1" />Save</Button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}