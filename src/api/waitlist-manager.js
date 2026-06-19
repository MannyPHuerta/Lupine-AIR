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

    // DELETE USER (auth + all data)
    if (action === 'deleteUser') {
      const { error: authError } = await sb.auth.admin.deleteUser(email);
      if (authError) return res.status(500).json({ error: authError.message });
      
      // Cascade delete from app tables
      await Promise.all([
        sb.from('profiles').delete().eq('id', email),
        sb.from('waitlist_entries').delete().eq('email', email),
        sb.from('subscriber_trials').delete().eq('email', email),
        sb.from('tenants').delete().eq('admin_email', email),
      ]);
      
      return res.status(200).json({ success: true, message: 'User deleted from auth + all data' });
    }

    // DELETE TRIAL
    if (action === 'deleteTrial') {
      const { data: trial } = await sb.from('subscriber_trials').select('email').eq('id', entryId).single();
      const { error } = await sb.from('subscriber_trials').delete().eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      
      // Also delete the auth user if exists
      if (trial?.email) {
        try {
          await sb.auth.admin.deleteUser(trial.email);
          console.log('[waitlist-manager] Deleted auth user:', trial.email);
        } catch (e) {
          console.warn('[waitlist-manager] Failed to delete auth user:', e.message);
        }
      }
      return res.status(200).json({ success: true });
    }

    // DELETE USER (auth + tenant data)
    if (action === 'deleteUser') {
      const { email } = body;
      if (!email) return res.status(400).json({ error: 'email required' });
      
      // Delete auth user
      try {
        await sb.auth.admin.deleteUser(email);
        console.log('[waitlist-manager] Deleted auth user:', email);
      } catch (e) {
        console.warn('[waitlist-manager] Failed to delete auth user:', e.message);
      }
      
      // Clean up related data
      await sb.from('subscriber_trials').delete().eq('email', email);
      await sb.from('waitlist_entries').delete().eq('email', email);
      
      return res.status(200).json({ success: true });
    }

    // RESEND MAGIC LINK
    if (action === 'resendMagicLink') {
      if (!email) return res.status(400).json({ error: 'email required' });

      await sb.auth.admin.createUser({ email, email_confirm: true });

      const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: 'https://theprojectair.com/auth/callback' },
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
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Sign in to AIR</title></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
<h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">Sign in to AIR</h1>
</td></tr>
<tr><td style="padding:32px;text-align:center">
<p style="color:#94a3b8;margin:0 0 24px;font-size:16px">Click below to sign in. This link expires in 1 hour.</p>
<table cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#0ea5e9">
<a href="${actionLink}" style="display:inline-block;padding:16px 40px;color:#000;font-weight:900;font-size:16px;text-decoration:none">Sign In to AIR →</a>
</td></tr></table>
<p style="color:#475569;font-size:11px;margin-top:24px;word-break:break-all">${actionLink}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
      });

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

      const { error: trialErr } = await sb.from('subscriber_trials').upsert({
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
      }, { onConflict: 'email' });
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

      let signInLink = 'https://theprojectair.com/signin';
      try {
        await sb.auth.admin.createUser({ email: entry.email, email_confirm: true });
        const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
          type: 'magiclink',
          email: entry.email,
          options: { redirectTo: 'https://theprojectair.com/ops' },
        });
        const actionLink = linkData?.properties?.action_link;
        if (!linkErr && actionLink) signInLink = actionLink;
      } catch (e) {
        console.warn('[waitlist-manager] generateLink exception:', e.message);
      }

      const apiKey = process.env.RESEND_API_KEY;
      let emailResult = null;
      if (apiKey) {
        emailResult = await sendEmail(apiKey, {
          from: 'AIR by Lupine <info@theprojectair.com>',
          to: [entry.email],
          subject: 'Your AIR trial is approved',
          html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your AIR Trial is Approved</title></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#0f172a">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
<h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">You're in!</h1>
</td></tr>
<tr><td style="padding:32px;text-align:center">
<p style="color:#94a3b8;margin:0 0 24px;font-size:16px">Hi ${entry.name || 'there'}, your AIR early access has been approved.</p>
<table cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#0ea5e9">
<a href="${signInLink}" style="display:inline-block;padding:14px 32px;color:#000;font-weight:900;font-size:15px;text-decoration:none">Sign In to AIR →</a>
</td></tr></table>
<p style="color:#475569;font-size:10px;margin-top:24px;word-break:break-all">${signInLink}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
        });
      }

      return res.status(200).json({ success: true, emailSent: !!emailResult?.id, emailResult, signInLink, hasApiKey: !!apiKey });
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