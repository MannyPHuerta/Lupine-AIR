import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock, ShieldCheck, Zap, Loader2, CheckCircle2, Star } from 'lucide-react';

// Matches the actual plan tiers sold on the website
const TIER_ORDER = { core: 0, pro: 1, custom: 2, enterprise: 3 };

const PLANS = {
  pro: {
    name: 'AIR Pro',
    price: '$799/mo',
    color: '#22d3ee',
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/40',
    bgClass: 'bg-cyan-500/10',
    icon: <Zap className="w-7 h-7 text-cyan-400" />,
    features: [
      'Everything in Core',
      'Up to 3 branches, unlimited users',
      'Cross-branch transfers & visibility',
      'Shop management & work orders',
      'GPS tracking (Samsara, CalAmp, etc.)',
      'AIRecovery — theft prevention',
      'Fraud Intelligence dashboard',
      'Cash drawer variance & AI audit',
      'Weekly AI Fraud Digest',
      'Loyalty programs & volume discounts',
      'Priority support',
    ],
  },
  custom: {
    name: 'AIR Custom',
    price: '$1,499/mo',
    color: '#a78bfa',
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
    bgClass: 'bg-purple-500/10',
    icon: <ShieldCheck className="w-7 h-7 text-purple-400" />,
    features: [
      'Everything in Pro',
      'Up to 10 branches',
      'AIRfq — government bid intelligence',
      'AIRoads — multi-truck load planning',
      'Advanced repair & predictive maintenance',
      'Event profit tracking (major jobs)',
      'Custom integrations & API access',
      'Account manager & SLA',
    ],
  },
  enterprise: {
    name: 'AIR Enterprise',
    price: 'Custom pricing',
    color: '#f59e0b',
    colorClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    bgClass: 'bg-amber-500/10',
    icon: <ShieldCheck className="w-7 h-7 text-amber-400" />,
    features: [
      'Everything in Custom',
      'Unlimited branches',
      'White-label domain & branding',
      'SSO (Google Workspace, Microsoft, Okta)',
      'Custom AI model tuning',
      'Dedicated infrastructure',
      'Premium support & technical services',
    ],
  },
};

/**
 * Wraps premium content. Shows children if user has required tier, otherwise shows upgrade gate.
 *
 * Props:
 *   requiredTier: 'pro' | 'custom' | 'enterprise'
 *   featureName: string  — short name for what's locked
 *   returnPath: string   — path to return to after checkout (default: current path)
 *   children: ReactNode  — the premium content
 */
export default function PremiumGate({ requiredTier, featureName, returnPath, children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Check URL param for post-checkout return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscribed = params.get('subscribed');
    if (subscribed && user) {
      base44.auth.me().then(u => setUser(u));
      const url = new URL(window.location.href);
      url.searchParams.delete('subscribed');
      window.history.replaceState({}, '', url.toString());
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  const userTier = user?.subscriptionTier || 'core';
  const userTierLevel = TIER_ORDER[userTier] ?? 0;
  const requiredLevel = TIER_ORDER[requiredTier] ?? 1;
  const hasAccess = userTierLevel >= requiredLevel;

  if (hasAccess) return children;

  const plan = PLANS[requiredTier] || PLANS.pro;
  const rPath = returnPath || window.location.pathname;
  const isEnterprise = requiredTier === 'enterprise';

  const handleUpgrade = async (tier) => {
    if (isEnterprise || tier === 'enterprise') {
      document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
      window.location.href = '/air#waitlist';
      return;
    }
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the preview.');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await base44.functions.invoke('subscriptionCheckout', { tier, returnPath: rPath });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setCheckoutError(res.data?.error || 'Could not start checkout.');
      }
    } catch (err) {
      setCheckoutError(err.message);
    }
    setCheckoutLoading(false);
  };

  return (
    <div className="flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-lg">

        {/* Locked banner */}
        <div className={`${plan.bgClass} ${plan.borderClass} border rounded-2xl p-6 mb-6 text-center`}>
          <div className="flex justify-center mb-3">{plan.icon}</div>
          <div className={`text-lg font-black ${plan.colorClass} mb-1`}>{featureName} requires {plan.name}</div>
          <p className="text-white/50 text-sm">Upgrade your plan to unlock this feature.</p>
        </div>

        {/* Plan card */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className={`text-xl font-black ${plan.colorClass}`}>{plan.name}</div>
              <div className="text-white/40 text-sm">{isEnterprise ? 'Contact us for pricing' : 'Billed monthly, cancel anytime'}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-white">{plan.price}</div>
            </div>
          </div>

          <div className="space-y-2.5 mb-6">
            {plan.features.map((f, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-white/70">
                <CheckCircle2 className={`w-4 h-4 ${plan.colorClass} flex-shrink-0 mt-0.5`} />
                {f}
              </div>
            ))}
          </div>

          <button
            onClick={() => handleUpgrade(requiredTier)}
            disabled={checkoutLoading}
            className="w-full flex items-center justify-center gap-2 font-bold rounded-xl py-3.5 transition text-black"
            style={{ background: plan.color }}
          >
            {checkoutLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout…</>
              : isEnterprise
              ? <><Star className="w-4 h-4" /> Contact Sales →</>
              : <><Star className="w-4 h-4" /> Upgrade to {plan.name} — {plan.price}</>
            }
          </button>

          {checkoutError && (
            <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs text-center">
              {checkoutError}
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-4">
          Questions? <a href="/air#waitlist" className="underline hover:text-white/40 transition">Contact us</a> — we're happy to walk you through the right plan.
        </p>
      </div>
    </div>
  );
}