import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Loader2, Building2, Download } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PaymentSettingsPanel from '@/components/settings/PaymentSettingsPanel';
import HardwareDiagnostic from '@/components/settings/HardwareDiagnostic';
import { rentalDayModeLabel } from '@/lib/rentalDayCalc';

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
    autoAssignInvoiceNumbers: true,
    invoiceNumberStart: 1001,
    invoiceNumberPrefix: 'MCL',
    smsRemindersEnabled: true,
    rentalDayMode: 'clock_hour',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [certInput, setCertInput] = useState('');
  const [alertPhoneInput, setAlertPhoneInput] = useState('');
  const [alertEmailInput, setAlertEmailInput] = useState('');

  const phoneToE164 = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    // Already E.164 or partial — store as-is
    return raw.trim();
  };

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
      autoAssignInvoiceNumbers: settings.autoAssignInvoiceNumbers !== false,
      invoiceNumberStart: parseInt(settings.invoiceNumberStart) || 1001,
      invoiceNumberPrefix: settings.invoiceNumberPrefix || 'MCL',
      smsRemindersEnabled: settings.smsRemindersEnabled !== false,
      rentalDayMode: settings.rentalDayMode || 'clock_hour',
    };

    payload.geofenceAlertPhones = settings.geofenceAlertPhones || [];
    payload.geofenceAlertEmails = settings.geofenceAlertEmails || [];
    payload.demoModeEnabled = settings.demoModeEnabled === true;
    payload.demoBranch = settings.demoBranch || '';

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
      <AppPageHeader
        title="Company Settings"
        subtitle="Configure company info and invoice branding"
        icon={Building2}
      />

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

            {/* Invoice Numbering — managed per branch in Branch Settings */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-1">Invoice Numbering</div>
              <p className="text-xs text-gray-500 mb-3">Invoice numbers are automatically assigned per branch at the time of first save (quote or contract). Each branch maintains its own sequence and prefix.</p>
              <button
                onClick={() => navigate('/branch-settings')}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                🏢 Configure per-branch prefix & starting number →
              </button>
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

            {/* Rental Day Billing Mode */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-1">Rental Day Billing Mode</div>
              <p className="text-xs text-gray-500 mb-4">
                Controls how billable days are counted. <strong>24-Hour Rolling</strong> starts the clock at pickup time — a customer who picks up at 2 pm is billed a new day at 2 pm each subsequent day.
                <br /><strong>Calendar Day</strong> resets at midnight regardless of pickup hour.
              </p>
              <div className="space-y-2">
                {['clock_hour', 'calendar_day'].map(mode => (
                  <label key={mode} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="rentalDayMode"
                      value={mode}
                      checked={(settings.rentalDayMode || 'clock_hour') === mode}
                      onChange={() => handleChange('rentalDayMode', mode)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{rentalDayModeLabel(mode)}</div>
                      {mode === 'clock_hour' && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Pickup at 2 pm → Day 2 starts at 2 pm · Day 3 at 2 pm · etc.
                        </div>
                      )}
                      {mode === 'calendar_day' && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Any pickup time → new day starts at midnight. Mon pickup = Mon + Tue + Wed if returned Wed.
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Geofence Alert Contacts */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-1">🚨 Geofence Breach Alert Contacts</div>
              <p className="text-xs text-gray-500 mb-4">
                When a GPS geofence breach is detected, SMS and email alerts will be sent to everyone listed here.
                Phone numbers must be in E.164 format (e.g. +12105551234).
              </p>

              {/* SMS phones */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">SMS Alert Numbers</label>
                <div className="flex gap-2 mb-2">
                  <Input
                   value={alertPhoneInput}
                   onChange={e => setAlertPhoneInput(e.target.value)}
                   placeholder="+12105551234"
                   onKeyDown={e => {
                     if (e.key === 'Enter') {
                       e.preventDefault();
                       const val = phoneToE164(alertPhoneInput.trim());
                       if (val) {
                         setSettings(prev => ({ ...prev, geofenceAlertPhones: [...(prev.geofenceAlertPhones || []), val] }));
                         setAlertPhoneInput('');
                       }
                     }
                   }}
                  />
                  <Button variant="outline" onClick={() => {
                   const val = phoneToE164(alertPhoneInput.trim());
                   if (val) {
                     setSettings(prev => ({ ...prev, geofenceAlertPhones: [...(prev.geofenceAlertPhones || []), val] }));
                     setAlertPhoneInput('');
                   }
                  }}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(settings.geofenceAlertPhones || []).map((phone, i) => (
                    <div key={i} className="bg-orange-50 border border-orange-200 rounded-full px-3 py-1 text-xs text-orange-800 flex items-center gap-2">
                      📱 {phone}
                      <button onClick={() => setSettings(prev => ({ ...prev, geofenceAlertPhones: prev.geofenceAlertPhones.filter((_, j) => j !== i) }))} className="text-orange-500 hover:text-orange-700">×</button>
                    </div>
                  ))}
                  {(settings.geofenceAlertPhones || []).length === 0 && (
                    <span className="text-xs text-gray-400">No SMS recipients configured</span>
                  )}
                </div>
              </div>

              {/* Alert emails */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Email Alert Recipients</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={alertEmailInput}
                    onChange={e => setAlertEmailInput(e.target.value)}
                    placeholder="manager@yourcompany.com"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = alertEmailInput.trim();
                        if (val) {
                          setSettings(prev => ({ ...prev, geofenceAlertEmails: [...(prev.geofenceAlertEmails || []), val] }));
                          setAlertEmailInput('');
                        }
                      }
                    }}
                  />
                  <Button variant="outline" onClick={() => {
                    const val = alertEmailInput.trim();
                    if (val) {
                      setSettings(prev => ({ ...prev, geofenceAlertEmails: [...(prev.geofenceAlertEmails || []), val] }));
                      setAlertEmailInput('');
                    }
                  }}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(settings.geofenceAlertEmails || []).map((email, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-full px-3 py-1 text-xs text-red-800 flex items-center gap-2">
                      ✉️ {email}
                      <button onClick={() => setSettings(prev => ({ ...prev, geofenceAlertEmails: prev.geofenceAlertEmails.filter((_, j) => j !== i) }))} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  ))}
                  {(settings.geofenceAlertEmails || []).length === 0 && (
                    <span className="text-xs text-gray-400">No email recipients configured (defaults to dispatch@lupine.rental)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Demo Mode */}
            <div className="bg-white rounded-xl border-2 border-amber-300 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🎭</span>
                <div className="font-semibold text-gray-900">Demo Mode</div>
                <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${settings.demoModeEnabled ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  {settings.demoModeEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                When ON, a visible DEMO watermark appears across the app so prospects know they're in a sandbox.
                Turn OFF during active development. Turn ON when showing the platform to a prospect.
              </p>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-medium text-gray-700">Demo Mode Banner</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {settings.demoModeEnabled ? '⚠️ Active — demo watermark is visible to all users' : '✓ Off — normal operation'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('demoModeEnabled', !settings.demoModeEnabled)}
                  className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                    settings.demoModeEnabled ? 'bg-amber-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform mt-0.5 ${
                      settings.demoModeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
              {settings.demoModeEnabled && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lock to Demo Branch (optional)</label>
                  <Input
                    value={settings.demoBranch || ''}
                    onChange={e => handleChange('demoBranch', e.target.value)}
                    placeholder="e.g. 01 McAllen"
                  />
                  <p className="text-xs text-gray-400 mt-1">If set, all demo users are auto-locked to this branch.</p>
                </div>
              )}
            </div>

            {/* Hardware Diagnostic */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <HardwareDiagnostic />
            </div>

            {/* Pen Tablet Setup */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">✏️</span>
                <div className="font-semibold text-gray-900">Pen Tablet Setup (XP-Pen)</div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Download a pre-configured XP-Pen settings file optimized for the signature pad on a multi-display setup.
                Import it via the XP-Pen driver app: <strong>Settings → Import Config</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1 mb-4">
                <p className="font-semibold">What this config does:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                  <li>Maps pen to Display 1 (your staff-facing monitor)</li>
                  <li>Enables pressure sensitivity for natural signature feel</li>
                  <li>Disables hover tilt to prevent accidental marks</li>
                  <li>Sets pen buttons to right-click + middle-click</li>
                </ul>
                <p className="text-blue-600 pt-1">After import, go to <strong>Work Area</strong> tab and confirm the correct monitor is selected for your setup.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const config = {
                    version: "3.4.6",
                    deviceName: "XP-Pen",
                    exportedBy: "Lupine Equipment Rentals",
                    exportedAt: new Date().toISOString(),
                    workArea: {
                      screenMapping: "display_1",
                      areaType: "full_screen",
                      rotation: 0
                    },
                    pen: {
                      pressureCurve: "medium",
                      pressureSensitivity: 7,
                      hoverHeight: 5,
                      tiltEnabled: false,
                      buttons: [
                        { button: 1, action: "right_click" },
                        { button: 2, action: "middle_click" }
                      ]
                    },
                    expressKeys: [],
                    touch: { enabled: false }
                  };
                  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'lupine-xppen-config.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download XP-Pen Config
              </button>
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