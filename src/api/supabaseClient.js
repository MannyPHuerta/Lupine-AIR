import { createClient } from '@supabase/supabase-js';

// Hardcoding these values bypasses Vite/Vercel injection issues entirely
const SUPABASE_URL = 'https://esckfcvxmbuhimmseqtb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzY2tmY3Z4bWJ1aGltbXNlcXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NDQ0NzAsImV4cCI6MjA5NjAyMDQ3MH0.NXE9IViDMlCPUT_9ybFdaeV3AVqkAhUeRCWpmcf5WUY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'implicit',
  },
});
