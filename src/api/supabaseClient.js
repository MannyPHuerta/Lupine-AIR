import { createClient } from '@supabase/supabase-js';

// For Base44 preview: hardcoded values (Supabase anon key is safe - it's client-side)
// For Vercel production: replace with import.meta.env?.VITE_SUPABASE_URL
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

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