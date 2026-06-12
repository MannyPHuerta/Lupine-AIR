// Simple test endpoint to verify Vercel + Supabase connection
/* global process */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('[api/test] Hit! Method:', req.method);
  console.log('[api/test] Env check:', {
    hasUrl: !!process.env.SUPABASE_URL,
    hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    urlPreview: process.env.SUPABASE_URL?.slice(0, 30),
  });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Missing env vars',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey 
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test connection
  const { data, error } = await supabase.from('waitlist_entries').select('count', { count: 'exact', head: true });
  
  return res.status(200).json({
    ok: !error,
    error: error?.message || null,
    supabaseUrl: supabaseUrl.slice(0, 40) + '...',
    timestamp: new Date().toISOString(),
  });
}