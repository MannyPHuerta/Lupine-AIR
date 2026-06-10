import { useState, useEffect } from 'react';
import { supabaseData } from '@/lib/supabaseData';
import { useNavigate } from 'react-router-dom';
import { Save, Upload, Loader2, Building2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import PaymentSettingsPanel from '@/components/settings/PaymentSettingsPanel';
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
    lateFeesEnabled: false,
    lateFeePerDay: 0,
    lateFeePenaltyRate: 0,
    lateFeeGracePeriod: 0,
    lateFeeMaxCap: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [certInput, setCertInput] = useState('');
  const [alertPhoneInput, setAlertPhoneInput] = useState('');
  const [alertEmailInput, setAlertEmailInput] = useState('');
  const [fraudPhoneInput, setFraudPhoneInput] = useState('');
  const [fraudEmailInput, setFraudEmailInput] = useState('');

  const phoneToE164 = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    // Already E.164 or partial — store as-is
    return raw.trim();
  };

  useEffect(() => {
    supabaseData.CompanySettings.list().then(records => {
      if (records.length > 0) {
        setSettings(records[0]);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await supabaseData.uploadFile(file);
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
      lateFeesEnabled: settings.lateFeesEnabled === true,
      lateFeePerDay: parseFloat(settings.lateFeePerDay) || 0,
      lateFeePenaltyRate: parseFloat(settings.lateFeePenaltyRate) || 0,
      lateFeeGracePeriod: parseInt(settings.lateFeeGracePeriod) || 0,
      lateFeeMaxCap: parseFloat(settings.lateFeeMaxCap) || 0,
    };

    payload.geofenceAlertPhones = settings.geofenceAlertPhones || [];
    payload.geofenceAlertEmails = settings.geofenceAlertEmails || [];
    payload.fraudAlertPhones = settings.fraudAlertPhones || [];
    payload.fraudAlertEmails = settings.fraudAlertEmails || [];
    payload.demoModeEnabled = settings.demoModeEnabled === true;
    payload.demoBranch = settings.demoBranch || '';
    payload.storeMode = settings.storeMode || 'both';
    payload.storeIntentStyle = settings.storeIntentStyle || 'split_screen';

    if (settings.id) {
      await supabaseData.CompanySettings.update(settings.id, payload);
    } else {
      const created = await supabaseData.CompanySettings.create(payload);
      setSettings(prev => ({ ...prev, id: created.id }));
    }

    setSaving(false);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Company Settings"
        subtitle="Configure company info and invoice branding"
        icon={Building2}
      />

      {dirty && (
        <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between shadow-sm">
          <span className="text-sm text-amber-800 font-medium">⚠️ You have unsaved changes</span>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Saving…' : 'Save Now'}
          </Button>
        </div>
      )}

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

            {/* Late Fees */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-1">💰 Late Fee Calculation</div>
              <p className="text-xs text-gray-500 mb-4">
                Automated late fees accrue daily for overdue rentals. A daily automation runs at 6am to update all overdue rentals.
              </p>
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <div className="text-sm font-medium text-gray-700">Enable Late Fees (Master Switch)</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {settings.lateFeesEnabled ? '✓ Active — late fees will be calculated daily' : '✗ Disabled — no late fees will be charged'}
                  </div>
                </div>
                <Switch
                  checked={settings.lateFeesEnabled}
                  onCheckedChange={(checked) => handleChange('lateFeesEnabled', checked)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Flat Late Fee Per Day (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.lateFeePerDay}
                    onChange={e => handleChange('lateFeePerDay', parseFloat(e.target.value) || 0)}
                    placeholder="10.00"
                  />
                  <p className="text-xs text-gray-400 mt-1">Fixed amount charged per day late</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Penalty Rate (% of daily rate)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings.lateFeePenaltyRate * 100}
                    onChange={e => handleChange('lateFeePenaltyRate', (parseFloat(e.target.value) || 0) / 100)}
                    placeholder="10"
                  />
                  <p className="text-xs text-gray-400 mt-1">Percentage of equipment daily rate</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grace Period (Days)</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={settings.lateFeeGracePeriod}
                    onChange={e => handleChange('lateFeeGracePeriod', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-400 mt-1">Days before fees start accruing (0 = immediate)</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Maximum Late Fee Cap (USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={settings.lateFeeMaxCap}
                    onChange={e => handleChange('lateFeeMaxCap', parseFloat(e.target.value) || 0)}
                    placeholder="0 = no cap"
                  />
                  <p className="text-xs text-gray-400 mt-1">0 = unlimited, set max to cap total fees</p>
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

            {/* Fraud Alert Contacts */}
            <div className="bg-white rounded-xl border-2 border-red-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🕵️</span>
                <div className="font-semibold text-gray-900">Real-Time Fraud Alert Contacts</div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                These contacts receive <strong>immediate</strong> SMS + email the moment a fraud signal is detected at any branch:
                no-invoice active rentals, blacklisted customers, deep discounts (&gt;30%), and cancel+resell patterns.
                Every alert names the responsible employee. These contacts also receive the daily 7:30am briefing SMS.
              </p>

              {/* SMS phones */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">SMS Alert Numbers (E.164 format)</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={fraudPhoneInput}
                    onChange={e => setFraudPhoneInput(e.target.value)}
                    placeholder="+12105551234"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = phoneToE164(fraudPhoneInput.trim());
                        if (val) {
                          setSettings(prev => ({ ...prev, fraudAlertPhones: [...(prev.fraudAlertPhones || []), val] }));
                          setFraudPhoneInput('');
                          setDirty(true);
                        }
                      }
                    }}
                  />
                  <Button variant="outline" onClick={() => {
                    const val = phoneToE164(fraudPhoneInput.trim());
                    if (val) {
                      setSettings(prev => ({ ...prev, fraudAlertPhones: [...(prev.fraudAlertPhones || []), val] }));
                      setFraudPhoneInput('');
                      setDirty(true);
                    }
                  }}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(settings.fraudAlertPhones || []).map((phone, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-full px-3 py-1 text-xs text-red-800 flex items-center gap-2">
                      📱 {phone}
                      <button onClick={() => { setSettings(prev => ({ ...prev, fraudAlertPhones: prev.fraudAlertPhones.filter((_, j) => j !== i) })); setDirty(true); }} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  ))}
                  {(settings.fraudAlertPhones || []).length === 0 && (
                    <span className="text-xs text-gray-400 italic">No SMS numbers configured — alerts will not fire</span>
                  )}
                </div>
              </div>

              {/* Email recipients */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">Email Alert Recipients</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={fraudEmailInput}
                    onChange={e => setFraudEmailInput(e.target.value)}
                    placeholder="owner@rentalworld.com"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = fraudEmailInput.trim();
                        if (val) {
                          setSettings(prev => ({ ...prev, fraudAlertEmails: [...(prev.fraudAlertEmails || []), val] }));
                          setFraudEmailInput('');
                          setDirty(true);
                        }
                      }
                    }}
                  />
                  <Button variant="outline" onClick={() => {
                    const val = fraudEmailInput.trim();
                    if (val) {
                      setSettings(prev => ({ ...prev, fraudAlertEmails: [...(prev.fraudAlertEmails || []), val] }));
                      setFraudEmailInput('');
                      setDirty(true);
                    }
                  }}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(settings.fraudAlertEmails || []).map((email, i) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-full px-3 py-1 text-xs text-red-800 flex items-center gap-2">
                      ✉️ {email}
                      <button onClick={() => { setSettings(prev => ({ ...prev, fraudAlertEmails: prev.fraudAlertEmails.filter((_, j) => j !== i) })); setDirty(true); }} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  ))}
                  {(settings.fraudAlertEmails || []).length === 0 && (
                    <span className="text-xs text-gray-400 italic">No email recipients configured</span>
                  )}
                </div>
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

            {/* Pen Tablet Setup */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">✏️</span>
                <div className="font-semibold text-gray-900">Pen Tablet Setup (XP-Pen)</div>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Use the XP-Pen driver's built-in screen mapping to define exactly which monitor and area the tablet maps to. No software configuration needed on this side.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-2">
                <p className="font-semibold text-sm">One-time setup in the XP-Pen driver:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-blue-800">
                  <li>Open the <strong>XP-Pen driver</strong> app (system tray icon)</li>
                  <li>Click the <strong>Work Area</strong> tab</li>
                  <li>Under <strong>Screen Area</strong>, select the monitor where the signature box appears</li>
                  <li>Optionally drag the <strong>tablet active area</strong> to match the portion of the monitor you want to use</li>
                  <li>Click <strong>Apply</strong> — the pen will now map directly to that screen region</li>
                </ol>
                <p className="text-blue-600 pt-1">
                  💡 If customers sign on a second monitor, make sure to select <strong>that monitor</strong> in Step 3.
                  The tablet will then translate pen movement 1-to-1 with what's on screen.
                </p>
              </div>
            </div>

            {/* Online Store Settings */}
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="font-semibold text-gray-900 mb-1">🛒 Online Store Mode</div>
              <p className="text-xs text-gray-500 mb-4">
                Controls which rental tracks appear in the public-facing self-service store.
              </p>
              <div className="space-y-2">
                {[
                  { value: 'both', label: 'Construction & Events', desc: 'Customers choose their track at entry — jobsite equipment catalog or event quote flow' },
                  { value: 'construction_only', label: 'Construction / Jobsite Only', desc: 'Hides event track entirely — no intent modal, no event banner' },
                  { value: 'events_only', label: 'Events Only', desc: 'Skips the equipment catalog — redirects all visitors straight to the event quote flow' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition">
                    <input
                      type="radio"
                      name="storeMode"
                      value={opt.value}
                      checked={(settings.storeMode || 'both') === opt.value}
                      onChange={() => handleChange('storeMode', opt.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Intent Chooser Style — only relevant when storeMode is 'both' */}
            {(settings.storeMode || 'both') === 'both' && (
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <div className="font-semibold text-gray-900 mb-1">🎨 Welcome Screen Style</div>
                <p className="text-xs text-gray-500 mb-4">
                  When a new visitor opens the store, they'll see this screen to choose between Construction or Events.
                </p>
                <div className="space-y-2">
                  {[
                    { value: 'split_screen', label: 'Bold Split-Screen', desc: 'Two full-height cinematic panels side by side — dramatic photo backgrounds, large headlines' },
                    { value: 'card_tiles', label: 'Card Tiles on Dark', desc: 'Dark background with two large rounded photo cards — sleek, modern, high-contrast' },
                    { value: 'warm_welcome', label: 'Warm Welcome', desc: 'Clean white modal with emoji icons — light, friendly, and mobile-first' },
                    { value: 'immersive', label: 'Immersive Full-Screen', desc: 'Frosted-glass panels over a blurred split photo — premium, resort-booking feel' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 transition">
                      <input
                        type="radio"
                        name="storeIntentStyle"
                        value={opt.value}
                        checked={(settings.storeIntentStyle || 'split_screen') === opt.value}
                        onChange={() => handleChange('storeIntentStyle', opt.value)}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-800">{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

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