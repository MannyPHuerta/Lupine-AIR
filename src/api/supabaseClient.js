import { createClient } from '@supabase/supabase-js';

// For Base44 preview: hardcoded values (Supabase anon key is safe - it's client-side)
// For Vercel production: replace with import.meta.env?.VITE_SUPABASE_URL
const SUPABASE_URL = 'https://esckfcvxmbuhimmseqtb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzY2tmY3Z4bWJ1aGltbXNlcXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDQ0NzAsImV4cCI6MjA5NjAyMDQ3MH0.NXE9IViDMlCPUT_9ybFdaeV3AVqkAhUeRCWpmcf5WUY';

// Validate Supabase URL before creating client
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

export const supabase = isValidUrl(SUPABASE_URL) && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
      },
    })
  : null;

// Log warning if Supabase is not configured (for debugging)
if (!supabase && typeof window !== 'undefined') {
  console.warn('Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
  console.warn('Current values:', { SUPABASE_URL: SUPABASE_URL ? '[SET]' : '[MISSING]', SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? '[SET]' : '[MISSING]' });
}