import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2, Building2, MapPin, CheckCircle, ChevronRight, ChevronLeft, Zap } from 'lucide-react';

const STEPS = ['Company', 'Branch', 'Plan', 'Done'];

const PLAN_OPTIONS = [
  {
    id: 'starter',
    name: 'Core',
    price: '$299/mo',
    description: 'Essential rental operations with AI included. One location, unlimited users.',
    features: ['1 Branch', 'Counter & Rentals', 'AIRental + AIEvents', 'AIReports', 'Email & SMS'],
    color: 'border-slate-300',
    badge: '',
  },
  {
    id: 'professional',
    name: 'Pro',
    price: '$799/mo',
    description: 'Multi-location operations with shop management, GPS tracking, and advanced analytics.',
    features: ['Up to 3 Branches', 'All AI Modules', 'AIRepair + AIRecovery', 'GPS Tracking', 'Priority Support'],
    color: 'border-blue-500',
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Custom',
    price: '$1,499/mo',
    description: 'Regional operations with government bidding, load planning, and dedicated support.',
    features: ['Up to 10 Branches', 'AIRfq + AIRoads', 'Advanced Maintenance', 'Account Manager & SLA'],
    color: 'border-purple-500',
    badge: '',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingTenant, setExistingTenant] = useState(null);
  const [checkingTenant, setCheckingTenant] = useState(true);

  // Check if user already has a tenant on mount — redirect immediately before showing form
  useEffect(() => {
    const checkExistingTenant = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setCheckingTenant(false);
          return;
        }

        // Use Vercel API with service role to bypass RLS — no CORS issues
        console.log('[Onboarding] Calling resolveMyTenant API...');
        const res = await fetch('/api/resolveMyTenant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const result = await res.json();
          console.log('[Onboarding] resolveMyTenant result:', result);
          if (result.tenant?.slug) {
            console.log('[Onboarding] Redirecting to tenant:', result.tenant.slug);
            window.location.replace(`https://${result.tenant.slug}.theprojectair.com`);
            return;
          }
        }

        console.log('[Onboarding] No tenant found - showing onboarding form');
        setCheckingTenant(false);
      } catch (err) {
        console.error('[Onboarding] Error checking tenant:', err);
        setCheckingTenant(false);
      }
    };
    checkExistingTenant();
  }, []);

  // Step 0 — Company
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('both');
  const [phone, setPhone] = useState('');

  // Step 1 — Branch
  const [branchName, setBranchName] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchEmail, setBranchEmail] = useState('');

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  };

  // Step 2 — Plan
  const [planTier, setPlanTier] = useState('pro');

  const canNextStep0 = companyName.trim().length >= 2;
  const canNextStep1 = branchName.trim().length >= 2;

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in. Please sign in first.');

      // Early check: if tenant already exists, redirect immediately
      try {
        const checkRes = await fetch('/api/resolveMyTenant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        if (checkRes.ok) {
          const result = await checkRes.json();
          if (result.tenant?.slug) {
            console.log('[Onboarding] early redirect — tenant exists:', result.tenant.slug);
            window.location.replace(`https://${result.tenant.slug}.theprojectair.com`);
            return;
          }
        }
      } catch (e) {
        console.warn('[Onboarding] early resolve check failed:', e);
      }

      const res = await fetch('/api/provisionTenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          industry,
          phone: phone.trim(),
          branchName: branchName.trim(),
          invoicePrefix: invoicePrefix.trim().toUpperCase(),
          branchAddress: branchAddress.trim(),
          branchPhone: branchPhone.trim(),
          branchEmail: branchEmail.trim(),
          planTier,
        }),
      });

      const text = await res.text();
      console.log('Raw response:', res.status, text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned invalid JSON (${res.status}): ${text.slice(0, 300)}`);
      }
      
      if (!res.ok) {
        if (res.status === 409 && data.tenantId) {
          throw new Error('Tenant already provisioned. Please sign in to access your workspace.');
        }
        throw new Error(data.error || 'Provisioning failed');
      }

      // If this is a demo signup, seed demo data
      const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
      if (isDemo) {
        try {
          await supabase.functions.invoke('seedDemoData', { body: { branchName: branchName.trim() } });
        } catch (seedErr) {
          console.warn('Demo seeding failed:', seedErr);
        }
      }

      setStep(3); // Done
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Show redirect screen if tenant already exists
  if (existingTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Workspace Already Active</h1>
          <p className="text-gray-500 text-sm">
            Your account is already set up for <strong>{existingTenant.name || existingTenant.slug}</strong>.
          </p>
          <button
            onClick={() => window.location.replace(`https://${existingTenant.slug}.theprojectair.com`)}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition"
          >
            Go to Your Workspace →
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Or <a href="/ops" className="underline hover:text-gray-600">sign in again</a> to be redirected automatically.
          </p>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-gray-900">You're all set!</h1>
          <p className="text-gray-500 text-sm">
            Your 14-day free trial has started. Your first branch <strong>{branchName}</strong> is ready to go.
          </p>
          <button
            onClick={async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                const res = await fetch('/api/resolveMyTenant', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                });
                if (res.ok) {
                  const result = await res.json();
                  if (result.tenant?.slug) {
                    window.location.replace(`https://${result.tenant.slug}.theprojectair.com`);
                    return;
                  }
                }
              }
              window.location.replace('/ops');
            }}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition"
          >
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // Show loading while checking for existing tenant
  if (checkingTenant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-slate-600 font-medium">Checking your account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">

        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-gray-900">AIR Setup</div>
              <div className="text-xs text-gray-400">Step {step + 1} of {STEPS.length - 1}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5 mb-6">
            {STEPS.slice(0, 3).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </div>

        <div className="px-8 pb-8 space-y-5">

          {/* Step 0 — Company Info */}
          {step === 0 && (
            <>
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" /> Tell us about your company
                </h2>
                <p className="text-sm text-gray-500 mt-1">This sets up your account identity.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Company Name *</label>
                  <input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Equipment Rentals"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Primary Phone</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Industry Focus</label>
                  <select
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="both">Both Construction & Events</option>
                    <option value="construction">Construction Equipment Only</option>
                    <option value="events">Events & Party Rental Only</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Step 1 — First Branch */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" /> Set up your first branch
                </h2>
                <p className="text-sm text-gray-500 mt-1">You can add more branches later from settings.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Name *</label>
                  <input
                    value={branchName}
                    onChange={e => {
                      setBranchName(e.target.value);
                      if (!invoicePrefix) setInvoicePrefix(e.target.value.slice(0, 3).toUpperCase());
                    }}
                    placeholder="01 Main Branch"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Prefix</label>
                  <input
                    value={invoicePrefix}
                    onChange={e => setInvoicePrefix(e.target.value.toUpperCase().slice(0, 5))}
                    placeholder="MCL"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Up to 5 characters. Used for invoice numbers, e.g. MCL-1001</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                  <input
                    value={branchAddress}
                    onChange={e => setBranchAddress(e.target.value)}
                    placeholder="123 Main St, City, TX 78501"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Phone</label>
                    <input
                      value={branchPhone}
                      onChange={e => setBranchPhone(formatPhone(e.target.value))}
                      placeholder="(555) 000-0000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Branch Email</label>
                    <input
                      value={branchEmail}
                      onChange={e => setBranchEmail(e.target.value)}
                      placeholder="branch@company.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2 — Plan */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-xl font-black text-gray-900">Choose your plan</h2>
                <p className="text-sm text-gray-500 mt-1">All plans start with a 14-day free trial. No credit card required.</p>
              </div>
              <div className="space-y-3">
                {PLAN_OPTIONS.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => setPlanTier(plan.id)}
                    className={`w-full text-left border-2 rounded-xl p-4 transition ${
                      planTier === plan.id ? plan.color + ' bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{plan.name}</span>
                        {plan.badge && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{plan.badge}</span>
                        )}
                      </div>
                      <span className="font-black text-gray-900">{plan.price}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {plan.features.map(f => (
                        <li key={f} className="text-[11px] bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">{f}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < 2 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={(step === 0 && !canNextStep0) || (step === 1 && !canNextStep1)}
                className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Start Free Trial</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
