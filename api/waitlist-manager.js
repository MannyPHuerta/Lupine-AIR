// @ts-check
// Vercel serverless function — Waitlist admin operations
//
// Actions supported (unchanged signatures):
//   POST { action: 'list' }
//   POST { action: 'approve', entryId }
//   POST { action: 'deny',    entryId, reason? }
//
// Approve flow is fully idempotent:
//   1. Find/create subscriber_trials row (no upsert — explicit select + update/insert).
//   2. Find/create auth user (getUserByEmail first; treat "already registered" as success).
//   3. Reuse existing tenant for this user if present, else clone the template
//      tenant via RPC clone_tenant_for_trial and link the user via link_user_to_tenant.
//   4. Generate a fresh magic link with ?next=/dashboard.
//   5. Send the approval email via Resend, surfacing Resend errors.
//   6. Mark waitlist_entries.status = 'approved' with error checking.
//
/* global process */
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// env / clients
// ---------------------------------------------------------------------------
const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';
  if (!url || !key) {
    throw new Error('Supabase env missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VITE_SITE_URL ||
  'https://theprojectair.com';

const FROM_ADDRESS = 'AIR by Lupine <info@theprojectair.com>';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function isAlreadyRegistered(err) {
  if (!err) return false;
  const msg = String(err.message || err.error_description || '').toLowerCase();
  return (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists') ||
    msg.includes('duplicate')
  );
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY not configured', status: 0 };
  }
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    });
  } catch (e) {
    return { ok: false, error: `Resend network error: ${e.message}`, status: 0 };
  }
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    const detail = body && (body.error || body.message)
      ? JSON.stringify(body.error || body.message)
      : `HTTP ${res.status}`;
    return { ok: false, error: `Resend: ${detail}`, status: res.status };
  }
  if (body && body.error) {
    return { ok: false, error: `Resend: ${JSON.stringify(body.error)}`, status: res.status };
  }
  return { ok: true, id: body && body.id, status: res.status };
}

function approvalEmailHtml({ fullName, magicLink }) {
  const name = fullName ? fullName.split(' ')[0] : 'there';
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="margin:0 0 16px;">You're in, ${name}.</h2>
  <p>Your AIR by Lupine demo workspace is ready. It comes pre-loaded with sample
     branches, equipment, customers, and rentals so you can test-drive every
     screen without setup.</p>
  <p style="margin:24px 0;">
    <a href="${magicLink}" style="display:inline-block;background:#0b5fff;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">
      Open your demo
    </a>
  </p>
  <p style="font-size:13px;color:#555;">
    This sign-in link is single-use and expires shortly. If it expires, reply
    to this email and we'll send a fresh one.
  </p>
  <p style="font-size:13px;color:#555;">When you're ready to convert this demo
     into a paid account, you can do that from inside the app.</p>
</body></html>`;
}

function denialEmailHtml({ fullName, reason }) {
  const name = fullName ? fullName.split(' ')[0] : 'there';
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px;">
  <p>Hi ${name},</p>
  <p>Thanks for your interest in AIR by Lupine. We're unable to provision a
     trial workspace for you at this time${reason ? `: ${reason}` : ''}.</p>
  <p>If you think this was in error, just reply to this email.</p>
</body></html>`;
}

// ---------------------------------------------------------------------------
// approve handler
// ---------------------------------------------------------------------------
async function ensureAuthUser(sb, email) {
  const lookup = await sb.auth.admin.getUserByEmail(email);
  if (lookup && lookup.data && lookup.data.user) {
    return { user: lookup.data.user, created: false };
  }
  const created = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (created.error) {
    if (isAlreadyRegistered(created.error)) {
      const refetch = await sb.auth.admin.getUserByEmail(email);
      if (refetch && refetch.data && refetch.data.user) {
        return { user: refetch.data.user, created: false };
      }
    }
    throw new Error(`createUser failed: ${created.error.message}`);
  }
  return { user: created.data.user, created: true };
}

async function ensureSubscriberTrial(sb, entry) {
  const existing = await sb
    .from('subscriber_trials')
    .select('id')
    .eq('email', entry.email)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`subscriber_trials lookup failed: ${existing.error.message}`);
  }
  if (existing.data) {
    const upd = await sb
      .from('subscriber_trials')
      .update({
        full_name: entry.full_name || null,
        company_name: entry.company_name || null,
        phone: entry.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id);
    if (upd.error) {
      throw new Error(`subscriber_trials update failed: ${upd.error.message}`);
    }
    return existing.data.id;
  }
  const ins = await sb
    .from('subscriber_trials')
    .insert({
      email: entry.email,
      full_name: entry.full_name || null,
      company_name: entry.company_name || null,
      phone: entry.phone || null,
    })
    .select('id')
    .single();
  if (ins.error) {
    throw new Error(`subscriber_trials insert failed: ${ins.error.message}`);
  }
  return ins.data.id;
}

async function ensureTenantForUser(sb, userId, email, fullName) {
  const prof = await sb
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle();
  if (prof.error) {
    throw new Error(`profiles lookup failed: ${prof.error.message}`);
  }
  if (prof.data && prof.data.tenant_id) {
    return prof.data.tenant_id;
  }
  const clone = await sb.rpc('clone_tenant_for_trial', {
    p_email: email,
    p_full_name: fullName || null,
  });
  if (clone.error) {
    throw new Error(`clone_tenant_for_trial failed: ${clone.error.message}`);
  }
  const newTenantId = clone.data;
  if (!newTenantId) {
    throw new Error('clone_tenant_for_trial returned null');
  }
  const link = await sb.rpc('link_user_to_tenant', {
    p_user_id: userId,
    p_tenant_id: newTenantId,
    p_role: 'admin',
  });
  if (link.error) {
    throw new Error(`link_user_to_tenant failed: ${link.error.message}`);
  }
  return newTenantId;
}

async function generateMagicLink(sb, email) {
  const redirectTo = `${SITE_URL.replace(/\/$/, '')}/auth/callback?next=/dashboard`;
  const gen = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });
  if (gen.error) {
    throw new Error(`generateLink failed: ${gen.error.message}`);
  }
  const link =
    (gen.data && gen.data.properties && gen.data.properties.action_link) ||
    (gen.data && gen.data.action_link) ||
    null;
  if (!link) {
    throw new Error('generateLink returned no action_link');
  }
  return link;
}

async function handleApprove(sb, entryId) {
  if (!entryId || typeof entryId !== 'string') {
    return { status: 400, body: { error: 'entryId is required' } };
  }
  const entryRes = await sb
    .from('waitlist_entries')
    .select('id, email, full_name, company_name, phone, status')
    .eq('id', entryId)
    .maybeSingle();
  if (entryRes.error) {
    return { status: 500, body: { error: `waitlist_entries lookup failed: ${entryRes.error.message}` } };
  }
  if (!entryRes.data) {
    return { status: 404, body: { error: 'waitlist entry not found' } };
  }
  const entry = entryRes.data;
  if (!entry.email) {
    return { status: 400, body: { error: 'waitlist entry has no email' } };
  }

  try {
    await ensureSubscriberTrial(sb, entry);
    const { user } = await ensureAuthUser(sb, entry.email);
    const tenantId = await ensureTenantForUser(sb, user.id, entry.email, entry.full_name);
    const magicLink = await generateMagicLink(sb, entry.email);

    const mail = await sendEmail({
      to: entry.email,
      subject: 'Your AIR by Lupine demo is ready',
      html: approvalEmailHtml({ fullName: entry.full_name, magicLink }),
    });
    if (!mail.ok) {
      return { status: 502, body: { error: `email send failed: ${mail.error}` } };
    }

    if (entry.status !== 'approved') {
      const upd = await sb
        .from('waitlist_entries')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', entry.id);
      if (upd.error) {
        return { status: 500, body: { error: `waitlist_entries update failed: ${upd.error.message}` } };
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        entryId: entry.id,
        userId: user.id,
        tenantId,
        emailId: mail.id || null,
        resent: entry.status === 'approved',
      },
    };
  } catch (e) {
    return { status: 500, body: { error: e.message || String(e) } };
  }
}

// ---------------------------------------------------------------------------
// deny handler
// ---------------------------------------------------------------------------
async function handleDeny(sb, entryId, reason) {
  if (!entryId || typeof entryId !== 'string') {
    return { status: 400, body: { error: 'entryId is required' } };
  }
  const entryRes = await sb
    .from('waitlist_entries')
    .select('id, email, full_name, status')
    .eq('id', entryId)
    .maybeSingle();
  if (entryRes.error) {
    return { status: 500, body: { error: `waitlist_entries lookup failed: ${entryRes.error.message}` } };
  }
  if (!entryRes.data) {
    return { status: 404, body: { error: 'waitlist entry not found' } };
  }
  const entry = entryRes.data;

  if (entry.email) {
    const mail = await sendEmail({
      to: entry.email,
      subject: 'About your AIR by Lupine request',
      html: denialEmailHtml({ fullName: entry.full_name, reason }),
    });
    if (!mail.ok) {
      return { status: 502, body: { error: `email send failed: ${mail.error}` } };
    }
  }

  const upd = await sb
    .from('waitlist_entries')
    .update({
      status: 'denied',
      denied_at: new Date().toISOString(),
      denial_reason: reason || null,
    })
    .eq('id', entry.id);
  if (upd.error) {
    return { status: 500, body: { error: `waitlist_entries update failed: ${upd.error.message}` } };
  }
  return { status: 200, body: { ok: true, entryId: entry.id } };
}

// ---------------------------------------------------------------------------
// list handler
// ---------------------------------------------------------------------------
async function handleList(sb) {
  const res = await sb
    .from('waitlist_entries')
    .select('id, email, full_name, company_name, phone, status, created_at, approved_at, denied_at, denial_reason')
    .order('created_at', { ascending: false })
    .limit(500);
  if (res.error) {
    return { status: 500, body: { error: res.error.message } };
  }
  return { status: 200, body: { entries: res.data || [] } };
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  let sb;
  try {
    sb = getSupabase();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  let result;
  switch (body.action) {
    case 'list':
      result = await handleList(sb);
      break;
    case 'approve':
      result = await handleApprove(sb, body.entryId);
      break;
    case 'deny':
      result = await handleDeny(sb, body.entryId, body.reason);
      break;
    default:
      return res.status(400).json({ error: `unknown action: ${body.action}` });
  }
  return res.status(result.status).json(result.body);
}
