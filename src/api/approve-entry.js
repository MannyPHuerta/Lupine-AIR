// @ts-check
/* global process */
// POST /api/approve-entry
// Body: { entryId, notes }
// Requires: Authorization: Bearer <admin user JWT>
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const resendKey = process.env.RESEND_API_KEY || '';
  if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  if (!resendKey) return res.status(500).json({ error: 'Missing RESEND_API_KEY' });

  const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1. Admin gate via user_roles (NOT profiles.role)
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: isAdmin, error: roleErr } = await sb.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (roleErr) return res.status(500).json({ error: 'Role check failed: ' + roleErr.message });
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  // 2. Body
  const { entryId, notes } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!entryId) return res.status(400).json({ error: 'entryId required' });

  // 3. Fetch entry
  const { data: entry, error: fetchErr } = await sb.from('waitlist_entries').select('*').eq('id', entryId).single();
  if (fetchErr || !entry) return res.status(404).json({ error: 'Entry not found' });

  const now = new Date();
  const toDate = (d) => d.toISOString().split('T')[0];
  const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

  // 4. Trial row
  const { error: trialErr } = await sb.from('subscriber_trials').insert({
    email: entry.email,
    company_name: entry.company || null,
    contact_name: entry.name || null,
    phone: entry.phone || null,
    branches: entry.branches || null,
    status: 'invited',
    plan_tier: 'pro',
    trial_start_date: toDate(now),
    trial_ends_at: toDate(trialEndsAt),
    lockout_date: toDate(lockoutDate),
    approved_by: user.email,
    approved_at: now.toISOString(),
    notes: notes || null,
  });
  if (trialErr) return res.status(500).json({ error: 'Failed to create trial: ' + trialErr.message });

  // 5. Mark approved
  await sb.from('waitlist_entries')
    .update({ status: 'approved', approved_by: user.email, approved_at: now.toISOString(), notes: notes || null })
    .eq('id', entryId);

  // 6. Ensure auth user exists, THEN generate a magic link (magiclink requires existing user)
  let signInLink = null;
  let linkErrorMsg = null;
  try {
    // Idempotent create. Ignore "already registered" errors.
    const { error: createErr } = await sb.auth.admin.createUser({
      email: entry.email,
      email_confirm: true,
      user_metadata: { full_name: entry.name || null, company: entry.company || null },
    });
    if (createErr && !/already|registered|exists/i.test(createErr.message)) {
      console.warn('[approve-entry] createUser warn:', createErr.message);
    }

    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email: entry.email,
      options: { redirectTo: 'https://theprojectair.com/ops' },
    });
    if (linkErr) {
      linkErrorMsg = linkErr.message;
      console.error('[approve-entry] generateLink failed:', linkErr.message);
    } else {
      signInLink = linkData?.properties?.action_link || null;
    }
  } catch (e) {
    linkErrorMsg = e.message;
    console.error('[approve-entry] auth flow failed:', e.message);
  }

  // 7. Send welcome email — DO NOT swallow errors silently
  const resend = new Resend(resendKey);
  const linkBlock = signInLink
    ? `<p style="margin:24px 0"><a href="${signInLink}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign In to AIR →</a></p><p style="font-size:12px;color:#64748b">This link expires in 24 hours.</p>`
    : `<p>Sign in here: <a href="https://theprojectair.com/signin">https://theprojectair.com/signin</a></p>`;

  let emailResult;
  try {
    emailResult = await resend.emails.send({
      from: 'AIR by Lupine <info@theprojectair.com>',
      to: [entry.email],
      subject: `🎉 Your AIR trial is approved — sign in to get started`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px">
          <h1 style="margin:0 0 8px">You're in! 🚀</h1>
          <p>Hi ${entry.name || 'there'}, your early access for AIR by Lupine has been approved.</p>
          ${linkBlock}
          <p style="font-size:14px;color:#475569">
            Company: ${entry.company || 'N/A'}<br/>
            Full Pro access until: ${toDate(trialEndsAt)}<br/>
            Account pauses on: ${toDate(lockoutDate)}
          </p>
          <p style="font-size:12px;color:#94a3b8">Questions? Reply to this email — we're here.</p>
        </div>`,
    });
  } catch (e) {
    console.error('[approve-entry] resend threw:', e.message);
    return res.status(500).json({ error: 'Email send failed: ' + e.message, signInLink, linkErrorMsg });
  }

  if (emailResult?.error) {
    console.error('[approve-entry] resend error:', emailResult.error);
    return res.status(500).json({ error: 'Resend rejected: ' + JSON.stringify(emailResult.error), linkErrorMsg });
  }

  return res.status(200).json({
    success: true,
    emailId: emailResult?.data?.id || null,
    linkGenerated: !!signInLink,
    linkErrorMsg,
  });
}