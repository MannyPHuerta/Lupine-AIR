// Debug endpoint to verify Supabase connection
/* global process */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[debug-supabase] SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('[debug-supabase] VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
  console.log('[debug-supabase] Using URL:', supabaseUrl);
  console.log('[debug-supabase] Key present:', !!supabaseKey);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test connection
  const { data, error } = await supabase.from('waitlist_entries').select('count', { count: 'exact', head: true });

  res.status(200).json({
    supabaseUrl: supabaseUrl,
    keyPresent: !!supabaseKey,
    connectionTest: error ? 'FAILED: ' + error.message : 'OK',
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL?.slice(0, 20) + '...',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL?.slice(0, 20) + '...',
    }
  });
}