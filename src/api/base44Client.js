// Base44 SDK client for production app
// This file provides a unified interface that works on Base44 platform

let base44SDK = null;
let sdkInitializing = false;

// Initialize Base44 SDK (only available in production Base44 app)
async function initSDK() {
  if (sdkInitializing || base44SDK) return;
  sdkInitializing = true;
  
  try {
    if (typeof window !== 'undefined') {
      const { createClient } = await import('npm:@base44/sdk@0.8.31');
      base44SDK = createClient();
    }
  } catch (e) {
    console.log('Base44 SDK not available (preview mode)');
  } finally {
    sdkInitializing = false;
  }
}

// Auto-initialize
initSDK();

export const base44 = {
  auth: {
    me: async () => {
      if (!base44SDK) throw { status: 401, message: 'Not authenticated' };
      return await base44SDK.auth.me();
    },
    isAuthenticated: async () => {
      if (!base44SDK) return false;
      return await base44SDK.auth.isAuthenticated();
    },
    logout: async (redirectUrl) => {
      if (base44SDK) {
        await base44SDK.auth.logout(redirectUrl);
      } else {
        window.location.href = redirectUrl || '/signin';
      }
    },
    redirectToLogin: (nextUrl) => {
      if (base44SDK) {
        base44SDK.auth.redirectToLogin(nextUrl);
      } else {
        window.location.href = nextUrl ? `/signin?next=${encodeURIComponent(nextUrl)}` : '/signin';
      }
    },
    updateMe: async (data) => {
      if (!base44SDK) throw new Error('Not authenticated');
      await base44SDK.auth.updateMe(data);
    },
  },

  entities: new Proxy({}, {
    get: (_, entityName) => {
      if (!base44SDK) {
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
      return base44SDK.entities[entityName];
    },
  }),

  functions: {
    invoke: async (functionName, params) => {
      if (!base44SDK) {
        throw new Error('Functions not available in preview mode. Please use the production app.');
      }
      return await base44SDK.functions.invoke(functionName, params);
    },
  },

  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        if (!base44SDK) throw new Error('Integrations not available in preview mode');
        return await base44SDK.integrations.Core.InvokeLLM(params);
      },
      SendEmail: async (params) => {
        if (!base44SDK) throw new Error('Integrations not available in preview mode');
        return await base44SDK.integrations.Core.SendEmail(params);
      },
      UploadFile: async ({ file }) => {
        if (!base44SDK) throw new Error('Integrations not available in preview mode');
        return await base44SDK.integrations.Core.UploadFile({ file });
      },
      GenerateImage: async (params) => {
        if (!base44SDK) throw new Error('Integrations not available in preview mode');
        return await base44SDK.integrations.Core.GenerateImage(params);
      },
    },
  },

  analytics: {
    track: (event) => {
      if (base44SDK) {
        base44SDK.analytics.track(event);
      } else {
        console.log('[analytics]', event);
      }
    },
  },

  users: {
    inviteUser: async (email, role) => {
      if (!base44SDK) throw new Error('User management not available in preview mode');
      await base44SDK.users.inviteUser(email, role);
    },
  },
};