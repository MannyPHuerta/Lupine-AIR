// Base44 SDK client for frontend usage
// Base44 platform injects window.base44 at runtime in the editor
// For production, we need to initialize the SDK properly

let base44Instance = null;

// Initialize Base44 client
function getBase44() {
  if (base44Instance) return base44Instance;
  
  // In Base44 editor/production, window.base44 is injected by the platform
  if (typeof window !== 'undefined' && window.base44) {
    base44Instance = window.base44;
    return base44Instance;
  }
  
  // Fallback for development
  return null;
}

export const base44 = getBase44() || {
  auth: {
    me: async () => {
      throw new Error('Base44 SDK not initialized');
    },
    logout: () => {},
    redirectToLogin: (next) => {
      window.location.href = `/signin?next=${encodeURIComponent(next || window.location.pathname)}`;
    },
    isAuthenticated: async () => false
  },
  entities: {},
  functions: {
    invoke: async () => {
      throw new Error('Base44 SDK not initialized');
    }
  },
  integrations: {},
  users: {},
  connectors: {},
  analytics: {
    track: () => {}
  }
};