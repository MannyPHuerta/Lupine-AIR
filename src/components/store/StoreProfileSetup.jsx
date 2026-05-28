import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Building2, Phone, User } from 'lucide-react';

export default function StoreProfileSetup({ user, onComplete }) {
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: '',
    companyName: '',
    accountType: 'business',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError('Please enter your name.'); return; }
    if (!form.phone.trim()) { setError('Please enter a phone number.'); return; }
    setError('');
    setSaving(true);

    // Save to User entity via auth.updateMe
    await base44.auth.updateMe({
      full_name: form.full_name,
      phone: form.phone,
      companyName: form.companyName,
      accountType: form.accountType,
      profileComplete: true,
    });

    // Also upsert a Customer record so counter staff can pull them up
    await base44.functions.invoke('upsertCustomer', {
      email: user.email,
      fullName: form.full_name,
      phone: form.phone,
      companyName: form.companyName,
      accountType: form.accountType,
      source: 'portal',
    });

    setSaving(false);
    onComplete({ ...user, ...form, profileComplete: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-5 text-white">
          <div className="text-xl font-bold mb-1">One-time account setup</div>
          <p className="text-orange-100 text-sm">
            We need a few details so our team can have your equipment ready at pickup.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              <User className="w-3.5 h-3.5 inline mr-1" />Your Full Name
            </label>
            <input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="John Smith"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              <Phone className="w-3.5 h-3.5 inline mr-1" />Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="(956) 555-1234"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              <Building2 className="w-3.5 h-3.5 inline mr-1" />Company Name <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              placeholder="ABC Construction LLC"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'business', label: '🏗️ Business' },
                { value: 'individual', label: '👤 Individual' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, accountType: opt.value }))}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition ${
                    form.accountType === opt.value
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Complete Setup & Start Renting'}
          </button>
        </div>
      </div>
    </div>
  );
}