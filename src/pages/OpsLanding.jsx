import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, AlertCircle, Zap, Mail } from 'lucide-react';

const PLANS = {
  core: { name: 'AIR Core', price: '$299/mo', description: '1 branch, unlimited users, full AI suite.' },
  pro:  { name: 'AIR Pro',  price: '$799/mo', description: 'Up to 5 branches, shop management, GPS tracking.' },
  enterprise: { name: 'AIR Enterprise', price: '$1,499/mo', description: 'Unlimited branches, dedicated support, government bidding.' },
};

const ENTERPRISE_BYPASS = ['rental-world'];

async function resolveSession(s, setPhase, setSession) {
  console.log('[OpsLanding] resolveSession — email:', s.user.email);
  setSession(s);
  window.history.replaceState({}, '', '/ops');

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('slug, status, admin_email')
    .eq('admin_email', s.user.email)
    .maybeSingle();
  console.log('[OpsLanding] tenant lookup:', tenant, tenantErr);

  const isBypassed = tenant && ENTERPRISE_BYPASS.includes(tenant.slug);
  const isActive = tenant?.status === 'active';

  if (tenant && (isBypassed || isActive)) {
    setPhase('redirecting');
    setTimeout(() => window.location.replace(`https://${tenant.slug}.theprojectair.com`), 1500);
    return;
  }

  const { data: trial } = await supabase
    .from('subscriber_trials')
    .select('status, tenant_id')
    .eq('email', s.user.email)
    .maybeSingle();

  if (trial?.status === 'active' && trial?.tenant_id) {
    const { data: trialTenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', trial.tenant_id)
      .maybeSingle();
    if (trialTenant) {
      setPhase('redirecting');
      setTimeout(() => window.location.replace(`https://${trialTenant.slug}.theprojectair.com`), 1500);
      return;
    }
  }

  setPhase('demo');
}

export default function OpsLanding() {
  const [phase, setPhase] = useState('loading');
  const [session, setSession] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [signinEmail, setSigninEmail] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);
  const [signinSent, setSigninSent] = useState(false);

  useEffect(() => {
    if (!supabase) {
      console.warn('[OpsLanding] Supabase client is null');
      setPhase('signin');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    let settled = false;

    const finish = async (s) => {
      if (settled) return;
      settled = true;
      await resolveSession(s, setPhase, setSession);
    };

    // Handle hash-based tokens: #access_token=... (standard Supabase implicit flow)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken) {
      console.log('[OpsLanding] detected hash-based access_token — setting session');
      window.history.replaceState({}, '', '/ops');
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        .then(({ data, error }) => {
          console.log('[OpsLanding] setSession result:', error?.message || 'ok', data?.session?.user?.email);
          if (error || !data.session) {
            console.error('[OpsLanding] setSession failed:', error?.message);
            settled = true;
            setPhase('signin');
          } else {
            finish(data.session);
          }
        });
      return;
    }

    // For admin-generated magic links, Supabase verifies server-side and fires SIGNED_IN via onAuthStateChange.
    // We rely on that event here — no client-side verifyOtp needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('[OpsLanding] auth event:', event, '| session:', s ? `user=${s.user?.email}` : 'null');
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s && !settled) {
        settled = true;
        subscription.unsubscribe();
        await resolveSession(s, setPhase, setSession);
      } else if (event === 'INITIAL_SESSION' && !s && !settled) {
        settled = true;
        subscription.unsubscribe();
        if (params.get('checkout') === 'success') {
          setPhase('demo');
        } else {
          setPhase('signin');
        }
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) {
        console.warn('[OpsLanding] timeout — going to signin');
        settled = true;
        subscription.unsubscribe();
        setPhase('signin');
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
      if (response.data?.url) window.location.href = response.data.url;
    } catch (e) {
      console.error('[OpsLanding] checkout error:', e);
    }
    setCheckoutLoading(null);
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    if (!signinEmail) return;
    setSigninLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: signinEmail,
      options: {
        emailRedirectTo: 'https://theprojectair.com/ops',
        shouldCreateUser: false,
      },
    });
    setSigninLoading(false);
    if (!error) setSigninSent(true);
  };

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

  if (phase === 'signin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-white font-bold text-2xl">Sign in to AIR</h1>
            <p className="text-slate-400 text-sm">We'll send a magic link to your email.</p>
          </div>

          {signinSent ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-center space-y-2">
              <Mail className="w-8 h-8 text-green-400 mx-auto" />
              <p className="text-green-300 font-semibold">Check your inbox</p>
              <p className="text-slate-400 text-sm">A sign-in link was sent to <span className="text-white">{signinEmail}</span></p>
            </div>
          ) : (
            <form onSubmit={handleSignin} className="space-y-3">
              <Input
                type="email"
                required
                placeholder="your@email.com"
                value={signinEmail}
                onChange={e => setSigninEmail(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={signinLoading}
              >
                {signinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Magic Link'}
              </Button>
            </form>
          )}

          <p className="text-center text-slate-600 text-xs">
            <a href="/" className="hover:text-slate-400 transition">← Back to home</a>
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-white font-semibold text-lg">Something went wrong</p>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => setPhase('signin')}
          >
            Try signing in
          </Button>
        </div>
      </div>
    );
  }

  // phase === 'demo'
  return (
    <div className="min-h-screen bg-slate-950 text-white">
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
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">{session.user.email}</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); setSession(null); setPhase('signin'); }}
              className="text-xs text-slate-500 hover:text-slate-300 underline transition"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-center">
        <p className="text-amber-300 text-sm">
          You're exploring AIR with demo data. Subscribe to launch your own workspace with live data.
        </p>
      </div>

      <div className="flex" style={{ height: 'calc(100vh - 120px)' }}>
        <iframe
          src="https://theprojectair.com/"
          className="flex-1 border-0"
          title="AIR Demo"
        />
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