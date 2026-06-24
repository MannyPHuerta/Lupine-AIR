import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';

function safeNext(rawNext) {
  if (!rawNext) return '/ops';
  if (!rawNext.startsWith('/') || rawNext.startsWith('//')) return '/ops';
  return rawNext;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);

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

        const next = safeNext(get('next'));
        const code = get('code');
        const tokenHash = get('token_hash');
        const type = get('type');
        const accessToken = get('access_token');
        const refreshToken = get('refresh_token');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (verifyError) throw verifyError;
        } else if (accessToken && refreshToken) {
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
          throw new Error('No session was established. Please request a new sign-in link.');
        }

        if (!cancelled) navigate(next, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] sign-in failed:', err);
        if (!cancelled) {
          setError(err?.message || 'Sign-in failed. Please request a new link.');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [location.search, location.hash, navigate]);

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Sign-in problem</h1>
        <p style={{ color: '#b91c1c', marginBottom: 16 }}>{error}</p>
        <a href="/signin" style={{ color: '#2563eb' }}>
          Return to sign in
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      Signing you in…
    </div>
  );
}
