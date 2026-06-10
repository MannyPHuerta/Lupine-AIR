// Base44 SDK client for frontend
// Uses the platform-injected global window.base44 object

const getSDK = () => {
  if (typeof window !== 'undefined' && window.base44) {
    return window.base44;
  }
  // Return a no-op stub during SSR / before hydration
  return null;
};

const sdk = () => {
  const s = getSDK();
  if (!s) throw new Error('Base44 SDK not available');
  return s;
};

export const base44 = {
  auth: {
    me: () => sdk().auth.me(),
    isAuthenticated: () => sdk().auth.isAuthenticated(),
    logout: (redirectUrl) => sdk().auth.logout(redirectUrl),
    redirectToLogin: (nextUrl) => sdk().auth.redirectToLogin(nextUrl),
    updateMe: (data) => sdk().auth.updateMe(data),
  },

  entities: new Proxy({}, {
    get: (_, entityName) => sdk().entities[entityName],
  }),

  functions: {
    invoke: (functionName, params) => sdk().functions.invoke(functionName, params),
  },

  integrations: {
    Core: new Proxy({}, {
      get: (_, methodName) => (...args) => sdk().integrations.Core[methodName](...args),
    }),
  },

  analytics: {
    track: (event) => sdk().analytics?.track(event),
  },

  users: {
    inviteUser: (email, role) => sdk().users.inviteUser(email, role),
  },

  connectors: {
    connectAppUser: (connectorId) => sdk().connectors.connectAppUser(connectorId),
    disconnectAppUser: (connectorId) => sdk().connectors.disconnectAppUser(connectorId),
  },
};