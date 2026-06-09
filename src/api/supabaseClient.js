// Re-export the supabase instance from base44Client so there's only one client
export { base44 as supabaseShim } from './base44Client';

import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);