// @ts-check
// Vercel serverless function — Debug waitlist data
/* global process */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing Supabase credentials',
        has_url: !!supabaseUrl,
        has_key: !!supabaseKey,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data: waitlist, error: wErr } = await supabase
      .from('waitlist_entries')
      .select('*')
      .order('created_at', { ascending: false });

    const { count, error: countErr } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      success: true,
      waitlist_count: count || 0,
      waitlist: waitlist || [],
      errors: {
        waitlist: wErr?.message || null,
        count: countErr?.message || null,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (e) {
    console.error('[waitlist-debug] unhandled:', e);
    return res.status(500).json({
      error: e.message || 'Unhandled server error',
      stack: e.stack,
    });
  }
}