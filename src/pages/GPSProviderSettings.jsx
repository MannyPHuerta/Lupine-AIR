import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { Plus, Pencil, Trash2, Wifi, WifiOff, Settings, ChevronDown, ChevronUp, FlaskConical, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const PROVIDER_META = {
  samsara:         { label: 'Samsara',                    logo: '🚛', authFields: ['apiKey'], docsUrl: 'https://developers.samsara.com' },
  fleettraks:      { label: 'FleetTraks (On-Board/NASTC)', logo: '🛰️', authFields: ['apiKey', 'accountId', 'baseUrl'], docsUrl: 'https://www.nastek.com' },
  fleettracks:     { label: 'FleetTracks (AI Telematics)', logo: '📡', authFields: ['apiKey', 'accountId', 'baseUrl'], docsUrl: null },
  calamp:          { label: 'CalAmp / LoJack',             logo: '📡', authFields: ['apiKey', 'accountId'], docsUrl: 'https://developer.calamp.com' },
  verizon_connect: { label: 'Verizon Connect',             logo: '🌐', authFields: ['apiKey', 'apiSecret', 'accountId'], docsUrl: 'https://developer.verizonconnect.com' },
  geotab:          { label: 'Geotab',                      logo: '🗺️', authFields: ['apiKey', 'apiSecret', 'accountId', 'baseUrl'], docsUrl: 'https://developers.geotab.com' },
  spireon:         { label: 'Spireon',                     logo: '🏗️', authFields: ['apiKey', 'accountId'], docsUrl: 'https://www.spireon.com' },
  trackimo:        { label: 'Trackimo',                    logo: '📍', authFields: ['apiKey'], docsUrl: 'https://trackimo.com' },
  bouncie:         { label: 'Bouncie',                     logo: '🔵', authFields: ['apiKey'], docsUrl: 'https://www.bouncie.com' },
  custom:          { label: 'Custom / Other',              logo: '⚙️', authFields: ['apiKey', 'apiSecret', 'accountId', 'baseUrl'], docsUrl: null },
};

const FIELD_LABELS = {
  apiKey:    'API Key / Token',
  apiSecret: 'API Secret / Password',
  accountId: 'Account / Org ID',
  baseUrl:   'Base URL (custom endpoint)',
};

const BRANCHES = [
  '', '01 McAllen', '02 Weslaco', '03 Harlingen',
  '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse',
];

function ProviderForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: '',
    providerType: 'samsara',
    branch: '',
    apiKey: '',
    apiSecret: '',
    accountId: '',
    baseUrl: '',
    webhookSecret: '',
    geofenceRadiusMiles: 1,
    pollIntervalMinutes: 30,
    isActive: true,
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const meta = PROVIDER_META[form.providerType] || PROVIDER_META.custom;

  const handleSave = async () => {
    if (!form.name || !form.providerType) {
      toast.error('Name and provider type are required.');
      return;
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Provider type */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Provider *</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            value={form.providerType}
            onChange={e => set('providerType', e.target.value)}
          >
            {Object.entries(PROVIDER_META).map(([key, m]) => (
              <option key={key} value={key}>{m.logo} {m.label}</option>
            ))}
          </select>
        </div>

        {/* Friendly name */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Friendly Name *</label>
          <Input
            placeholder={`e.g. ${meta.label} – McAllen`}
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>

        {/* Branch */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Branch (blank = all)</label>
          <select
            className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            value={form.branch}
            onChange={e => set('branch', e.target.value)}
          >
            {BRANCHES.map(b => (
              <option key={b} value={b}>{b || 'All Branches'}</option>
            ))}
          </select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3 pt-5">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={e => set('isActive', e.target.checked)}
            className="w-4 h-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
        </div>
      </div>

      {/* Auth fields for this provider */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-2">
          🔐 Credentials
          {meta.docsUrl && (
            <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer"
              className="text-indigo-500 hover:underline font-normal normal-case">API Docs ↗</a>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {meta.authFields.map(field => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{FIELD_LABELS[field]}</label>
              <Input
                type={field.toLowerCase().includes('secret') || field === 'apiKey' ? 'password' : 'text'}
                placeholder={FIELD_LABELS[field]}
                value={form[field] || ''}
                onChange={e => set(field, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Webhook Secret (optional)</label>
            <Input
              type="password"
              placeholder="For inbound webhook validation"
              value={form.webhookSecret || ''}
              onChange={e => set('webhookSecret', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Geo-fence settings */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">📍 Geo-fence Settings</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Breach Radius (miles)</label>
            <Input
              type="number"
              min="0.1"
              step="0.1"
              value={form.geofenceRadiusMiles}
              onChange={e => set('geofenceRadiusMiles', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Poll Interval (minutes)</label>
            <Input
              type="number"
              min="5"
              step="5"
              value={form.pollIntervalMinutes}
              onChange={e => set('pollIntervalMinutes', parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Internal Notes</label>
        <Input
          placeholder="e.g. covers generators and lifts at McAllen yard"
          value={form.notes || ''}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {saving ? 'Saving…' : 'Save Provider'}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ProviderCard({ provider, onEdit, onDelete, onTestResult }) {
  const meta = PROVIDER_META[provider.providerType] || PROVIDER_META.custom;
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(
    provider.lastTestResult
      ? { success: provider.lastTestResult === 'ok', message: provider.lastTestMessage, latencyMs: null, testedAt: provider.lastTestedAt }
      : null
  );

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/functions/gpsTestConnection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id }),
      }).then(r => r.json());
      const result = { ...res, testedAt: new Date().toISOString() };
      setTestResult(result);
      onTestResult && onTestResult(provider.id, result);
    } catch (err) {
      setTestResult({ success: false, message: err.message, testedAt: new Date().toISOString() });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`bg-white border rounded-xl p-4 space-y-2 ${!provider.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="text-3xl flex-shrink-0 mt-0.5">{meta.logo}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{provider.name}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{meta.label}</span>
            {provider.branch && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{provider.branch}</span>}
            {provider.isActive
              ? <span className="flex items-center gap-1 text-xs text-green-600"><Wifi className="w-3 h-3" /> Active</span>
              : <span className="flex items-center gap-1 text-xs text-gray-400"><WifiOff className="w-3 h-3" /> Inactive</span>
            }
          </div>
          <div className="text-xs text-gray-500 mt-1 flex gap-4 flex-wrap">
            <span>📍 {provider.geofenceRadiusMiles || 1} mi fence</span>
            <span>⏱ Poll every {provider.pollIntervalMinutes || 30} min</span>
            {provider.accountId && <span>Account: {provider.accountId}</span>}
          </div>
          {provider.notes && <p className="text-xs text-gray-400 mt-1 italic">{provider.notes}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button size="icon" variant="ghost" onClick={() => onEdit(provider)}>
            <Pencil className="w-4 h-4 text-gray-400" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(provider)}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        </div>
      </div>

      {/* Test Connection row */}
      <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
        <Button
          size="sm"
          variant="outline"
          onClick={handleTest}
          disabled={testing}
          className="gap-1.5 text-xs h-7 px-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
          {testing ? 'Testing…' : 'Test Connection'}
        </Button>

        {testResult && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.success
              ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
            }
            <span className="truncate max-w-xs">{testResult.message}</span>
            {testResult.latencyMs && <span className="text-gray-400 font-normal">({testResult.latencyMs}ms)</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GPSProviderSettings() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await supabaseData.GPSProvider.list('-created_at', 100);
      setProviders(data);
    } catch (err) {
      console.error('[GPSProvider] Failed to load:', err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editing) {
      await supabaseData.GPSProvider.update(editing.id, form);
      toast.success('Provider updated.');
    } else {
      await supabaseData.GPSProvider.create(form);
      toast.success('Provider added.');
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleEdit = (p) => {
    setEditing(p);
    setShowForm(true);
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"? This will not affect existing equipment links.`)) return;
    await supabaseData.GPSProvider.delete(p.id);
    toast.success('Provider removed.');
    load();
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="GPS Provider Settings"
        subtitle="Configure GPS tracking providers for equipment location monitoring and geo-fence alerts"
        icon={Settings}
        action={
          !showForm && (
            <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-white text-slate-900 hover:bg-slate-100 gap-2">
              <Plus className="w-4 h-4" /> Add Provider
            </Button>
          )
        }
      />
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Supported providers info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="text-xs font-semibold text-indigo-700 uppercase mb-2">Supported Providers</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PROVIDER_META).map(([key, m]) => (
            <span key={key} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-1 rounded-full">
              {m.logo} {m.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-indigo-600 mt-2">
          Each provider uses a normalized adapter — equipment links and geo-fence alerts work the same regardless of provider.
        </p>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <ProviderForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Provider list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="font-medium text-gray-500">No GPS providers configured yet</div>
          <div className="text-xs mt-1">Add your first provider to start tracking equipment locations.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map(p => (
            <ProviderCard key={p.id} provider={p} onEdit={handleEdit} onDelete={handleDelete} onTestResult={() => load()} />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}