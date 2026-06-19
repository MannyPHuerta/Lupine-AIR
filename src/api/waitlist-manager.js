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
    const { action, entryId, notes, lead, email } = body;

    // LIST
    if (action === 'list') {
      const [{ data: waitlist, error: wErr }, { data: trials, error: tErr }] = await Promise.all([
        sb.from('waitlist_entries').select('*').order('created_at', { ascending: false }),
        sb.from('subscriber_trials').select('*').order('created_at', { ascending: false }),
      ]);
      if (wErr) return res.status(500).json({ error: wErr.message });
      if (tErr) return res.status(500).json({ error: tErr.message });
      return res.status(200).json({ waitlist: waitlist || [], trials: trials || [] });
    }

    // REJECT
    if (action === 'reject') {
      const { error } = await sb.from('waitlist_entries').update({ status: 'rejected' }).eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // DELETE ENTRY (waitlist)
    if (action === 'deleteEntry') {
      const { error } = await sb.from('waitlist_entries').delete().eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // DELETE TRIAL
    if (action === 'deleteTrial') {
      const { error } = await sb.from('subscriber_trials').delete().eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // RESEND MAGIC LINK
    if (action === 'resendMagicLink') {
      if (!email) return res.status(400).json({ error: 'email required' });

      // Ensure user exists in auth.users
      await sb.auth.admin.createUser({ email, email_confirm: true });

      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: 'https://theprojectair.com/ops' },
      });

      const actionLink = linkData?.properties?.action_link;
      if (linkErr || !actionLink) {
        return res.status(500).json({ error: 'Failed to generate magic link', details: linkErr?.message });
      }

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

      const emailResult = await sendEmail(apiKey, {
        from: 'AIR by Lupine <info@theprojectair.com>',
        to: [email],
        subject: 'Your AIR Sign-In Link',
        html: [
          '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">',
          '<div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">',
          '<h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">Sign in to AIR</h1>',
          '</div>',
          '<div style="padding:32px;text-align:center">',
          '<p style="color:#94a3b8;margin:0 0 24px">Click the button below to sign in. This link expires in 1 hour.</p>',
          '<a href="' + actionLink + '" style="background:#0ea5e9;color:#000;font-weight:900;font-size:16px;padding:16px 40px;border-radius:10px;text-decoration:none;display:inline-block">Sign In to AIR &rarr;</a>',
          '</div>',
          '</div>',
        ].join(''),
      });

      console.log('[waitlist-manager] resendMagicLink result:', JSON.stringify(emailResult));
      return res.status(200).json({ success: true, emailSent: !!emailResult?.id, emailResult });
    }

    // APPROVE
    if (action === 'approve') {
      const { data: entry, error: fetchErr } = await sb
        .from('waitlist_entries').select('*').eq('id', entryId).single();
      if (fetchErr || !entry) return res.status(404).json({ error: 'Entry not found', details: fetchErr?.message });

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
      if (trialErr) return res.status(500).json({
        error: 'subscriber_trials insert failed: ' + trialErr.message,
        code: trialErr.code,
        details: trialErr.details,
      });

      await sb.from('waitlist_entries').update({
        status: 'approved',
        approved_at: now.toISOString(),
        notes: notes || null,
      }).eq('id', entryId);

      // Ensure user exists first (ignore error if already exists)
      const createResult = await sb.auth.admin.createUser({ email: entry.email, email_confirm: true });
      console.log('[waitlist-manager] createUser result:', JSON.stringify(createResult));

      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email: entry.email,
        options: { redirectTo: 'https://theprojectair.com/ops' },
      });
      console.log('[waitlist-manager] generateLink result:', JSON.stringify({ linkData, linkErr }));

      const signInLink = linkData?.properties?.action_link;
      if (linkErr || !signInLink) {
        return res.status(500).json({
          error: 'Failed to generate magic link for approval email',
          details: linkErr?.message,
          linkData,
        });
      }

      const apiKey = process.env.RESEND_API_KEY;
      let emailResult = null;
      if (apiKey) {
        emailResult = await sendEmail(apiKey, {
          from: 'AIR by Lupine <info@theprojectair.com>',
          to: [entry.email],
          subject: 'Your AIR trial is approved',
          html: [
            '<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">',
            '<div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">',
            '<h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">You\'re in!</h1>',
            '</div>',
            '<div style="padding:32px;text-align:center">',
            '<p style="color:#94a3b8">Hi ' + (entry.name || 'there') + ', your AIR early access has been approved.</p>',
            '<a href="' + signInLink + '" style="background:#0ea5e9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block">Sign In to AIR &rarr;</a>',
            '</div>',
            '</div>',
          ].join(''),
        });
      }

      return res.status(200).json({
        success: true,
        emailSent: !!emailResult?.id,
        emailResult,
        signInLink,
        hasApiKey: !!apiKey,
      });
    }

    // ADD LEAD
    if (action === 'addLead') {
      const { error } = await sb.from('waitlist_entries').insert({ ...(lead || {}), status: 'pending' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('[waitlist-manager] unhandled:', e);
    return res.status(500).json({ error: e.message || 'Unhandled server error' });
  }
}