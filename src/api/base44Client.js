// Base44 SDK client for frontend
// Initialize the Base44 SDK for browser use

import base44SDK from 'npm:@base44/sdk@0.8.31';

// Create a singleton client instance
const sdkInstance = base44SDK;

export const base44 = {
  auth: {
    me: async () => {
      return sdkInstance.auth.me();
    },
    isAuthenticated: async () => {
      return sdkInstance.auth.isAuthenticated();
    },
    logout: async (redirectUrl) => {
      sdkInstance.auth.logout(redirectUrl);
    },
    redirectToLogin: (nextUrl) => {
      sdkInstance.auth.redirectToLogin(nextUrl);
    },
    updateMe: async (data) => {
      await sdkInstance.auth.updateMe(data);
    },
  },

  entities: new Proxy({}, {
    get: (_, entityName) => {
      return sdkInstance.entities[entityName];
    },
  }),

  functions: {
    invoke: async (functionName, params) => {
      return sdkInstance.functions.invoke(functionName, params);
    },
  },

  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        return sdkInstance.integrations.Core.InvokeLLM(params);
      },
      SendEmail: async (params) => {
        return sdkInstance.integrations.Core.SendEmail(params);
      },
      UploadFile: async ({ file }) => {
        return sdkInstance.integrations.Core.UploadFile({ file });
      },
      GenerateImage: async (params) => {
        return sdkInstance.integrations.Core.GenerateImage(params);
      },
    },
  },

  analytics: {
    track: (event) => {
      sdkInstance.analytics.track(event);
    },
  },

  users: {
    inviteUser: async (email, role) => {
      await sdkInstance.users.inviteUser(email, role);
    },
  },
};