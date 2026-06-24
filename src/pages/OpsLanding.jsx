// src/pages/OpsLanding.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';

/**
 * OpsLanding
 * --------------------------------------------------------------------------
 * Single post-auth landing route. The tenant is resolved server-side from the
 * signed-in user's session inside AuthenticatedApp / AuthContext — this page
 * does NOT need to know the tenant slug. It only:
 *
 *   1. Confirms there is a Supabase session (magic-link hash already consumed
 *      by AuthCallback before we get here).
 *   2. Confirms the user has a profile row (i.e. they've been provisioned
 *      into a tenant). If not, sends them to /onboarding.
 *   3. Sends everyone else to /ops, the canonical workspace entry point.
 *
 * No /${slug} redirects. No hostname sniffing. No subdomain logic.
 * --------------------------------------------------------------------------
 */
export default function OpsLanding() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Session check. AuthCallback should have set this already.
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (!cancelled) navigate('/signin', { replace: true });
          return;
        }

        const userId = session.user.id;
        const email  = session.user.email;

        // 2. Platform admin shortcut — skip tenant gating.
        const { data: platformAdmin } = await supabase
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (platformAdmin) {
          if (!cancelled) navigate('/ops', { replace: true });
          return;
        }

        // 3. Profile / tenant membership check.
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, tenant_id, onboarding_complete')
          .eq('id', userId)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // No profile row at all → user has never been provisioned.
        // Fall back to onboarding so they can claim/join a tenant.
        if (!profile || !profile.tenant_id) {
          if (!cancelled) {
            setMessage('Finishing setup…');
            navigate('/onboarding', { replace: true });
          }
          return;
        }

        // Profile exists, tenant assigned. Drop them into the workspace.
        if (!cancelled) navigate('/ops', { replace: true });
      } catch (err) {
        console.error('[OpsLanding] redirect failed:', err);
        if (!cancelled) {
          setMessage('Something went wrong. Returning you to sign-in…');
          setTimeout(() => navigate('/signin', { replace: true }), 1200);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        <p className="text-sm text-slate-300">{message}</p>
      </div>
    </div>
  );
}
