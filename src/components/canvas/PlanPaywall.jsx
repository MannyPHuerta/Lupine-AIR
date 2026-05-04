import { useState } from 'react';
import { Lock, Loader2, X, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PlanPaywall({ planId, customerEmail, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUnlock = async () => {
    // Block if running inside an iframe (e.g. Base44 preview)
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app, not the preview.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await base44.functions.invoke('planCheckout', { planId, customerEmail });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setError(res.data?.error || 'Could not start checkout. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white mb-1">Unlock Your Plan</h2>
            <p className="text-white/50 text-sm">One-time $20 fee to save, print, and collaborate with a planner.</p>
          </div>

          <div className="w-full bg-slate-800 rounded-2xl p-5 space-y-3 text-left">
            {[
              'Save your layout to the cloud',
              'Print a professional floor plan PDF',
              'Request a live planner review',
              'Collaborate in real time with staff',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold rounded-xl py-3.5 transition"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to checkout…</>
              ) : (
                <>Unlock for $20 →</>
              )}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-xs text-center">
                {error}
              </div>
            )}

            <button onClick={onClose} className="w-full text-white/30 hover:text-white/60 text-sm transition py-1">
              Continue editing without saving
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}