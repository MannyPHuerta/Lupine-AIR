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

const PLATFORM_ADMINS = ['info@theprojectair.com'];

// Path-based tenant URL. Same origin, no subdomain, no DNS work.
const tenantUrl = (slug) => `/${slug}`;

async function resolveSession(s, setPhase, setSession) {
  console.log('[OpsLanding] resolveSession — email:', s.user.email, '| user_id:', s.user.id);
  setSession(s);
  window.history.replaceState({}, '', '/ops');

  // Platform owner — go straight to rental-world workspace (path-based)
  if (PLATFORM_ADMINS.includes(s.user.email)) {
    console.log('[OpsLanding] platform admin detected — redirecting to /rental-world');
    setPhase('redirecting');
    setTimeout(() => window.location.replace(tenantUrl('rental-world')), 1500);
    return;
  }

  console.log('[OpsLanding] looking up tenant for email:', s.user.email);

  try {
    const response = await fetch('/api/resolveTenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: s.user.email }),
    });
    console.log('[OpsLanding] resolveTenant response status:', response.status);

    if (!response.ok) throw new Error('resolveTenant API failed: ' + response.status);

    const result = await response.json();
    console.log('[OpsLanding] resolveTenant API result:', result);

    if (result.tenant) {
      const { slug, status } = result.tenant;
      const isBypassed = slug === 'rental-world';
      const hasValidStatus = ['active', 'trial'].includes(status);

      if (isBypassed || hasValidStatus) {
        console.log('[OpsLanding] valid tenant — redirecting to:', tenantUrl(slug));
        setPhase('redirecting');
        setTimeout(() => window.location.replace(tenantUrl(slug)), 1500);
        return;
      }
    }

    console.log('[OpsLanding] no valid tenant found from API');
  } catch (err) {
    console.error('[OpsLanding] resolveTenant API error:', err);
  }

  // Fallback 1: profile.tenant_id
  console.log('[OpsLanding] Checking user profile for tenant_id');
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, home_branch_id')
    .eq('id', s.user.id)
    .maybeSingle();

  if (profile?.tenant_id) {
    const { data: tenantFromProfile } = await supabase
      .from('tenants')
      .select('slug, status')
      .eq('id', profile.tenant_id)
      .maybeSingle();

    if (tenantFromProfile) {
      const { slug, status } = tenantFromProfile;
      if (slug === 'rental-world' || ['active', 'trial'].includes(status)) {
        console.log('[OpsLanding] tenant from profile — redirecting to:', tenantUrl(slug));
        setPhase('redirecting');
        setTimeout(() => window.location.replace(tenantUrl(slug)), 1500);
        return;
      }
    }
  }

  // Fallback 2: tenants.admin_email (may be blocked by RLS)
  const { data: tenantByAdmin } = await supabase
    .from('tenants')
    .select('slug, status')
    .eq('admin_email', s.user.email)
    .maybeSingle();

  if (tenantByAdmin && tenantByAdmin.status === 'active') {
    console.log('[OpsLanding] tenant by admin_email — redirecting to:', tenantUrl(tenantByAdmin.slug));
    setPhase('redirecting');
    setTimeout(() => window.location.replace(tenantUrl(tenantByAdmin.slug)), 1500);
    return;
  }

  console.log('[OpsLanding] no tenant found — redirecting to onboarding');
  setPhase('redirecting');
  setTimeout(() => window.location.replace('/onboarding'), 1500);
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

    // Hash-based tokens (implicit flow)
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken) {
      console.log('[OpsLanding] detected hash-based access_token — setting session');
      window.history.replaceState({}, '', '/ops');
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        .then(({ data, error }) => {
          console.log('[OpsLanding] setSession result:', error?.message || 'ok', data?.session?.user?.email);
          if (error || !data.session) {
            settled = true;
            setPhase('signin');
          } else {
            finish(data.session);
          }
        });
      return;
    }

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      console.log('[OpsLanding] getSession check:', existingSession ? `user=${existingSession.user?.email}` : 'null');
      if (existingSession && !settled) {
        settled = true;
        resolveSession(existingSession, setPhase, setSession);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      console.log('[OpsLanding] auth event:', event, '| session:', s ? `user=${s.user?.email}` : 'null');
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s && !settled) {
        settled = true;
        subscription.unsubscribe();
        await resolveSession(s, setPhase, setSession);
      } else if (event === 'INITIAL_SESSION' && !s && !settled) {
        settled = true;
        subscription.unsubscribe();
        setPhase(params.get('checkout') === 'success' ? 'demo' : 'signin');
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
    console.log('[OpsLanding] sending magic link to:', signinEmail);
    const { error } = await supabase.auth.signInWithOtp({
      email: signinEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/ops`,
        shouldCreateUser: false,
      },
    });
    setSigninLoading(false);
    if (!error) {
      console.log('[OpsLanding] magic link sent successfully');
      setSigninSent(true);
    } else {
      console.error('[OpsLanding] magic link error:', error);
    }
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-slate-400">Verifying your access…</p>
        </div>
      </div>
    );
  }

  if (phase === 'redirecting') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">You're all set!</h2>
          <p className="text-slate-400">Redirecting you to your AIR workspace…</p>
        </div>
      </div>
    );
  }

  if (phase === 'signin') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 mb-2">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold">Sign in to AIR</h1>
            <p className="text-slate-400 text-sm">We'll send a magic link to your email.</p>
          </div>

          {signinSent ? (
            <div className="text-center space-y-2 border border-slate-700 rounded-xl p-6">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
              <h2 className="font-semibold">Check your inbox</h2>
              <p className="text-slate-400 text-sm">A sign-in link was sent to {signinEmail}</p>
            </div>
          ) : (
            <form onSubmit={handleSignin} className="space-y-3">
              <Input
                type="email"
                required
                placeholder="you@email.com"
                value={signinEmail}
                onChange={(e) => setSigninEmail(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
              <Button type="submit" disabled={signinLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                {signinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Magic Link'}
              </Button>
            </form>
          )}

          <div className="text-center">
            <a href="/" className="text-xs text-slate-500 hover:text-slate-300 underline">
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <Button onClick={() => setPhase('signin')}>Try signing in</Button>
        </div>
      </div>
    );
  }

  // phase === 'demo'
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-bold">AIR</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Demo Mode
          </span>
        </div>
        {session && (
          <div className="text-right text-sm">
            <div className="text-slate-300">{session.user.email}</div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                setSession(null);
                setPhase('signin');
              }}
              className="text-xs text-slate-500 hover:text-slate-300 underline transition"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-3">
        <p className="text-sm text-blue-200">
          You're exploring AIR with demo data. Subscribe to launch your own workspace with live data.
        </p>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-6" />
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
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…
                  </>
                ) : (
                  `Subscribe — ${plan.price}`
                )}
              </Button>
            </div>
          ))}

          <p className="text-slate-500 text-xs text-center">
            No credit card required for your current 14-day trial. Subscribe before your trial ends to keep full Pro access.
          </p>
        </div>
      </div>
    </div>
  );
}
