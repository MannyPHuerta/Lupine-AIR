import { createClient } from '@supabase/supabase-js';

// Vite environment variables are exposed via import.meta.env
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

// Debug logging
if (typeof window !== 'undefined') {
  console.log('[SupabaseClient] Env check:', {
    VITE_SUPABASE_URL: SUPABASE_URL ? '[SET]' : '[MISSING]',
    VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '[SET]' : '[MISSING]'
  });
}

// Validate Supabase URL before creating client
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

export const supabase = isValidUrl(SUPABASE_URL) && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Log warning if Supabase is not configured (for debugging)
if (!supabase && typeof window !== 'undefined') {
  console.warn('Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  console.warn('Current values:', { SUPABASE_URL: SUPABASE_URL ? '[SET]' : '[MISSING]', SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '[SET]' : '[MISSING]' });
}