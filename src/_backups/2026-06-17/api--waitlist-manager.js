// BACKUP: 2026-06-17
// Source: api/waitlist-manager.js
// @ts-check
// Vercel serverless function — Waitlist admin operations
/* global process */
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url.replace(/\/rest\/v1\/?$/, ''), key, { auth: { persistSession: false } });
};

const sendEmail = (apiKey, payload) =>
  fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json()).catch(e => console.warn('[waitlist-manager] email fetch error:', e.message));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sb = getSupabase();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { action, entryId, notes, lead } = body;

    if (action === 'list') {
      const [{ data: waitlist, error: wErr }, { data: trials, error: tErr }] = await Promise.all([
        sb.from('waitlist_entries').select('*').order('created_at', { ascending: false }),
        sb.from('subscriber_trials').select('*').order('created_at', { ascending: false }),
      ]);
      if (wErr) return res.status(500).json({ error: wErr.message });
      if (tErr) return res.status(500).json({ error: tErr.message });
      return res.status(200).json({ waitlist: waitlist || [], trials: trials || [] });
    }

    if (action === 'reject') {
      const { error } = await sb.from('waitlist_entries').update({ status: 'rejected' }).eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    if (action === 'approve') {
      const { data: entry, error: fetchErr } = await sb
        .from('waitlist_entries').select('*').eq('id', entryId).single();
      if (fetchErr || !entry) return res.status(404).json({ error: 'Entry not found', details: fetchErr?.message });

      const now = new Date();
      const toDate = (d) => d.toISOString().split('T')[0];
      const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

      const { error: trialErr } = await sb.from('subscriber_trials').insert({
        email: entry.email, company_name: entry.company, contact_name: entry.name,
        phone: entry.phone, branches: entry.branches, status: 'invited', plan_tier: 'pro',
        trial_start_date: toDate(now), trial_ends_at: toDate(trialEndsAt),
        lockout_date: toDate(lockoutDate), notes: notes || null,
      });
      if (trialErr) return res.status(500).json({ error: 'subscriber_trials insert failed: ' + trialErr.message });

      await sb.from('waitlist_entries').update({ status: 'approved', approved_at: now.toISOString(), notes: notes || null }).eq('id', entryId);

      let signInLink = 'https://theprojectair.com/signin';
      try {
        await sb.auth.admin.createUser({ email: entry.email, email_confirm: true });
        const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
          type: 'magiclink', email: entry.email, options: { redirectTo: 'https://theprojectair.com/ops' },
        });
        if (!linkErr && linkData?.properties?.action_link) signInLink = linkData.properties.action_link;
      } catch (e) { console.warn('[waitlist-manager] generateLink exception:', e.message); }

      const apiKey = process.env.RESEND_API_KEY;
      let emailResult = null;
      if (apiKey) {
        emailResult = await sendEmail(apiKey, {
          from: 'AIR by Lupine <info@theprojectair.com>', to: [entry.email],
          subject: `🎉 Your AIR trial is approved — sign in to get started`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h1>You're in! 🚀</h1><p>Hi ${entry.name || 'there'},</p>
            <a href="${signInLink}" style="background:#0ea5e9;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none">Sign In to AIR →</a>
            <p style="font-size:12px;color:#475569">Expires in 24 hours. Company: ${entry.company || 'N/A'} | Full access until: ${toDate(trialEndsAt)}</p>
          </div>`,
        });
      }

      return res.status(200).json({ success: true, emailSent: !!emailResult?.id, signInLink });
    }

    if (action === 'addLead') {
      const { error } = await sb.from('waitlist_entries').insert({ ...(lead || {}), status: 'pending' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unhandled server error' });
  }
}