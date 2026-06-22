// pages/AuthCallback.jsx
// Honors ?next= so magic links from the waitlist approval flow drop trial
// users straight into the demo (/dashboard) instead of /onboarding.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_NEXT = '/dashboard';

function safeNext(raw) {
  if (!raw) return DEFAULT_NEXT;
  // Only allow same-origin paths, not absolute URLs or protocol-relative.
  if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_NEXT;
  return raw;
}

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errParam = params.get('error_description') || params.get('error');
        if (errParam) throw new Error(errParam);

        const code = params.get('code');
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        }

        const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (!sessionData || !sessionData.session) {
          throw new Error('No session after auth callback');
        }

        if (cancelled) return;
        const next = safeNext(params.get('next'));
        window.location.replace(next);
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '64px auto', fontFamily: 'system-ui', padding: 24 }}>
        <h2>Sign-in failed</h2>
        <p style={{ color: '#b00' }}>{error}</p>
        <p><a href="/signin">Return to sign in</a></p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: '64px auto', textAlign: 'center', fontFamily: 'system-ui' }}>
      <p>Signing you in…</p>
    </div>
  );
}
