// Base44 SDK client for production app
// This file provides a unified interface that works on Base44 platform

// Base44 SDK is available globally in production Base44 app
const getBase44SDK = () => {
  if (typeof window !== 'undefined' && window.base44) {
    return window.base44;
  }
  return null;
};

export const base44 = {
  auth: {
    me: async () => {
      const sdk = getBase44SDK();
      if (!sdk) throw { status: 401, message: 'Not authenticated' };
      return await sdk.auth.me();
    },
    isAuthenticated: async () => {
      const sdk = getBase44SDK();
      if (!sdk) return false;
      return await sdk.auth.isAuthenticated();
    },
    logout: async (redirectUrl) => {
      const sdk = getBase44SDK();
      if (sdk) {
        await sdk.auth.logout(redirectUrl);
      } else {
        window.location.href = redirectUrl || '/signin';
      }
    },
    redirectToLogin: (nextUrl) => {
      const sdk = getBase44SDK();
      if (sdk) {
        sdk.auth.redirectToLogin(nextUrl);
      } else {
        window.location.href = nextUrl ? `/signin?next=${encodeURIComponent(nextUrl)}` : '/signin';
      }
    },
    updateMe: async (data) => {
      const sdk = getBase44SDK();
      if (!sdk) throw new Error('Not authenticated');
      await sdk.auth.updateMe(data);
    },
  },

  entities: new Proxy({}, {
    get: (_, entityName) => {
      const sdk = getBase44SDK();
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
      const sdk = getBase44SDK();
      if (!sdk) {
        throw new Error('Functions not available in preview mode. Please use the production app.');
      }
      return await sdk.functions.invoke(functionName, params);
    },
  },

  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        const sdk = getBase44SDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return await sdk.integrations.Core.InvokeLLM(params);
      },
      SendEmail: async (params) => {
        const sdk = getBase44SDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return await sdk.integrations.Core.SendEmail(params);
      },
      UploadFile: async ({ file }) => {
        const sdk = getBase44SDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return await sdk.integrations.Core.UploadFile({ file });
      },
      GenerateImage: async (params) => {
        const sdk = getBase44SDK();
        if (!sdk) throw new Error('Integrations not available in preview mode');
        return await sdk.integrations.Core.GenerateImage(params);
      },
    },
  },

  analytics: {
    track: (event) => {
      const sdk = getBase44SDK();
      if (sdk) {
        sdk.analytics.track(event);
      } else {
        console.log('[analytics]', event);
      }
    },
  },

  users: {
    inviteUser: async (email, role) => {
      const sdk = getBase44SDK();
      if (!sdk) throw new Error('User management not available in preview mode');
      await sdk.users.inviteUser(email, role);
    },
  },
};