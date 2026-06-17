// @ts-check
/* global process */
// POST /api/approve-entry
// Body: { entryId, notes }

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const config = { runtime: 'nodejs' };

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
    .replace(/\/rest\/v1\/?$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  const { entryId, notes } = body;
  if (!entryId) return res.status(400).json({ error: 'entryId required' });

  // Fetch the waitlist entry
  const { data: entry, error: fetchErr } = await sb
    .from('waitlist_entries')
    .select('*')
    .eq('id', entryId)
    .single();
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
  if (trialErr) {
    return res.status(500).json({ error: 'Failed to create trial: ' + trialErr.message });
  }

  // Update waitlist entry status
  const { error: updateErr } = await sb
    .from('waitlist_entries')
    .update({
      status: 'approved',
      approved_at: now.toISOString(),
      notes: notes || null,
    })
    .eq('id', entryId);
  if (updateErr) {
    console.warn('[approve-entry] waitlist update failed:', updateErr.message);
  }

  // Ensure auth user exists (idempotent — ignore "already registered")
  let createUserMsg = null;
  try {
    const { error: createErr } = await withTimeout(
      sb.auth.admin.createUser({ email: entry.email, email_confirm: true }),
      10000,
      'createUser'
    );
    if (createErr && !/already|registered|exists/i.test(createErr.message || '')) {
      createUserMsg = createErr.message;
    }
  } catch (e) {
    createUserMsg = e.message;
  }

  // Generate magic link
  let signInLink = 'https://theprojectair.com/signin';
  let linkErrorMsg = null;
  try {
    const { data: linkData, error: linkErr } = await withTimeout(
      sb.auth.admin.generateLink({
        type: 'magiclink',
        email: entry.email,
        options: { redirectTo: 'https://theprojectair.com/ops' },
      }),
      10000,
      'generateLink'
    );
    if (linkErr) {
      linkErrorMsg = linkErr.message;
    } else if (linkData?.properties?.action_link) {
      signInLink = linkData.properties.action_link;
    }
  } catch (e) {
    linkErrorMsg = e.message;
  }

  // Send welcome email
  let emailId = null;
  let emailError = null;
  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    emailError = 'RESEND_API_KEY not configured';
  } else {
    try {
      const resend = new Resend(apiKey);
      // NOTE: switch `from` to "AIR by Lupine <info@theprojectair.com>"
      // ONLY after theprojectair.com is verified in this Resend account.
      const result = await withTimeout(
        resend.emails.send({
          from: 'AIR <onboarding@resend.dev>',
          to: [entry.email],
          subject: '🎉 Your AIR trial is approved — sign in to get started',
          html: `
            <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
              <h1 style="font-size:22px;margin:0 0 8px">You're in! 🚀</h1>
              <p style="margin:0 0 16px;color:#475569">Your AIR early access has been approved.</p>
              <p>Hi ${entry.name || 'there'},</p>
              <p>Click the button below to sign in — no password needed.</p>
              <p style="margin:24px 0">
                <a href="${signInLink}"
                   style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
                  Sign In to AIR →
                </a>
              </p>
              <p style="font-size:12px;color:#64748b">This link expires in 24 hours.</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
              <p style="font-size:14px;line-height:1.6">
                <strong>Your trial summary</strong><br/>
                Company: ${entry.company || 'N/A'}<br/>
                Full Pro access until: ${toDate(trialEndsAt)}<br/>
                Account pauses on: ${toDate(lockoutDate)}
              </p>
              <p style="font-size:12px;color:#64748b;margin-top:24px">
                Questions? Reply to this email — we're here.<br/>
                theprojectair.com
              </p>
            </div>
          `,
        }),
        10000,
        'resend.send'
      );
      if (result?.error) {
        emailError = result.error.message || JSON.stringify(result.error);
      } else {
        emailId = result?.data?.id || null;
      }
    } catch (e) {
      emailError = e.message;
    }
  }

  return res.status(200).json({
    success: true,
    entryId,
    emailId,
    emailError,
    linkGenerated: !linkErrorMsg,
    linkErrorMsg,
    createUserMsg,
  });
}
