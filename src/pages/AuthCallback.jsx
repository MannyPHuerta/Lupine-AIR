import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [status, setStatus] = useState('Signing you in…');
  const [debug, setDebug] = useState('');

  useEffect(() => {
    if (!supabase) {
      console.error('[AuthCallback] Supabase client is null');
      setStatus('Auth not available.');
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    const next = searchParams.get('next') || '/ops';

    console.log('[AuthCallback] URL:', window.location.href);
    console.log('[AuthCallback] search:', window.location.search);
    console.log('[AuthCallback] hash:', window.location.hash);

    // Error in hash (expired link etc.)
    const hashError = hashParams.get('error');
    const errorCode = hashParams.get('error_code');
    if (hashError) {
      console.error('[AuthCallback] hash error:', hashError, errorCode);
      setStatus(`Sign-in failed: ${hashError}. The link may have expired.`);
      return;
    }

    const code = searchParams.get('code');
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    let settled = false;

    // Case 1: admin generateLink — ?token=...&type=magiclink
    if (token && type) {
      console.log('[AuthCallback] Case 1: token+type flow');
      supabase.auth.verifyOtp({ token_hash: token, type })
        .then(({ error, data }) => {
          if (error || !data?.session) {
            console.error('[AuthCallback] verifyOtp failed:', error);
            setStatus('Sign-in failed. The link may have expired.');
          } else {
            console.log('[AuthCallback] verifyOtp success, redirecting to:', next);
            window.location.replace(next);
          }
        })
        .catch(err => {
          console.error('[AuthCallback] verifyOtp exception:', err);
          setStatus('Sign-in failed. Please request a new link.');
        });
      return;
    }

    // Case 2: PKCE code flow — ?code=...
    if (code) {
      console.log('[AuthCallback] Case 2: PKCE code flow');
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error, data }) => {
          if (error || !data?.session) {
            console.error('[AuthCallback] exchangeCodeForSession failed:', error);
            setStatus('Sign-in failed. The link may have expired.');
          } else {
            console.log('[AuthCallback] exchangeCodeForSession success, redirecting to:', next);
            window.location.replace(next);
          }
        })
        .catch(err => {
          console.error('[AuthCallback] exchangeCodeForSession exception:', err);
          setStatus('Sign-in failed. Please request a new link.');
        });
      return;
    }

    // Case 3: Hash-based implicit flow — #access_token=...
    if (accessToken) {
      console.log('[AuthCallback] Case 3: hash-based flow');
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        .then(({ error, data }) => {
          if (error || !data?.session) {
            console.error('[AuthCallback] setSession failed:', error);
            setStatus('Sign-in failed. The link may have expired.');
          } else {
            console.log('[AuthCallback] setSession success, redirecting to:', next);
            window.location.replace(next);
          }
        })
        .catch(err => {
          console.error('[AuthCallback] setSession exception:', err);
          setStatus('Sign-in failed. Please request a new link.');
        });
      return;
    }

    // Case 4: No params — check for existing session or wait for auth state change
    console.log('[AuthCallback] Case 4: checking existing session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (settled) return;
      if (session) {
        console.log('[AuthCallback] existing session found:', session.user?.email);
        settled = true;
        window.location.replace(next);
      } else {
        console.log('[AuthCallback] no existing session, waiting for auth state change');
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
          console.log('[AuthCallback] auth event:', event, '| has session:', !!s);
          if (settled) return;
          
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && s) {
            console.log('[AuthCallback] session established, redirecting to:', next);
            settled = true;
            subscription.unsubscribe();
            window.location.replace(next);
          } else if (event === 'INITIAL_SESSION' && !s) {
            console.log('[AuthCallback] no session after timeout');
            settled = true;
            subscription.unsubscribe();
            setStatus('Sign-in failed. Please request a new link.');
          }
        });

        // Timeout fallback
        setTimeout(() => {
          if (!settled) {
            console.warn('[AuthCallback] timeout waiting for session');
            settled = true;
            subscription.unsubscribe();
            setStatus('Sign-in timed out. Please request a new link.');
          }
        }, 10000);
      }
    }).catch(err => {
      console.error('[AuthCallback] getSession exception:', err);
      setStatus('Sign-in failed. Please request a new link.');
    });

    return () => {
      // Cleanup handled in subscription
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-white font-black text-xl">AIR</span>
        </div>
        {status === 'Signing you in…' ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-600 font-medium">{status}</p>
          </>
        ) : (
          <p className="text-red-600 font-medium">{status}</p>
        )}
        {debug && (
          <p className="text-xs text-slate-400 break-all mt-2">{debug}</p>
        )}
      </div>
    </div>
  );
}