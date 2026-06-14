// Supabase client for data and auth
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Mock Base44 SDK for platform compatibility (AuthContext.jsx requires this)
// All actual functionality uses Supabase directly
export const base44 = {
  auth: {
    me: async () => {
      if (!supabase) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          role: session.user.user_metadata?.role || 'user'
        };
      }
      throw new Error('Not authenticated');
    },
    logout: (redirectUrl) => {
      if (supabase) supabase.auth.signOut();
      window.location.href = redirectUrl || '/signin';
    },
    redirectToLogin: (nextUrl) => {
      const next = nextUrl || window.location.pathname;
      window.location.href = `/signin?next=${encodeURIComponent(next)}`;
    },
    isAuthenticated: async () => {
      if (!supabase) return false;
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    updateMe: async (data) => {
      if (!supabase) return;
      await supabase.auth.updateUser({ data });
    }
  },
  entities: {},
  functions: {},
  integrations: {}
};