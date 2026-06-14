import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [status, setStatus] = useState('Signing you in…');

  useEffect(() => {
    if (!supabase) {
      setStatus('Auth not available in preview mode.');
      return;
    }

    // Supabase puts tokens in the URL hash — getSession() picks them up automatically
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        setStatus('Sign-in failed. The link may have expired. Please request a new one.');
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/ops';
      window.location.replace(next);
    });
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
      </div>
    </div>
  );
}