// BACKUP: 2026-06-17
// Source: api/approve-entry.js
// @ts-check
/* global process */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms))]);

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

  const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { data: isAdmin, error: roleErr } = await sb.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (roleErr) return res.status(500).json({ error: 'Role check failed: ' + roleErr.message });
  if (!isAdmin) return res.status(403).json({ error: 'Admin access required' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
  const { entryId, notes } = body;
  if (!entryId) return res.status(400).json({ error: 'entryId required' });

  const { data: entry, error: fetchErr } = await sb.from('waitlist_entries').select('*').eq('id', entryId).single();
  if (fetchErr || !entry) return res.status(404).json({ error: 'Entry not found' });

  const now = new Date();
  const toDate = (d) => d.toISOString().split('T')[0];
  const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

  const { error: trialErr } = await sb.from('subscriber_trials').insert({
    email: entry.email, company_name: entry.company || null, contact_name: entry.name || null,
    phone: entry.phone || null, branches: entry.branches || null, status: 'invited', plan_tier: 'pro',
    trial_start_date: toDate(now), trial_ends_at: toDate(trialEndsAt), lockout_date: toDate(lockoutDate),
    approved_by: user.email, approved_at: now.toISOString(), notes: notes || null,
  });
  if (trialErr) return res.status(500).json({ error: 'Failed to create trial: ' + trialErr.message });

  await sb.from('waitlist_entries').update({ status: 'approved', approved_by: user.email, approved_at: now.toISOString(), notes: notes || null }).eq('id', entryId);

  try { await withTimeout(sb.auth.admin.createUser({ email: entry.email, email_confirm: true }), 10000, 'createUser'); } catch (e) {}

  let signInLink = 'https://theprojectair.com/signin';
  let linkErrorMsg = null;
  try {
    const { data: linkData, error: linkErr } = await withTimeout(
      sb.auth.admin.generateLink({ type: 'magiclink', email: entry.email, options: { redirectTo: 'https://theprojectair.com/ops' } }),
      10000, 'generateLink'
    );
    if (linkErr) linkErrorMsg = linkErr.message;
    else if (linkData?.properties?.action_link) signInLink = linkData.properties.action_link;
  } catch (e) { linkErrorMsg = e.message; }

  if (!resendKey) return res.status(500).json({ error: 'Missing RESEND_API_KEY' });
  const resend = new Resend(resendKey);
  const linkBlock = `<p><a href="${signInLink}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign In to AIR →</a></p>`;

  let emailResult;
  try {
    emailResult = await resend.emails.send({
      from: 'AIR by Lupine <info@theprojectair.com>', to: [entry.email],
      subject: `🎉 Your AIR trial is approved — sign in to get started`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px">
        <h1>You're in! 🚀</h1><p>Hi ${entry.name || 'there'}, your early access has been approved.</p>
        ${linkBlock}<p style="font-size:12px;color:#64748b">This link expires in 24 hours.</p>
        <p>Company: ${entry.company || 'N/A'} | Full access until: ${toDate(trialEndsAt)} | Pauses: ${toDate(lockoutDate)}</p>
      </div>`,
    });
  } catch (e) { return res.status(500).json({ error: 'Email send failed: ' + e.message, signInLink, linkErrorMsg }); }

  if (emailResult?.error) return res.status(500).json({ error: 'Resend rejected: ' + JSON.stringify(emailResult.error), linkErrorMsg });

  return res.status(200).json({ success: true, emailId: emailResult?.data?.id || null, linkGenerated: !!signInLink, linkErrorMsg });
}