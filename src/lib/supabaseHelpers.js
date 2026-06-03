import { supabase } from '@/api/supabaseClient';

/**
 * Supabase Migration Helper - Maps Base44 SDK patterns to Supabase calls
 * 
 * Usage:
 *   Instead of: base44.entities.Equipment.list()
 *   Use: await supabaseQuery('equipment').list()
 * 
 *   Instead of: base44.entities.Customer.create(data)
 *   Use: await supabaseQuery('customer').create(data)
 */

// Get current user from Supabase auth
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  // Fetch profile with role/branch info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile ? { ...user, ...profile } : null;
};

// Create query builder for a specific table
export const supabaseQuery = (tableName) => {
  const table = supabase.from(tableName);
  
  return {
    // List all records with optional sort and limit
    list: async (sortField = 'created_at', limit = 1000) => {
      const isDesc = sortField.startsWith('-');
      const field = isDesc ? sortField.substring(1) : sortField;
      const order = isDesc ? 'desc' : 'asc';
      
      const { data, error } = await table
        .select('*')
        .order(field, { ascending: order === 'asc' })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
    
    // Filter records with query conditions
    filter: async (conditions = {}, sortField = 'created_at', limit = 1000) => {
      let query = table.select('*');
      
      // Apply each condition
      Object.entries(conditions).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        query = query.eq(key, value);
      });
      
      const isDesc = sortField.startsWith('-');
      const field = isDesc ? sortField.substring(1) : sortField;
      const order = isDesc ? 'desc' : 'asc';
      
      const { data, error } = await query
        .order(field, { ascending: order === 'asc' })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },
    
    // Get single record by ID
    get: async (id) => {
      const { data, error } = await table
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    
    // Create new record
    create: async (data) => {
      const { data: result, error } = await table
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    
    // Bulk create records
    bulkCreate: async (dataArray) => {
      const { data: result, error } = await table
        .insert(dataArray)
        .select();
      
      if (error) throw error;
      return result;
    },
    
    // Update record by ID
    update: async (id, data) => {
      const { data: result, error } = await table
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    
    // Update multiple records matching conditions
    updateMany: async (conditions, data) => {
      let query = table.update(data);
      
      Object.entries(conditions).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        query = query.eq(key, value);
      });
      
      const { data: result, error } = await query.select();
      
      if (error) throw error;
      return result;
    },
    
    // Delete record by ID
    delete: async (id) => {
      const { error } = await table.delete().eq('id', id);
      if (error) throw error;
    },
    
    // Delete multiple records matching conditions
    deleteMany: async (conditions) => {
      let query = table.delete();
      
      Object.entries(conditions).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        query = query.eq(key, value);
      });
      
      const { error } = await query;
      if (error) throw error;
    },
    
    // Get entity schema (from table structure)
    schema: async () => {
      // Note: Supabase doesn't expose schema directly like Base44
      // This returns a basic structure - you may need to cache actual schemas
      return {
        tableName,
        note: 'Schema retrieval not directly supported - define in your app code',
      };
    },
  };
};

// Auth helpers
export const supabaseAuth = {
  me: getCurrentUser,
  
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
  
  logout: async (redirectUrl) => {
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.reload();
    }
  },
  
  redirectToLogin: (nextUrl) => {
    const params = new URLSearchParams();
    if (nextUrl) params.set('next', nextUrl);
    window.location.href = `/signin?${params.toString()}`;
  },
  
  updateMe: async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);
    
    if (error) throw error;
  },
};

// Functions invocation helper
export const supabaseFunctions = {
  invoke: async (functionName, payload = {}) => {
    // For migration phase, this calls the existing Base44 backend functions
    // Later, you'll migrate these to Supabase Edge Functions
    const response = await fetch(`/api/functions/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `Function ${functionName} failed`);
    }
    
    const data = await response.json();
    return { data };
  },
};