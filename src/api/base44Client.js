// Base44 SDK client for production app
// The Base44 platform automatically injects the base44 global object in production

function getSDK() {
  // In production Base44 app, the SDK is available as a global
  if (typeof window !== 'undefined' && window.base44) {
    return window.base44;
  }
  return null;
}

export const base44 = {
  auth: {
    me: async () => {
      const sdk = getSDK();
      if (!sdk) throw { status: 401, message: 'Not authenticated' };
      return sdk.auth.me();
    },
    isAuthenticated: async () => {
      const sdk = getSDK();
      if (!sdk) return false;
      return sdk.auth.isAuthenticated();
    },
    logout: async (redirectUrl) => {
      const sdk = getSDK();
      if (sdk) {
        sdk.auth.logout(redirectUrl);
      } else {
        window.location.href = redirectUrl || '/signin';
      }
    },
    redirectToLogin: (nextUrl) => {
      const sdk = getSDK();
      if (sdk) {
        sdk.auth.redirectToLogin(nextUrl);
      } else {
        window.location.href = nextUrl ? `/signin?next=${encodeURIComponent(nextUrl)}` : '/signin';
      }
    },
    updateMe: async (data) => {
      const sdk = getSDK();
      if (!sdk) throw new Error('Not authenticated');
      sdk.auth.updateMe(data);
    },
  },

  entities: new Proxy({}, {
    get: (_, entityName) => {
      const sdk = getSDK();
      if (!sdk) {
        return {
          list: async () => [],
          filter: async () => [],
          get: async () => null,
          create: async () => null,
          bulkCreate: async () => [],
          update: async () => null,
          delete: async () => {},
          schema: async () => ({ type: 'object', properties: {} }),
          subscribe: () => () => {},
        };
      }
      return sdk.entities[entityName];
    },
  }),

  functions: {
    invoke: async (functionName, params) => {
      const sdk = getSDK();
      if (!sdk) {
        throw new Error('Functions not available in preview mode. Please use the production app.');
      }
      return sdk.functions.invoke(functionName, params);
    },
  },

  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        const sdk = getSDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return sdk.integrations.Core.InvokeLLM(params);
      },
      SendEmail: async (params) => {
        const sdk = getSDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return sdk.integrations.Core.SendEmail(params);
      },
      UploadFile: async ({ file }) => {
        const sdk = getSDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return sdk.integrations.Core.UploadFile({ file });
      },
      GenerateImage: async (params) => {
        const sdk = getSDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return sdk.integrations.Core.GenerateImage(params);
      },
    },
  },

  analytics: {
    track: (event) => {
      const sdk = getSDK();
      if (sdk) {
        sdk.analytics.track(event);
      } else {
        console.log('[analytics]', event);
      }
    },
  },

  users: {
    inviteUser: async (email, role) => {
      const sdk = getSDK();
      if (!sdk) throw new Error('User management not available in preview mode');
      sdk.users.inviteUser(email, role);
    },
  },
};