import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase client for real auth + data (only when env vars are present)
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Shim: map Supabase session user to the shape AuthContext expects
const mapUser = (supabaseUser) => ({
  id: supabaseUser.id,
  email: supabaseUser.email,
  full_name: supabaseUser.user_metadata?.full_name || supabaseUser.email,
  role: supabaseUser.user_metadata?.role || 'user',
});

// Build a base44-compatible API surface backed by Supabase
export const base44 = {
  auth: {
    me: async () => {
      if (!supabase) throw { status: 401, message: 'Not authenticated' };
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw { status: 401, message: 'Not authenticated' };
      return mapUser(session.user);
    },
    isAuthenticated: async () => {
      if (!supabase) return false;
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    logout: async (redirectUrl) => {
      if (supabase) await supabase.auth.signOut();
      window.location.href = redirectUrl || '/signin';
    },
    redirectToLogin: (nextUrl) => {
      window.location.href = nextUrl
        ? `/signin?next=${encodeURIComponent(nextUrl)}`
        : '/signin';
    },
    updateMe: async (data) => {
      const { error } = await supabase.auth.updateUser({ data });
      if (error) throw error;
    },
  },

  entities: new Proxy({}, {
    get: (_, entityName) => {
      const table = entityName.replace(/([A-Z])/g, (m, l, i) =>
        i === 0 ? l.toLowerCase() : '_' + l.toLowerCase()
      );
      return {
        list: async (order, limit) => {
          let q = supabase.from(table).select('*');
          if (order) {
            const desc = order.startsWith('-');
            q = q.order(order.replace(/^-/, ''), { ascending: !desc });
          }
          if (limit) q = q.limit(limit);
          const { data, error } = await q;
          if (error) throw error;
          return data || [];
        },
        filter: async (filters, order, limit) => {
          let q = supabase.from(table).select('*');
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
          }
          if (order) {
            const desc = order.startsWith('-');
            q = q.order(order.replace(/^-/, ''), { ascending: !desc });
          }
          if (limit) q = q.limit(limit);
          const { data, error } = await q;
          if (error) throw error;
          return data || [];
        },
        get: async (id) => {
          const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
          if (error) throw error;
          return data;
        },
        create: async (record) => {
          const { data, error } = await supabase.from(table).insert(record).select().single();
          if (error) throw error;
          return data;
        },
        bulkCreate: async (records) => {
          const { data, error } = await supabase.from(table).insert(records).select();
          if (error) throw error;
          return data;
        },
        update: async (id, updates) => {
          const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
          if (error) throw error;
          return data;
        },
        delete: async (id) => {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        },
        schema: async () => {
          // Return empty schema — not needed outside Base44 editor
          return { type: 'object', properties: {} };
        },
        subscribe: (callback) => {
          const channel = supabase
            .channel(`${table}_changes`)
            .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
              const typeMap = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' };
              callback({
                type: typeMap[payload.eventType] || payload.eventType,
                id: payload.new?.id || payload.old?.id,
                data: payload.new || payload.old,
              });
            })
            .subscribe();
          return () => supabase.removeChannel(channel);
        },
      };
    },
  }),

  integrations: {
    Core: {
      InvokeLLM: async (params) => {
        // Will be handled by Supabase Edge Functions — stub for now
        console.warn('InvokeLLM: migrate to Supabase Edge Function', params);
        return {};
      },
      SendEmail: async (params) => {
        console.warn('SendEmail: migrate to Supabase Edge Function', params);
        return {};
      },
      UploadFile: async ({ file }) => {
        const path = `uploads/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from('assets').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('assets').getPublicUrl(path);
        return { file_url: data.publicUrl };
      },
      GenerateImage: async (params) => {
        console.warn('GenerateImage: migrate to Supabase Edge Function', params);
        return { image_url: '' };
      },
    },
  },

  functions: {
    invoke: async (functionName, params) => {
      const { data, error } = await supabase.functions.invoke(functionName, { body: params });
      if (error) throw error;
      return { data };
    },
  },

  analytics: {
    track: (event) => {
      // No-op or hook into your own analytics
      console.log('[analytics]', event);
    },
  },

  users: {
    inviteUser: async (email, role) => {
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { role }
      });
      if (error) throw error;
    },
  },
};