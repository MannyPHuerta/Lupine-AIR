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

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const sb = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { entryId, notes } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  if (!entryId) return res.status(400).json({ error: 'entryId required' });

  // Fetch the waitlist entry
  const { data: entry, error: fetchErr } = await sb.from('waitlist_entries').select('*').eq('id', entryId).single();
  if (fetchErr || !entry) return res.status(404).json({ error: 'Entry not found' });

  const now = new Date();
  const toDate = (d) => d.toISOString().split('T')[0];
  const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

  // Create subscriber trial record
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
    notes: notes || null,
  });
  if (trialErr) return res.status(500).json({ error: 'Failed to create trial: ' + trialErr.message });

  // Update waitlist entry status
  await sb.from('waitlist_entries').update({
    status: 'approved',
    approved_at: now.toISOString(),
    notes: notes || null,
  }).eq('id', entryId);

  // Generate magic link
  let signInLink = 'https://theprojectair.com/signin';
  try {
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email: entry.email,
      options: { redirectTo: 'https://theprojectair.com/ops' },
    });
    if (!linkErr && linkData?.properties?.action_link) {
      signInLink = linkData.properties.action_link;
    }
  } catch (e) {
    console.warn('[approve-entry] generateLink failed:', e.message);
  }

  // Send welcome email
  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
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
    } catch (e) {
      console.warn('[approve-entry] email failed:', e.message);
    }
  }

  return res.status(200).json({ success: true });
}