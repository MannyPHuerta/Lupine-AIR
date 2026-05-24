import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Upload, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { invalidateHeaderStyleCache } from '@/lib/useHeaderStyle';
import AppPageHeader from '@/components/AppPageHeader';

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
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, logoUrl: res.file_url }));
    } catch (err) {
      alert('Failed to upload logo: ' + err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings?.id) {
        await base44.entities.CompanySettings.update(settings.id, form);
      } else {
        await base44.entities.CompanySettings.create(form);
      }
      invalidateHeaderStyleCache(form.headerStyle);
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
      </div>
    </div>
  );
}