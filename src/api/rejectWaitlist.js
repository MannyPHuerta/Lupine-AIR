// Vercel serverless function — Admin: reject a waitlist entry
/* global process */
// POST /api/rejectWaitlist
// Body: { entryId }

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single();

  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  const { entryId } = req.body;
  if (!entryId) return res.status(400).json({ error: 'entryId required' });

  const { error } = await supabaseAdmin
    .from('waitlist_entries')
    .update({ status: 'rejected', approved_by: user.email, approved_at: new Date().toISOString() })
    .eq('id', entryId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}