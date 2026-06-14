// Import the actual Supabase client
import { supabase } from './supabaseClient';

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
  functions: {
    invoke: async (functionName, params) => {
      // For Vercel deployment - call via API routes
      const response = await fetch(`/api/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Function invocation failed');
      }
      return await response.json();
    }
  },
  integrations: {}
};