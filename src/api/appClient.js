// App client — wraps Supabase auth + Vercel API function calls
// All auth and data goes through Supabase directly.
import { supabase } from './supabaseClient';

export { supabase };

export const base44 = {
  auth: {
    me: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        return {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email,
          role: session.user.user_metadata?.role || 'user',
        };
      }
      return null;
    },
    logout: (redirectUrl) => {
      supabase.auth.signOut();
      window.location.href = redirectUrl || '/signin';
    },
    redirectToLogin: (nextUrl) => {
      const next = nextUrl || window.location.pathname;
      window.location.href = `/signin?next=${encodeURIComponent(next)}`;
    },
    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    updateMe: async (data) => {
      await supabase.auth.updateUser({ data });
    },
  },
  entities: {},
  functions: {
    invoke: async (functionName, params) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
      const response = await fetch(`/api/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Function invocation failed');
      }
      return response;
    },
  },
  integrations: {},
  agents: {
    getWhatsAppConnectURL: () => '#',
    getTelegramConnectURL: () => '#',
    createConversation: () => {},
    listConversations: () => [],
    getConversation: () => null,
    addMessage: () => {},
    subscribeToConversation: () => () => {},
  },
  analytics: { track: () => {} },
  users: {
    inviteUser: async () => {},
  },
};