import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';

const PLANS = {
  core: { name: 'AIR Core', price: '$299/mo', description: '1 branch, unlimited users, full AI suite.' },
  pro:  { name: 'AIR Pro',  price: '$799/mo', description: 'Up to 3 branches, shop management, GPS tracking.' },
};

export default function OpsLanding() {
  const [phase, setPhase] = useState('loading'); // loading | demo | redirecting | error
  const [session, setSession] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    // Supabase auto-consumes the #access_token hash on mount because
    // detectSessionInUrl: true is set on the client.
    const init = async () => {
      // Small delay to let Supabase parse the URL hash
      await new Promise(r => setTimeout(r, 500));

      const { data: { session: s }, error } = await supabase.auth.getSession();

      if (error || !s) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('checkout') === 'success') {
          // Came back from Stripe — re-check session
          setPhase('demo');
          return;
        }
        setErrorMsg('Your sign-in link has expired or is invalid. Please request a new one.');
        setPhase('error');
        return;
      }

      setSession(s);

      // Clean the hash/tokens out of the URL
      window.history.replaceState({}, '', '/ops');

      // Check if this user already has an active subscription with a provisioned URL
      const { data: trial } = await supabase
        .from('subscriber_trials')
        .select('status, tenant_id, stripe_subscription_id')
        .eq('email', s.user.email)
        .maybeSingle();

      if (trial?.status === 'active' && trial?.tenant_id) {
        // Look up provisioned URL on the tenant record
        const { data: tenant } = await supabase
          .from('tenants')
          .select('slug, status')
          .eq('id', trial.tenant_id)
          .maybeSingle();

        if (tenant) {
          setPhase('redirecting');
          setTimeout(() => {
            window.location.replace(`https://${tenant.slug}.theprojectair.com`);
          }, 1500);
          return;
        }
      }

      // No active subscription — show demo + subscribe CTA
      setPhase('demo');
    };

    init();
  }, []);

  const handleSubscribe = async (tier) => {
    if (!session) return;
    setCheckoutLoading(tier);
    try {
      const response = await base44.functions.invoke('subscriptionCheckout', {
        tier,
        supabaseUserId: session.user.id,
        email: session.user.email,
        successUrl: 'https://theprojectair.com/ops?checkout=success',
        cancelUrl: 'https://theprojectair.com/ops?checkout=cancelled',
      });
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (e) {
      console.error('[OpsLanding] checkout error:', e);
    }
    setCheckoutLoading(null);
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Verifying your access…</p>
        </div>
      </div>
    );
  }

  if (phase === 'redirecting') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
          <p className="text-white font-semibold text-lg">You're all set!</p>
          <p className="text-slate-400 text-sm">Redirecting you to your AIR workspace…</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-white font-semibold text-lg">Access link invalid</p>
          <p className="text-slate-400 text-sm">{errorMsg}</p>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => window.location.replace('/')}
          >
            Back to home
          </Button>
        </div>
      </div>
    );
  }

  // phase === 'demo'
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">AIR</span>
          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30 ml-2">
            Demo Mode
          </span>
        </div>
        {session && (
          <span className="text-slate-400 text-sm">{session.user.email}</span>
        )}
      </div>

      {/* Demo notice banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-center">
        <p className="text-amber-300 text-sm">
          You're exploring AIR with demo data. Subscribe to launch your own workspace with live data.
        </p>
      </div>

      {/* Demo app iframe */}
      <div className="flex" style={{ height: 'calc(100vh - 120px)' }}>
        <iframe
          src="https://theprojectair.com/daily-ops-demo"
          className="flex-1 border-0"
          title="AIR Demo"
          onError={() => {
            // Fallback if demo iframe isn't available yet
          }}
        />

        {/* Subscribe sidebar */}
        <div className="w-80 border-l border-slate-800 bg-slate-900 p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <h2 className="font-bold text-lg mb-1">Unlock Your Workspace</h2>
            <p className="text-slate-400 text-sm">
              Choose a plan to provision your own secure, isolated AIR environment.
            </p>
          </div>

          {Object.entries(PLANS).map(([tier, plan]) => (
            <div key={tier} className="border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-blue-400 font-bold text-lg">{plan.price}</div>
                </div>
                {tier === 'pro' && (
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs">{plan.description}</p>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
                disabled={!!checkoutLoading}
                onClick={() => handleSubscribe(tier)}
              >
                {checkoutLoading === tier ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                ) : (
                  `Subscribe — ${plan.price}`
                )}
              </Button>
            </div>
          ))}

          <p className="text-slate-500 text-xs text-center">
            No credit card required for your current 14-day trial.
            Subscribe before your trial ends to keep full Pro access.
          </p>
        </div>
      </div>
    </div>
  );
}