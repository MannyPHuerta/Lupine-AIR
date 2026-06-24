import { supabase } from './supabaseClient';
import { supabaseData, auth, uploadFile } from './supabaseData';

const entityCache = new Map();

const getEntity = (name) => {
  const entityName = String(name);
  if (!entityCache.has(entityName)) {
    entityCache.set(entityName, {
      list: (...args) => supabaseData[entityName].list(...args),
      get: (...args) => supabaseData[entityName].get(...args),
      filter: (...args) => supabaseData[entityName].filter(...args),
      create: (...args) => supabaseData[entityName].create(...args),
      bulkCreate: (...args) => supabaseData[entityName].bulkCreate(...args),
      update: (...args) => supabaseData[entityName].update(...args),
      delete: (...args) => supabaseData[entityName].delete(...args),
      subscribe: (...args) => supabaseData[entityName].subscribe(...args),
      invite: (...args) => supabaseData[entityName].invite(...args),
    });
  }
  return entityCache.get(entityName);
};

const entities = new Proxy({}, {
  get(_target, property) {
    if (typeof property === 'symbol') return undefined;
    return getEntity(property);
  },
});

async function invoke(functionName, params = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch(`/api/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `${functionName} failed`);
  }

  return response;
}

const Core = {
  InvokeLLM: async (payload) => invoke('askAIAssistant', payload).then((response) => response.json()),
  SendEmail: async (payload) => invoke('sendEmail', payload).then((response) => response.json()),
  UploadFile: async ({ file, bucket } = {}) => uploadFile(file, bucket),
};

export const base44 = {
  auth,
  entities,
  functions: { invoke },
  integrations: { Core },
  agents: {
    getWhatsAppConnectURL: () => '#',
    getTelegramConnectURL: () => '#',
    createConversation: async () => null,
    listConversations: async () => [],
    getConversation: async () => null,
    addMessage: async () => null,
    subscribeToConversation: () => () => {},
  },
  analytics: { track: () => {} },
  users: { inviteUser: async () => null },
};

export default base44;
