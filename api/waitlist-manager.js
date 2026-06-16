// @ts-check
/* global process */
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return res.status(500).json({ error: 'Missing Supabase credentials', has_url: !!url, has_key: !!key });

  const sb = createClient(url.replace(/\/rest\/v1\/?$/, ''), key, { auth: { persistSession: false } });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { action, entryId, notes, lead } = body;

  // LIST — subscriber_trials failure is non-fatal
  if (action === 'list') {
    const { data: waitlist, error: wErr } = await sb
      .from('waitlist_entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (wErr) return res.status(500).json({ error: wErr.message });

    const { data: trials } = await sb
      .from('subscriber_trials')
      .select('*')
      .order('created_at', { ascending: false });

    return res.status(200).json({ waitlist: waitlist || [], trials: trials || [] });
  }

  // REJECT
  if (action === 'reject') {
    const { error } = await sb.from('waitlist_entries').update({ status: 'rejected' }).eq('id', entryId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // APPROVE
  if (action === 'approve') {
    const { data: entry, error: fetchErr } = await sb.from('waitlist_entries').select('*').eq('id', entryId).single();
    if (fetchErr || !entry) return res.status(404).json({ error: 'Entry not found' });

    const now = new Date();
    const toDate = (d) => d.toISOString().split('T')[0];
    const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

    const { error: trialErr } = await sb.from('subscriber_trials').insert({
      email: entry.email,
      company_name: entry.company,
      contact_name: entry.name,
      phone: entry.phone,
      branches: entry.branches,
      status: 'invited',
      plan_tier: 'pro',
      trial_start_date: toDate(now),
      trial_ends_at: toDate(trialEndsAt),
      lockout_date: toDate(lockoutDate),
      notes: notes || null,
    });
    if (trialErr) return res.status(500).json({ error: trialErr.message });

    await sb.from('waitlist_entries').update({
      status: 'approved',
      approved_at: now.toISOString(),
      notes: notes || null,
    }).eq('id', entryId);

    let signInLink = 'https://theprojectair.com/signin';
    try {
      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email: entry.email,
        options: { redirectTo: 'https://theprojectair.com/ops' },
      });
      if (!linkErr) signInLink = linkData?.properties?.action_link || signInLink;
    } catch (e) {
      console.warn('[waitlist-manager] generateLink failed:', e.message);
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: 'AIR by Lupine <info@theprojectair.com>',
        to: [entry.email],
        subject: `🎉 Your AIR trial is approved — sign in to get started`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>You're in! 🚀</h2>
          <p>Hi ${entry.name || 'there'},</p>
          <p>Your early access to <strong>AIR by Lupine</strong> has been approved.</p>
          <p><a href__="${signInLink}" style="background:#0ea5e9;color:#000;font-weight:900;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block">Sign In to AIR →</a></p>
          <p style="font-size:12px;color:#888">This link expires in 24 hours.</p>
          <p>Company: ${entry.company || 'N/A'}<br/>Pro access until: ${toDate(trialEndsAt)}<br/>Account pauses: ${toDate(lockoutDate)}</p>
        </div>`,
      });
    }

    return res.status(200).json({ success: true });
  }

  // ADD LEAD
  if (action === 'addLead') {
    const { error } = await sb.from('waitlist_entries').insert({ ...(lead || {}), status: 'pending' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
