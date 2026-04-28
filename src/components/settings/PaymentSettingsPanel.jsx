import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function PaymentSettingsPanel() {
  const [settings, setSettings] = useState({
    activeProcessor: 'none',
    stripePublishableKey: '',
    stripeApiKey: '',
    quickbooksRealmId: '',
    autoCapture: false,
    sendReceiptEmail: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.PaymentSettings.list().then(records => {
      if (records.length > 0) {
        setSettings(records[0]);
      }
      setLoading(false);
    });
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        activeProcessor: settings.activeProcessor,
        stripePublishableKey: settings.stripePublishableKey,
        stripeApiKey: settings.stripeApiKey,
        quickbooksRealmId: settings.quickbooksRealmId,
        autoCapture: settings.autoCapture,
        sendReceiptEmail: settings.sendReceiptEmail,
      };

      if (settings.id) {
        await base44.entities.PaymentSettings.update(settings.id, payload);
      } else {
        const created = await base44.entities.PaymentSettings.create(payload);
        setSettings(prev => ({ ...prev, id: created.id }));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(`Error saving payment settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-5 h-5 text-indigo-600" />
        <div className="font-semibold text-gray-900">Payment Processing</div>
      </div>

      <div className="space-y-4">
        {/* Active Processor */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Payment Processor</label>
          <select
            value={settings.activeProcessor}
            onChange={e => handleChange('activeProcessor', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="none">Disabled</option>
            <option value="stripe">Stripe</option>
            <option value="quickbooks">QuickBooks</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">Select which payment processor to use</p>
        </div>

        {/* Stripe Settings */}
        {settings.activeProcessor === 'stripe' && (
          <div className="border-t pt-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <strong>Stripe Configuration:</strong> Enter your API keys from your Stripe dashboard.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stripe Publishable Key</label>
              <Input
                type="password"
                value={settings.stripePublishableKey}
                onChange={e => handleChange('stripePublishableKey', e.target.value)}
                placeholder="pk_live_..."
              />
              <p className="text-xs text-gray-400 mt-1">Public key for frontend (safe to expose)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stripe Secret Key</label>
              <Input
                type="password"
                value={settings.stripeApiKey}
                onChange={e => handleChange('stripeApiKey', e.target.value)}
                placeholder="sk_live_..."
              />
              <p className="text-xs text-gray-400 mt-1">Secret key (keep confidential)</p>
            </div>
          </div>
        )}

        {/* QuickBooks Settings */}
        {settings.activeProcessor === 'quickbooks' && (
          <div className="border-t pt-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
              <strong>QuickBooks Configuration:</strong> Connect your QB account via OAuth.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">QuickBooks Realm ID</label>
              <Input
                value={settings.quickbooksRealmId}
                onChange={e => handleChange('quickbooksRealmId', e.target.value)}
                placeholder="1234567890"
              />
              <p className="text-xs text-gray-400 mt-1">Your QuickBooks Company ID</p>
            </div>
            <Button variant="outline" className="w-full text-xs">
              Connect QuickBooks Account
            </Button>
          </div>
        )}

        {/* Common Options */}
        {settings.activeProcessor !== 'none' && (
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-gray-600">Auto-capture Payments</label>
                <p className="text-xs text-gray-400 mt-1">Automatically capture approved charges</p>
              </div>
              <button
                type="checkbox"
                checked={settings.autoCapture}
                onChange={e => handleChange('autoCapture', e.target.checked)}
                className={`relative inline-flex h-5 w-9 rounded-full transition ${
                  settings.autoCapture ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.autoCapture ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                  style={{ marginTop: '2px' }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-gray-600">Send Receipt Email</label>
                <p className="text-xs text-gray-400 mt-1">Email payment receipts to customers</p>
              </div>
              <button
                type="checkbox"
                checked={settings.sendReceiptEmail}
                onChange={e => handleChange('sendReceiptEmail', e.target.checked)}
                className={`relative inline-flex h-5 w-9 rounded-full transition ${
                  settings.sendReceiptEmail ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    settings.sendReceiptEmail ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                  style={{ marginTop: '2px' }}
                />
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving}
            className={saved ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {saved ? 'Saved!' : 'Save Payment Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}