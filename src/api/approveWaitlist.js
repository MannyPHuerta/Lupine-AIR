// Vercel serverless function — Admin: approve a waitlist entry
/* global process */
// POST /api/approveWaitlist
// Body: { entryId, notes }
// Requires: Authorization header with a valid Supabase admin session token

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify caller is an admin
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  const { entryId, notes } = req.body;
  if (!entryId) return res.status(400).json({ error: 'entryId required' });

  // Fetch the waitlist entry
  const { data: entry, error: fetchErr } = await supabaseAdmin
    .from('waitlist_entries')
    .select('*')
    .eq('id', entryId)
    .single();

  if (fetchErr || !entry) return res.status(404).json({ error: 'Entry not found' });

  const now = new Date();
  const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

  // Create subscriber trial record in Supabase
  const { error: trialErr } = await supabaseAdmin
    .from('subscriber_trials')
    .insert({
      email: entry.email,
      company_name: entry.company,
      contact_name: entry.name,
      phone: entry.phone,
      branches: entry.branches,
      status: 'invited',
      plan_tier: 'pro',
      trial_start_date: now.toISOString().split('T')[0],
      trial_ends_at: trialEndsAt.toISOString().split('T')[0],
      lockout_date: lockoutDate.toISOString().split('T')[0],
      approved_by: user.email,
      approved_at: now.toISOString(),
      notes: notes || null,
    });

  if (trialErr) return res.status(500).json({ error: 'Failed to create trial: ' + trialErr.message });

  // Mark waitlist entry as approved
  await supabaseAdmin
    .from('waitlist_entries')
    .update({ status: 'approved', approved_by: user.email, approved_at: now.toISOString() })
    .eq('id', entryId);

  // Send welcome email via Resend
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AIR Platform <info@theprojectair.com>',
        to: [entry.email],
        subject: "You're in! Your AIR Pro trial starts now 🚀",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#0ea5e9">Welcome to AIR, ${entry.name || 'there'}!</h2>
            <p style="color:#555;line-height:1.6">Your early access has been approved. Here's your trial timeline:</p>
            <div style="background:#f0f9ff;border:1px solid #0ea5e9;padding:16px;border-radius:8px;margin:20px 0">
              <p style="margin:0;color:#0369a1"><strong>Day 1–14:</strong> Full Pro access — all features unlocked</p>
              <p style="margin:8px 0 0 0;color:#0369a1"><strong>Day 14–30:</strong> Core tier — essential features only</p>
              <p style="margin:8px 0 0 0;color:#0369a1"><strong>Day 30+:</strong> Account paused until you subscribe</p>
            </div>
            <p style="color:#555;">We'll send your account setup instructions separately. Questions? Reply to this email.</p>
          </div>
        `,
      }),
    });
  }

  return res.status(200).json({ success: true, trialEndsAt: trialEndsAt.toISOString().split('T')[0] });
}