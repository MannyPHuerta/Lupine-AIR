import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
);

// PascalCase entity name -> snake_case table name
const toTable = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

export function makeEntity(entityName) {
  const table = toTable(entityName);
  return {
    list: async (orderBy) => {
      let q = supabase.from(table).select('*');
      if (orderBy) q = q.order(orderBy.replace(/^-/, ''), { ascending: !orderBy.startsWith('-') });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    get: async (id) => {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    filter: async (where) => {
      let q = supabase.from(table).select('*');
      Object.entries(where || {}).forEach(([k, v]) => { q = q.eq(k, v); });
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    create: async (row) => {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, patch) => {
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}

export const supabaseData = new Proxy({}, { get: (_, name) => makeEntity(String(name)) });
export default supabaseData;
