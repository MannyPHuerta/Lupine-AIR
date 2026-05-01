import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PaymentSettingsPanel from '@/components/settings/PaymentSettingsPanel';

export default function CompanySettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    companyName: '',
    logoUrl: '',
    taxId: '',
    dunsNumber: '',
    cageCode: '',
    certifications: [],
    invoiceTerms: '',
    invoiceFooter: '',
    smsRemindersEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [certInput, setCertInput] = useState('');

  useEffect(() => {
    base44.entities.CompanySettings.list().then(records => {
      if (records.length > 0) {
        setSettings(records[0]);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setSettings(prev => ({ ...prev, logoUrl: res.file_url }));
    } finally {
      setUploading(false);
    }
  };

  const addCertification = () => {
    if (certInput.trim()) {
      setSettings(prev => ({
        ...prev,
        certifications: [...(prev.certifications || []), certInput.trim()]
      }));
      setCertInput('');
    }
  };

  const removeCertification = (index) => {
    setSettings(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      companyName: settings.companyName,
      logoUrl: settings.logoUrl,
      taxId: settings.taxId,
      dunsNumber: settings.dunsNumber,
      cageCode: settings.cageCode,
      certifications: settings.certifications,
      invoiceTerms: settings.invoiceTerms,
      invoiceFooter: settings.invoiceFooter,
      smsRemindersEnabled: settings.smsRemindersEnabled !== false,
    };

    if (settings.id) {
      await base44.entities.CompanySettings.update(settings.id, payload);
    } else {
      const created = await base44.entities.CompanySettings.create(payload);
      setSettings(prev => ({ ...prev, id: created.id }));
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => navigate('/availability')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Company Settings</div>
            <div className="text-indigo-300 text-xs">Configure company info and invoice branding</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {saved && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium">
                ✓ Settings saved successfully!
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-4">Basic Information</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                  <Input
                    value={settings.companyName}
                    onChange={e => handleChange('companyName', e.target.value)}
                    placeholder="Lupine Equipment Rentals"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Federal Tax ID (EIN)</label>
                  <Input
                    value={settings.taxId}
                    onChange={e => handleChange('taxId', e.target.value)}
                    placeholder="12-3456789"
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-4">Invoice Logo</div>
              <div className="space-y-4">
                {settings.logoUrl && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 font-medium">Current logo</div>
                      <div className="text-xs text-gray-400 mt-1 break-all">{settings.logoUrl}</div>
                    </div>
                    <button
                      onClick={() => handleChange('logoUrl', '')}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Upload Logo</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <button
                      disabled={uploading}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Click to upload or drag and drop
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">PNG, JPG, SVG. Max 5MB recommended.</p>
                </div>
              </div>
            </div>

            {/* Government IDs */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-4">Government IDs</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">DUNS Number</label>
                  <Input
                    value={settings.dunsNumber}
                    onChange={e => handleChange('dunsNumber', e.target.value)}
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">CAGE Code</label>
                  <Input
                    value={settings.cageCode}
                    onChange={e => handleChange('cageCode', e.target.value)}
                    placeholder="1A2B3C"
                  />
                </div>
              </div>
            </div>

            {/* Certifications */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-4">Certifications</div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={certInput}
                    onChange={e => setCertInput(e.target.value)}
                    placeholder="e.g. ISO 9001, WBE, MBE"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  />
                  <Button
                    onClick={addCertification}
                    variant="outline"
                    className="whitespace-nowrap"
                  >
                    Add
                  </Button>
                </div>
                {settings.certifications && settings.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {settings.certifications.map((cert, idx) => (
                      <div key={idx} className="bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 text-xs text-indigo-700 flex items-center gap-2">
                        {cert}
                        <button
                          onClick={() => removeCertification(idx)}
                          className="ml-1 text-indigo-600 hover:text-indigo-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-4">Invoice Details</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Standard Payment Terms</label>
                  <Input
                    value={settings.invoiceTerms}
                    onChange={e => handleChange('invoiceTerms', e.target.value)}
                    placeholder="e.g. Net 30, Due upon receipt"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Footer Text</label>
                  <Textarea
                    value={settings.invoiceFooter}
                    onChange={e => handleChange('invoiceFooter', e.target.value)}
                    placeholder="Thank you for your business! Please call with any questions."
                    className="h-24"
                  />
                </div>
              </div>
            </div>

            {/* SMS Reminders */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-1">Automated SMS Reminders</div>
              <p className="text-xs text-gray-500 mb-4">Daily return reminders are sent Mon–Sat at 8am ET to customers with equipment due today or tomorrow.</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-700">Return Reminder SMS</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {settings.smsRemindersEnabled !== false ? '✓ Active — reminders will be sent automatically' : '✗ Paused — no reminders will be sent'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('smsRemindersEnabled', settings.smsRemindersEnabled === false ? true : false)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                    settings.smsRemindersEnabled !== false ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform mt-0.5 ${
                      settings.smsRemindersEnabled !== false ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Payment Processing */}
            <PaymentSettingsPanel />

            {/* Branding & Theme */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-2">Branding & Theme</div>
              <p className="text-xs text-gray-500 mb-4">Customize colors and theme for the internal staff application.</p>
              <button
                onClick={() => navigate('/branding')}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                🎨 Edit Colors & Theme →
              </button>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pb-8">
              <Button
                onClick={handleSave}
                disabled={saving}
                className={saved ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}
              >
                <Save className="w-4 h-4 mr-2" />
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}