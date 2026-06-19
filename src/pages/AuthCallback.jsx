import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [status, setStatus] = useState('Signing you in…');
  const [debug, setDebug] = useState('');

  useEffect(() => {
    if (!supabase) {
      setStatus('Auth not available in preview mode.');
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

    // Temporary debug — remove once working
    setDebug(`search: ${window.location.search} | hash: ${window.location.hash}`);

    // Check for error in hash first
    const hashError = hashParams.get('error');
    if (hashError) {
      setStatus('Sign-in failed. The link may have expired. Please request a new one.');
      return;
    }

    const code = searchParams.get('code');
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const next = searchParams.get('next') || '/ops';

    if (token && type) {
      // Supabase admin generateLink produces ?token=...&type=magiclink
      supabase.auth.verifyOtp({ token_hash: token, type })
        .then(({ error }) => {
          if (error) {
            setStatus('Sign-in failed. The link may have expired. Please request a new one.');
            return;
          }
          window.location.replace(next);
        });
    } else if (code) {
      // PKCE code flow
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setStatus('Sign-in failed. The link may have expired. Please request a new one.');
            return;
          }
          window.location.replace(next);
        });
    } else if (accessToken) {
      // Hash-based magic link
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken || '' })
        .then(({ error }) => {
          if (error) {
            setStatus('Sign-in failed. The link may have expired. Please request a new one.');
            return;
          }
          window.location.replace(next);
        });
    } else {
      setStatus('Sign-in failed. The link may have expired. Please request a new one.');
    }
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