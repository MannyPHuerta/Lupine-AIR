import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';

function signinUrl() {
  return `/signin?next=${encodeURIComponent('/ops')}`;
}

export default function OpsLanding({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('Verifying your access…');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const search = new URLSearchParams(location.search);
        const hash = new URLSearchParams(
          location.hash.startsWith('#') ? location.hash.slice(1) : location.hash
        );

        const get = (key) => search.get(key) || hash.get(key);

        const errParam = get('error_description') || get('error');
        if (errParam) throw new Error(decodeURIComponent(errParam));

        const code = get('code');
        const tokenHash = get('token_hash');
        const type = get('type');
        const accessToken = get('access_token');
        const refreshToken = get('refresh_token');

        if (code) {
          setMessage('Completing sign-in…');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          setMessage('Completing sign-in…');
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (verifyError) throw verifyError;
        } else if (accessToken && refreshToken) {
          setMessage('Restoring session…');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }

        const {
          data: { session },
          error: getSessionError,
        } = await supabase.auth.getSession();

        if (getSessionError) throw getSessionError;

        if (!session) {
          if (!cancelled) navigate(signinUrl(), { replace: true });
          return;
        }

        if (!cancelled) {
          if (window.location.pathname !== '/ops' || window.location.search || window.location.hash) {
            window.history.replaceState({}, '', '/ops');
          }
          setReady(true);
        }
      } catch (err) {
        console.error('[OpsLanding] auth handoff failed:', err);
        if (!cancelled) {
          setError(err?.message || 'Unable to complete sign-in.');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [location.search, location.hash, navigate]);

  if (ready) {
    return <>{children}</>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
        <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-slate-900 p-6 text-center space-y-4">
          <h1 className="text-xl font-bold">Sign-in problem</h1>
          <p className="text-sm text-slate-300">{error}</p>
          <button
            onClick={() => navigate(signinUrl(), { replace: true })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Request a new sign-in link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        <p className="text-sm text-slate-300">{message}</p>
      </div>
    </div>
  );
}
