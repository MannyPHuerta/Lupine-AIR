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
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">Sign in to AIR</h1>
            </div>
            <div style="padding:32px;text-align:center">
              <p style="color:#94a3b8;margin:0 0 24px">Click the button below to sign in. This link expires in 1 hour.</p>
              <a href="${actionLink}" style="background:#0ea5e9;color:#000;font-weight:900;font-size:16px;padding:16px 40px;border-radius:10px;text-decoration:none;display:inline-block">
                Sign In to AIR →
              </a>
              <p style="color:#475569;font-size:11px;margin-top:16px;word-break:break-all">${actionLink}</p>
            </div>
          </div>
        `,
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

      // Ensure user exists in auth.users, then generate a magic link
      let signInLink = 'https://theprojectair.com/signin';
      try {
        const createResult = await sb.auth.admin.createUser({ email: entry.email, email_confirm: true });
        console.log('[waitlist-manager] createUser result:', JSON.stringify(createResult?.error || 'ok'));

        const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
          type: 'magiclink',
          email: entry.email,
          options: { redirectTo: 'https://theprojectair.com/ops' },
        });
        console.log('[waitlist-manager] generateLink result:', JSON.stringify({ linkData, linkErr }));
        const actionLink = linkData?.properties?.action_link;
        if (!linkErr && actionLink) {
          signInLink = actionLink;
        } else {
          console.warn('[waitlist-manager] no action_link — linkErr:', JSON.stringify(linkErr));
        }
      } catch (e) {
        console.warn('[waitlist-manager] generateLink exception:', e.message);
      }

      console.log('[waitlist-manager] final signInLink:', signInLink);

      const apiKey = process.env.RESEND_API_KEY;
      console.log('[waitlist-manager] RESEND_API_KEY present:', !!apiKey);

      let emailResult = null;
      if (!apiKey) {
        console.warn('[waitlist-manager] RESEND_API_KEY not set — skipping email');
      } else {
        emailResult = await sendEmail(apiKey, {
          from: 'AIR by Lupine <info@theprojectair.com>',
          to: [entry.email],
          subject: `🎉 Your AIR trial is approved — sign in to get started`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
                <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">You're in! 🚀</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px">Your AIR early access has been approved</p>
              </div>
              <div style="padding:32px">
                <p style="color:#94a3b8;line-height:1.7">Hi ${entry.name || 'there'},</p>
                <p style="color:#cbd5e1;line-height:1.7">
                  Your early access request for <strong style="color:#0ea5e9">AIR by Lupine</strong> has been approved.
                  Click the button below to sign in — no password needed.
                </p>
                <div style="text-align:center;margin:28px 0">
                  <a href="${signInLink}" style="background:#0ea5e9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block">
                    Sign In to AIR →
                  </a>
                  <p style="color:#475569;font-size:12px;margin-top:10px">This link expires in 24 hours.</p>
                  <p style="color:#475569;font-size:10px;margin-top:6px;word-break:break-all">Debug link: ${signInLink}</p>
                </div>
                <div style="background:#1e293b;border-radius:8px;padding:16px;font-size:13px;color:#475569">
                  <strong style="color:#94a3b8">Your trial summary:</strong><br/>
                  Company: ${entry.company || 'N/A'}<br/>
                  Full Pro access until: ${toDate(trialEndsAt)}<br/>
                  Account pauses on: ${toDate(lockoutDate)}
                </div>
                <p style="color:#475569;font-size:12px;margin-top:24px;text-align:center">
                  Questions? Reply to this email — we're here.<br/>
                  <a href="https://theprojectair.com" style="color:#0ea5e9">theprojectair.com</a>
                </p>
              </div>
            </div>
          `,
        });
        console.log('[waitlist-manager] Resend response:', JSON.stringify(emailResult));
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