// @ts-check
/* global process */
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Roles live in public.user_roles, NOT on profiles
  const { data: roleRow, error: roleErr } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'owner'])
    .maybeSingle();

  if (roleErr) return res.status(500).json({ error: roleErr.message });
  if (!roleRow) return res.status(403).json({ error: 'Admin access required' });

  const type = req.query.type || 'waitlist';

  if (type === 'trials') {
    const { data, error } = await supabaseAdmin
      .from('subscriber_trials')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ data });
  }

  const { data, error } = await supabaseAdmin
    .from('waitlist_entries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}
