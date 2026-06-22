// @ts-check
// Vercel serverless function — Waitlist admin operations
/* global process */
import { createClient } from '@supabase/supabase-js';

const SITE = 'https://theprojectair.com';
const DEMO_PATH = '/demo';
const CALLBACK_URL = `${SITE}/auth/callback?next=${encodeURIComponent(DEMO_PATH)}`;
const FROM = 'AIR by Lupine <info@theprojectair.com>';

const getSupabase = () => {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!rawUrl || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  return createClient(url, key, { auth: { persistSession: false } });
};

/**
 * Send an email via Resend. Returns { ok, id?, error? }.
 */
async function sendEmail(apiKey, payload) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.warn('[waitlist-manager] resend non-2xx:', r.status, body);
      return { ok: false, error: body?.message || body?.error || `HTTP ${r.status}`, status: r.status };
    }
    return { ok: true, id: body?.id, raw: body };
  } catch (e) {
    console.warn('[waitlist-manager] resend fetch error:', e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Ensure an auth user exists for this email. Treats "already registered" as success.
 */
async function ensureAuthUser(sb, email) {
  const { error } = await sb.auth.admin.createUser({ email, email_confirm: true });
  if (!error) return { ok: true, created: true };
  const msg = (error.message || '').toLowerCase();
  if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
    return { ok: true, created: false };
  }
  return { ok: false, error: error.message };
}

/**
 * Generate a magic link that lands the user on the demo route after callback.
 */
async function generateDemoMagicLink(sb, email) {
  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: CALLBACK_URL },
  });
  const link = data?.properties?.action_link;
  if (error || !link) return { ok: false, error: error?.message || 'no action_link' };
  return { ok: true, link };
}

/**
 * TODO: replace this stub with a real demo-tenant provisioner (RPC or function).
 * Should clone a demo tenant for the email and return the route to land on.
 * For now we just return the canonical demo path.
 */
async function provisionDemoTenant(_sb, _email, _trialId) {
  return { ok: true, route: DEMO_PATH };
}

function approvalEmailHtml({ name, signInLink }) {
  const safeName = (name || 'there').replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">You're in!</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Hi ${safeName}, your AIR early access has been approved.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5">Click below to open your preloaded demo workspace — customers, equipment, and rentals already populated so you can test-drive AIR right away. No signup required to explore.</p>
    <p style="margin:0 0 24px">
      <a href="${signInLink}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Open my AIR demo →</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#555">Link expires in 1 hour. If the button doesn't work, paste this URL:</p>
    <p style="margin:0;font-size:12px;color:#555;word-break:break-all">${signInLink}</p>
  </div>
</body></html>`;
}

function magicLinkEmailHtml({ signInLink }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">Sign in to AIR</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.5">Click below to sign in. This link expires in 1 hour.</p>
    <p style="margin:0 0 24px">
      <a href="${signInLink}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Sign In to AIR →</a>
    </p>
    <p style="margin:0;font-size:12px;color:#555;word-break:break-all">${signInLink}</p>
  </div>
</body></html>`;
}

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

    // ---------- LIST ----------
    if (action === 'list') {
      const [{ data: waitlist, error: wErr }, { data: trials, error: tErr }] = await Promise.all([
        sb.from('waitlist_entries').select('*').order('created_at', { ascending: false }),
        sb.from('subscriber_trials').select('*').order('created_at', { ascending: false }),
      ]);
      if (wErr) return res.status(500).json({ error: wErr.message });
      if (tErr) return res.status(500).json({ error: tErr.message });
      return res.status(200).json({ waitlist: waitlist || [], trials: trials || [] });
    }

    // ---------- REJECT ----------
    if (action === 'reject') {
      if (!entryId) return res.status(400).json({ error: 'entryId required' });
      const { error } = await sb.from('waitlist_entries').update({ status: 'rejected' }).eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // ---------- DELETE ENTRY ----------
    if (action === 'deleteEntry') {
      if (!entryId) return res.status(400).json({ error: 'entryId required' });
      const { error } = await sb.from('waitlist_entries').delete().eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // ---------- DELETE TRIAL ----------
    if (action === 'deleteTrial') {
      if (!entryId) return res.status(400).json({ error: 'entryId required' });
      const { error } = await sb.from('subscriber_trials').delete().eq('id', entryId);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // ---------- RESEND MAGIC LINK ----------
    if (action === 'resendMagicLink') {
      if (!email) return res.status(400).json({ error: 'email required' });

      const userRes = await ensureAuthUser(sb, email);
      if (!userRes.ok) return res.status(500).json({ error: 'createUser failed', details: userRes.error });

      const linkRes = await generateDemoMagicLink(sb, email);
      if (!linkRes.ok) return res.status(500).json({ error: 'Failed to generate magic link', details: linkRes.error });

      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

      const emailResult = await sendEmail(apiKey, {
        from: FROM,
        to: [email],
        subject: 'Your AIR Sign-In Link',
        html: magicLinkEmailHtml({ signInLink: linkRes.link }),
      });

      if (!emailResult.ok) {
        return res.status(502).json({ error: 'Email send failed', details: emailResult.error });
      }
      return res.status(200).json({ success: true, emailSent: true, emailId: emailResult.id });
    }

    // ---------- APPROVE ----------
    if (action === 'approve') {
      if (!entryId) return res.status(400).json({ error: 'entryId required' });

      const { data: entry, error: fetchErr } = await sb
        .from('waitlist_entries').select('*').eq('id', entryId).single();
      if (fetchErr || !entry) {
        return res.status(404).json({ error: 'Entry not found', details: fetchErr?.message });
      }
      if (!entry.email) return res.status(400).json({ error: 'Entry has no email' });

      const now = new Date();
      const toDate = (d) => d.toISOString().split('T')[0];
      const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

      // Idempotent upsert on email — re-approve is safe.
      const { data: trialRow, error: trialErr } = await sb
        .from('subscriber_trials')
        .upsert(
          {
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
          },
          { onConflict: 'email' }
        )
        .select()
        .single();
      if (trialErr) {
        return res.status(500).json({
          error: 'subscriber_trials upsert failed: ' + trialErr.message,
          code: trialErr.code,
          details: trialErr.details,
        });
      }

      // Mark waitlist entry approved — check error.
      const { error: updErr } = await sb.from('waitlist_entries').update({
        status: 'approved',
        approved_at: now.toISOString(),
        notes: notes || null,
      }).eq('id', entryId);
      if (updErr) {
        return res.status(500).json({ error: 'waitlist_entries update failed: ' + updErr.message });
      }

      // Ensure auth user.
      const userRes = await ensureAuthUser(sb, entry.email);
      if (!userRes.ok) {
        return res.status(500).json({ error: 'createUser failed', details: userRes.error });
      }

      // Provision demo tenant (stub for now — returns /demo).
      const provRes = await provisionDemoTenant(sb, entry.email, trialRow?.id);
      if (!provRes.ok) {
        return res.status(500).json({ error: 'demo provisioning failed', details: provRes.error });
      }

      // Generate magic link that lands on the demo route.
      const linkRes = await generateDemoMagicLink(sb, entry.email);
      const signInLink = linkRes.ok ? linkRes.link : `${SITE}/signin`;
      if (!linkRes.ok) console.warn('[waitlist-manager] magic link failed:', linkRes.error);

      // Send approval email.
      const apiKey = process.env.RESEND_API_KEY;
      let emailResult = { ok: false, error: 'RESEND_API_KEY not set' };
      if (apiKey) {
        emailResult = await sendEmail(apiKey, {
          from: FROM,
          to: [entry.email],
          subject: 'Your AIR demo is ready',
          html: approvalEmailHtml({ name: entry.name, signInLink }),
        });
      }

      return res.status(200).json({
        success: true,
        emailSent: emailResult.ok,
        emailId: emailResult.id || null,
        emailError: emailResult.ok ? null : emailResult.error,
        signInLink,
        hasApiKey: !!apiKey,
        trialId: trialRow?.id || null,
      });
    }

    // ---------- ADD LEAD ----------
    if (action === 'addLead') {
      if (!lead || !lead.email) return res.status(400).json({ error: 'lead.email required' });
      const { error } = await sb.from('waitlist_entries').insert({ ...lead, status: 'pending' });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action: ' + action });

  } catch (e) {
    console.error('[waitlist-manager] unhandled:', e);
    return res.status(500).json({ error: e.message || 'Unhandled server error' });
  }
}
