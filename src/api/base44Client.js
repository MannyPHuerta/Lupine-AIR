// Vercel/Supabase mode - Base44 SDK stub (no Base44 backend features used)
// This project uses Supabase for all data and auth - Base44 is only for hosting

export const base44 = {
  auth: {
    me: async () => null,
    logout: () => {},
    redirectToLogin: () => {},
    isAuthenticated: async () => false,
    updateMe: async () => {}
  },
  entities: {},
  functions: {
    invoke: async () => ({ data: null })
  },
  integrations: {},
  analytics: {
    track: async () => {}
  },
  users: {
    inviteUser: async () => {}
  },
  agents: {}
};