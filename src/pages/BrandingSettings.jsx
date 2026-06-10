import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, Palette, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { invalidateHeaderStyleCache } from '@/lib/useHeaderStyle';
import AppPageHeader from '@/components/AppPageHeader';
import { SEASONAL_THEMES, getActiveSeasonalTheme } from '@/lib/seasonalThemes';

export default function BrandingSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    companyName: '',
    logoUrl: '',
    headerStyle: 'classic',
    brandingTheme: {
      primaryColor: '#1E40AF',
      secondaryColor: '#6B7280',
      accentColor: '#F59E0B',
    },
    seasonalAutoActivate: false,
    seasonalThemeKey: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('theme');
  const todaysSeasonal = getActiveSeasonalTheme();

  useEffect(() => {
    // Defensive check for preview mode
    if (!base44 || !base44.entities) {
      console.warn('[BrandingSettings] Base44 SDK not available');
      setLoading(false);
      return;
    }
    
    base44.entities.CompanySettings.list()
      .then(list => {
        const s = list[0];
        if (s) {
          setSettings(s);
          setForm({
            companyName: s.companyName || '',
            logoUrl: s.logoUrl || '',
            headerStyle: s.headerStyle || 'classic',
            brandingTheme: s.brandingTheme || form.brandingTheme,
            seasonalAutoActivate: s.seasonalAutoActivate || false,
            seasonalThemeKey: s.seasonalThemeKey || null,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Defensive check for preview mode
    if (!base44 || !base44.integrations) {
      alert('Upload not available in preview mode');
      return;
    }

    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, logoUrl: res.file_url }));
    } catch (err) {
      alert('Failed to upload logo: ' + err.message);
    }
  };

  const handleSave = async () => {
    // Defensive check for preview mode
    if (!base44 || !base44.entities) {
      alert('Save not available in preview mode');
      return;
    }

    setSaving(true);
    try {
      if (settings?.id) {
        await base44.entities.CompanySettings.update(settings.id, form);
      } else {
        await base44.entities.CompanySettings.create(form);
      }
      invalidateHeaderStyleCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Branding & Theme"
        subtitle="Customize your internal staff application"
        icon={Palette}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/company-settings')} className="p-2 rounded-lg hover:bg-white/10 text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Button onClick={handleSave} disabled={saving} className="gap-2 bg-white text-slate-900 hover:bg-slate-100">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saved ? 'Saved!' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
            ✓ Branding saved successfully!
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'theme' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Palette className="w-4 h-4" /> Theme
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === 'seasonal' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Calendar className="w-4 h-4" /> Seasonal
            {todaysSeasonal && <span className="ml-1 text-base leading-none">{todaysSeasonal.emoji}</span>}
          </button>
        </div>

        {activeTab === 'seasonal' && (
          <div className="space-y-5">
            {/* Auto-activate toggle */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>Auto-Activate Seasonal Themes</span>
                    {todaysSeasonal && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {todaysSeasonal.emoji} {todaysSeasonal.label} active today
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    When enabled, the platform automatically switches to the matching seasonal theme during holiday windows — no manual effort needed.
                    {!todaysSeasonal && <span className="block mt-1 text-gray-400">No seasonal theme is active today.</span>}
                  </p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, seasonalAutoActivate: !f.seasonalAutoActivate }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none ${form.seasonalAutoActivate ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${form.seasonalAutoActivate ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Manual theme picker */}
            <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900">Manual Seasonal Theme</h2>
                <p className="text-xs text-gray-500 mt-1">Override with a specific holiday theme any time — useful for early decorating or testing. Auto-activate takes priority when enabled.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, headerStyle: 'classic', seasonalThemeKey: null }))}
                  className={`rounded-lg border-2 p-3 text-left transition ${!form.seasonalThemeKey && form.headerStyle !== 'seasonal' ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-gray-200 hover:border-indigo-300'}`}
                >
                  <div className="font-medium text-sm text-gray-700">✖ No seasonal theme</div>
                  <div className="text-xs text-gray-400 mt-0.5">Use the standard theme above</div>
                </button>
                {SEASONAL_THEMES.map(theme => (
                  <button
                    key={theme.key}
                    onClick={() => setForm(f => ({ ...f, headerStyle: 'seasonal', seasonalThemeKey: theme.key }))}
                    className={`rounded-lg border-2 overflow-hidden text-left transition ${form.seasonalThemeKey === theme.key ? 'border-indigo-600 ring-2 ring-indigo-300' : 'border-gray-200 hover:border-indigo-300'}`}
                  >
                    <div className="h-8 w-full flex items-center px-3 gap-2" style={{ backgroundColor: theme.headerBg, borderBottom: `2px solid ${theme.accentColor}` }}>
                      <span className="text-lg">{theme.emoji}</span>
                      <span className="text-xs font-semibold text-white/80">{theme.label}</span>
                    </div>
                    <div className="px-3 py-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: theme.accentColor }} />
                      <span className="text-[10px] text-gray-500">{theme.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Holiday calendar reference */}
            <div className="bg-white rounded-lg border shadow-sm p-6 space-y-3">
              <h2 className="font-semibold text-gray-900">Holiday Windows</h2>
              <div className="divide-y">
                {SEASONAL_THEMES.map(theme => (
                  <div key={theme.key} className="flex items-center gap-3 py-2">
                    <span className="text-xl w-7 text-center">{theme.emoji}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-800">{theme.label}</div>
                      <div className="text-xs text-gray-400">{theme.dateRanges.map(r => `${r.startMD} → ${r.endMD}`).join(' · ')}</div>
                    </div>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: theme.accentColor }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'theme' && <>
        {/* Company Name */}
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Company Name</h2>
          <Input
            placeholder="e.g. Rental World LLC"
            value={form.companyName}
            onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
            className="text-sm"
          />
          <p className="text-xs text-gray-500">Displayed in staff dashboard header and email templates</p>
        </div>

        {/* Logo */}
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Logo</h2>
          <div className="flex items-center gap-4">
            {form.logoUrl && (
              <div className="w-24 h-24 bg-gray-100 rounded-lg border flex items-center justify-center overflow-hidden">
                <img src={form.logoUrl} alt="Logo preview" className="max-w-full max-h-full" />
              </div>
            )}
            <div className="flex-1">
              <label className="relative inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700">
                <Upload className="w-4 h-4" />
                Upload Logo
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              <p className="text-xs text-gray-500 mt-2">PNG or JPG, max 2MB, square or wide format</p>
            </div>
          </div>
        </div>

        {/* Header Style */}
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Page Header Style</h2>
          <p className="text-xs text-gray-600">Controls the look of headers across all staff pages.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                value: 'classic',
                label: 'Classic',
                preview: 'bg-indigo-900',
                desc: 'Clean indigo — professional & familiar',
              },
              {
                value: 'glassmorphism',
                label: 'Glassmorphism',
                preview: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700',
                desc: 'Dark gradient with frosted glass',
              },
              {
                value: 'neon',
                label: 'Neon',
                preview: 'bg-gray-950',
                desc: 'Dark mode with glowing cyan/violet accents',
              },
              {
                value: 'navy',
                label: 'Navy',
                preview: null,
                desc: 'Deep navy with gold accent line',
              },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm(f => ({ ...f, headerStyle: opt.value }))}
                className={`rounded-lg border-2 overflow-hidden text-left transition ${
                  (form.headerStyle || 'classic') === opt.value
                    ? 'border-indigo-600 ring-2 ring-indigo-300'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <div className={`h-12 w-full ${opt.preview || ''}`} style={opt.value === 'navy' ? { backgroundColor: '#0d1b3e', borderBottom: '3px solid #F5A623' } : {}} />
                <div className="p-2">
                  <div className="text-xs font-semibold text-gray-800">{opt.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Color Theme */}
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Color Theme</h2>
          <p className="text-xs text-gray-600">Customize the primary colors used throughout the staff interface.</p>

          <div className="space-y-3">
            {/* Primary Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Primary Color (Buttons, Links, Headers)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandingTheme.primaryColor || '#1E40AF'}
                  onChange={e => setForm(f => ({
                    ...f,
                    brandingTheme: { ...f.brandingTheme, primaryColor: e.target.value }
                  }))}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  type="text"
                  value={form.brandingTheme.primaryColor || '#1E40AF'}
                  onChange={e => setForm(f => ({
                    ...f,
                    brandingTheme: { ...f.brandingTheme, primaryColor: e.target.value }
                  }))}
                  placeholder="#1E40AF"
                  className="text-sm font-mono"
                />
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Secondary Color (Backgrounds, Muted Elements)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandingTheme.secondaryColor || '#6B7280'}
                  onChange={e => setForm(f => ({
                    ...f,
                    brandingTheme: { ...f.brandingTheme, secondaryColor: e.target.value }
                  }))}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  type="text"
                  value={form.brandingTheme.secondaryColor || '#6B7280'}
                  onChange={e => setForm(f => ({
                    ...f,
                    brandingTheme: { ...f.brandingTheme, secondaryColor: e.target.value }
                  }))}
                  placeholder="#6B7280"
                  className="text-sm font-mono"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Accent Color (Highlights, Warnings)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.brandingTheme.accentColor || '#F59E0B'}
                  onChange={e => setForm(f => ({
                    ...f,
                    brandingTheme: { ...f.brandingTheme, accentColor: e.target.value }
                  }))}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  type="text"
                  value={form.brandingTheme.accentColor || '#F59E0B'}
                  onChange={e => setForm(f => ({
                    ...f,
                    brandingTheme: { ...f.brandingTheme, accentColor: e.target.value }
                  }))}
                  placeholder="#F59E0B"
                  className="text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-gray-700 mb-3">Preview</p>
            <div className="flex gap-2">
              <button
                style={{ backgroundColor: form.brandingTheme.primaryColor }}
                className="text-white px-4 py-2 rounded text-xs font-medium"
              >
                Primary
              </button>
              <button
                style={{ backgroundColor: form.brandingTheme.secondaryColor }}
                className="text-white px-4 py-2 rounded text-xs font-medium"
              >
                Secondary
              </button>
              <button
                style={{ backgroundColor: form.brandingTheme.accentColor }}
                className="text-white px-4 py-2 rounded text-xs font-medium"
              >
                Accent
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Branding Settings
          </Button>
        </div>
        </>}

        {activeTab === 'seasonal' && (
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Seasonal Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}