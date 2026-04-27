import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneUS } from '@/lib/phoneUtils';

const BRANCHES = [
  '01 McAllen',
  '02 Weslaco',
  '03 Harlingen',
  '05 Brownsville',
  '06 Corpus',
  '98 Shop',
  '99 Warehouse',
];

const DEFAULT_PREFIXES = {
  '01 McAllen':    'MCL',
  '02 Weslaco':    'WES',
  '03 Harlingen':  'HRL',
  '05 Brownsville':'BRN',
  '06 Corpus':     'CRP',
  '98 Shop':       'SHP',
  '99 Warehouse':  'WRH',
};

export default function BranchSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});   // branch -> { id?, prefix, nextNumber, address, phone, email }
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BranchSettings.list().then(records => {
      const map = {};
      records.forEach(r => {
        map[r.branch] = {
          id: r.id,
          prefix: r.invoicePrefix || DEFAULT_PREFIXES[r.branch] || '',
          nextNumber: r.nextInvoiceNumber ?? 1000,
          address: r.address || '',
          phone: r.phone || '',
          email: r.email || '',
        };
      });
      // Fill in any branches not yet configured
      BRANCHES.forEach(b => {
        if (!map[b]) map[b] = { id: null, prefix: DEFAULT_PREFIXES[b] || '', nextNumber: 1000, address: '', phone: '', email: '' };
      });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const handleChange = (branch, field, value) => {
    setSettings(prev => ({ ...prev, [branch]: { ...prev[branch], [field]: value } }));
  };

  const handleSave = async (branch) => {
    const s = settings[branch];
    setSaving(prev => ({ ...prev, [branch]: true }));
    const payload = {
      branch,
      invoicePrefix: s.prefix,
      nextInvoiceNumber: parseInt(s.nextNumber) || 1000,
      address: s.address,
      phone: s.phone,
      email: s.email,
    };
    if (s.id) {
      await base44.entities.BranchSettings.update(s.id, payload);
    } else {
      const created = await base44.entities.BranchSettings.create(payload);
      setSettings(prev => ({ ...prev, [branch]: { ...prev[branch], id: created.id } }));
    }
    setSaving(prev => ({ ...prev, [branch]: false }));
    setSaved(prev => ({ ...prev, [branch]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [branch]: false })), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-3xl mx-auto">
          <button onClick={() => navigate('/availability')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Branch Invoice Settings</div>
            <div className="text-indigo-300 text-xs">Configure invoice numbering per branch</div>
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
            <p className="text-sm text-gray-500">
              Each invoice number is formatted as <strong>PREFIX-NNNN</strong> (e.g. <strong>MCL-1042</strong>).
              The counter auto-increments with each confirmed invoice.
            </p>

            {BRANCHES.map(branch => {
              const s = settings[branch] || { prefix: '', nextNumber: 1000, address: '', phone: '', email: '' };
              const preview = `${s.prefix || '???'}-${String(s.nextNumber || 1000).padStart(4, '0')}`;
              return (
                <div key={branch} className="bg-white rounded-xl border shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-semibold text-gray-900">{branch}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Next invoice: <span className="font-mono font-medium text-indigo-600">{preview}</span></div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(branch)}
                      disabled={saving[branch]}
                      className={saved[branch] ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {saved[branch] ? 'Saved!' : saving[branch] ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Prefix</label>
                        <Input
                          value={s.prefix}
                          onChange={e => handleChange(branch, 'prefix', e.target.value.toUpperCase().slice(0, 6))}
                          placeholder="e.g. MCL"
                          className="font-mono uppercase"
                          maxLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Next Invoice Number</label>
                        <Input
                          type="number"
                          min="1"
                          value={s.nextNumber}
                          onChange={e => handleChange(branch, 'nextNumber', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="text-xs font-semibold text-gray-700 mb-3">Contact Information</div>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                          <Input
                            value={s.address}
                            onChange={e => handleChange(branch, 'address', e.target.value)}
                            placeholder="Street address"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                            <Input
                              value={s.phone}
                              onChange={e => handleChange(branch, 'phone', formatPhoneUS(e.target.value))}
                              placeholder="(956) 123-4567"
                              inputMode="numeric"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                            <Input
                              type="email"
                              value={s.email}
                              onChange={e => handleChange(branch, 'email', e.target.value)}
                              placeholder="branch@example.com"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}