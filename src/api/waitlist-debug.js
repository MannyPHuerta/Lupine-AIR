// @ts-check
/* global process */
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const info = {
    supabaseUrlResolved: supabaseUrl,
    supabaseUrlFirst40: supabaseUrl.slice(0, 40),
    supabaseKeyPresent: !!supabaseKey,
    supabaseKeyFirst10: supabaseKey ? supabaseKey.slice(0, 10) + '...' : 'MISSING',
    envKeys: Object.keys(process.env).filter(k => k.includes('SUPA') || k.includes('RESEND')),
  };

  // Try a test insert
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('waitlist_entries')
    .insert({ name: 'DEBUG TEST', email: `debug-${Date.now()}@test.com`, status: 'pending' })
    .select();

  return res.status(200).json({
    info,
    insertResult: { data, error },
  });
}