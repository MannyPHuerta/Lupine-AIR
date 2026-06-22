import React, { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const finishAuth = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errParam = url.searchParams.get('error_description') || url.searchParams.get('error');
        const next = url.searchParams.get('next') || '/dashboard';

        if (errParam) {
          throw new Error(errParam);
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          // Magic link may arrive as a hash fragment (#access_token=...).
          // supabase-js parses it automatically when detectSessionInUrl is true;
          // if it's false we fall through and rely on an existing session.
          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.replace(/^#/, ''));
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
              const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
              if (setErr) throw setErr;
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No session established. The magic link may have expired — please request a new one.');
        }

        // Clean the URL so tokens/codes don't linger in history, then redirect.
        window.history.replaceState({}, document.title, window.location.pathname);
        window.location.replace(next);
      } catch (e) {
        console.error('[AuthCallback]', e);
        setError(e.message || 'Authentication failed.');
      }
    };

    finishAuth();
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '64px auto', padding: 24, fontFamily: 'system-ui', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Sign-in failed</h1>
        <p style={{ color: '#b91c1c', marginBottom: 24 }}>{error}</p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 18px',
            background: '#111',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          Return to sign in
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center', fontFamily: 'system-ui' }}>
      <p>Signing you in…</p>
    </div>
  );
}
