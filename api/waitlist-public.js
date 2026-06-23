// @ts-check
// Vercel serverless function — Waitlist admin operations
//
// Actions:
//   POST { action: 'list' }
//   POST { action: 'approve', entryId }
//   POST { action: 'deny',    entryId, reason? }
//
// NOTE: This file is tuned to the ACTUAL waitlist_entries schema in prod:
//   id, name, email, phone, company, branches, status, approved_by,
//   approved_at, notes, created_at, full_name, company_name, updated_at,
//   branch_count, role, message
// There is NO denied_at / denial_reason column — denial reason is written
// into `notes` and status is flipped to 'denied'.
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

const RAW_SITE_URL =
  process.env.SITE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.VITE_SITE_URL ||
  'https://theprojectair.com';

const SITE_URL = normalizeSiteUrl(RAW_SITE_URL);

const FROM_ADDRESS = 'AIR by Lupine <info@theprojectair.com>';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// Columns that actually exist on waitlist_entries.
const LIST_COLUMNS =
  'id, email, full_name, company_name, phone, role, branch_count, message, status, notes, approved_at, approved_by, created_at, updated_at';

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

function normalizeSiteUrl(value) {
  const fallback = 'https://theprojectair.com';
  const raw = String(value || fallback).trim() || fallback;

  try {
    const url = new URL(raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();

    if (host === 'theprojectair.com' || host === 'www.theprojectair.com') {
      return fallback;
    }

    if (host.endsWith('.theprojectair.com')) {
      return fallback;
    }

    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function isDuplicateRecord(err) {
  if (!err) return false;
  const msg = String(err.message || err.details || '').toLowerCase();
  return err.code === '23505' || msg.includes('duplicate key') || msg.includes('already exists');
}

function stripMissingColumnFromPayload(payload, errMsg, protectedColumns = []) {
  const m = String(errMsg || '').match(/'([^']+)' column/i);
  if (!m) return null;
  const col = m[1];
  if (!(col in payload) || protectedColumns.includes(col)) return null;
  const next = { ...payload };
  delete next[col];
  return next;
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
// approve helpers
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

// Best-effort write to subscriber_trials. The live schema is unknown and
// historically inconsistent across environments, so we attempt the richest
// payload first and gracefully drop unknown columns when PostgREST complains
// (PGRST204 = "Could not find the 'X' column ... in the schema cache").
async function ensureSubscriberTrial(sb, entry) {
  const existing = await sb
    .from('subscriber_trials')
    .select('id')
    .eq('email', entry.email)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`subscriber_trials lookup failed: ${existing.error.message}`);
  }

  const candidate = {
    email: entry.email,
    full_name: entry.full_name || null,
    company_name: entry.company_name || null,
    phone: entry.phone || null,
    updated_at: new Date().toISOString(),
  };

  const stripMissingColumn = (payload, errMsg) => {
    const m = String(errMsg || '').match(/'([^']+)' column/i);
    if (!m) return null;
    const col = m[1];
    if (!(col in payload)) return null;
    const next = { ...payload };
    delete next[col];
    return next;
  };

  if (existing.data) {
    let payload = { ...candidate };
    delete payload.email;
    for (let i = 0; i < 8; i++) {
      const upd = await sb
        .from('subscriber_trials')
        .update(payload)
        .eq('id', existing.data.id);
      if (!upd.error) return existing.data.id;
      const reduced = stripMissingColumn(payload, upd.error.message);
      if (!reduced) {
        if (Object.keys(payload).length <= 1) return existing.data.id;
        throw new Error(`subscriber_trials update failed: ${upd.error.message}`);
      }
      payload = reduced;
      if (Object.keys(payload).length === 0) return existing.data.id;
    }
    return existing.data.id;
  }

  let payload = { ...candidate };
  for (let i = 0; i < 8; i++) {
    const ins = await sb
      .from('subscriber_trials')
      .insert(payload)
      .select('id')
      .single();
    if (!ins.error) return ins.data.id;
    const reduced = stripMissingColumn(payload, ins.error.message);
    if (!reduced) {
      throw new Error(`subscriber_trials insert failed: ${ins.error.message}`);
    }
    payload = reduced;
    if (!payload.email) {
      throw new Error(`subscriber_trials insert failed: email column missing`);
    }
  }
  throw new Error('subscriber_trials insert failed: too many missing columns');
}

async function handleResendMagicLink(sb, entryId, emailOverride) {
  let email = emailOverride;
  let fullName = null;
  if (entryId) {
    const entryRes = await sb
      .from('waitlist_entries')
      .select('id, email, full_name')
      .eq('id', entryId)
      .maybeSingle();
    if (entryRes.error) {
      return { status: 500, body: { error: `waitlist_entries lookup failed: ${entryRes.error.message}` } };
    }
    if (!entryRes.data) {
      return { status: 404, body: { error: 'waitlist entry not found' } };
    }
    email = entryRes.data.email;
    fullName = entryRes.data.full_name;
  }
  if (!email) {
    return { status: 400, body: { error: 'entryId or email is required' } };
  }
  try {
    const { user } = await ensureAuthUser(sb, email);
    const tenantId = await ensureTenantForUser(sb, user.id, email, fullName);
    const magicLink = await generateMagicLink(sb, email);
    const mail = await sendEmail({
      to: email,
      subject: 'Your AIR by Lupine sign-in link',
      html: approvalEmailHtml({ fullName, magicLink }),
    });
    if (!mail.ok) {
      return { status: 502, body: { error: `email send failed: ${mail.error}` } };
    }
    return { status: 200, body: { ok: true, email, userId: user.id, tenantId, emailId: mail.id || null } };
  } catch (e) {
    return { status: 500, body: { error: e.message || String(e) } };
  }
}

async function upsertProfileTenant(sb, userId, tenantId, fullName) {
  let payload = {
    id: userId,
    tenant_id: tenantId,
    full_name: fullName || null,
    updated_at: new Date().toISOString(),
  };

  for (let i = 0; i < 6; i++) {
    const res = await sb
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('id, tenant_id')
      .maybeSingle();
    if (!res.error) return res.data;

    const reduced = stripMissingColumnFromPayload(payload, res.error.message, ['id', 'tenant_id']);
    if (!reduced) {
      throw new Error(`profiles upsert failed: ${res.error.message}`);
    }
    payload = reduced;
  }

  throw new Error('profiles upsert failed: too many missing columns');
}

async function ensureUserRole(sb, userId, tenantId, role = 'admin') {
  const existing = await sb
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('role', role)
    .limit(1)
    .maybeSingle();
  if (existing.error) {
    throw new Error(`user_roles lookup failed: ${existing.error.message}`);
  }
  if (existing.data) return existing.data.id;

  const inserted = await sb
    .from('user_roles')
    .insert({ user_id: userId, tenant_id: tenantId, role })
    .select('id')
    .single();
  if (!inserted.error) return inserted.data.id;

  if (isDuplicateRecord(inserted.error)) {
    const refetch = await sb
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('role', role)
      .limit(1)
      .maybeSingle();
    if (!refetch.error && refetch.data) return refetch.data.id;
  }

  throw new Error(`user_roles insert failed: ${inserted.error.message}`);
}

async function ensureDirectTenantLink(sb, userId, tenantId, fullName) {
  await upsertProfileTenant(sb, userId, tenantId, fullName);
  await ensureUserRole(sb, userId, tenantId, 'admin');

  const [profileCheck, roleCheck] = await Promise.all([
    sb.from('profiles').select('tenant_id').eq('id', userId).maybeSingle(),
    sb
      .from('user_roles')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileCheck.error) {
    throw new Error(`profiles verification failed: ${profileCheck.error.message}`);
  }
  if (!profileCheck.data || profileCheck.data.tenant_id !== tenantId) {
    throw new Error('profiles verification failed: tenant_id was not saved');
  }
  if (roleCheck.error) {
    throw new Error(`user_roles verification failed: ${roleCheck.error.message}`);
  }
  if (!roleCheck.data || roleCheck.data.tenant_id !== tenantId) {
    throw new Error('user_roles verification failed: admin role was not saved');
  }
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
    await ensureDirectTenantLink(sb, userId, prof.data.tenant_id, fullName);
    return prof.data.tenant_id;
  }

  const existingRole = await sb
    .from('user_roles')
    .select('tenant_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (existingRole.error) {
    throw new Error(`user_roles tenant lookup failed: ${existingRole.error.message}`);
  }
  if (existingRole.data && existingRole.data.tenant_id) {
    await ensureDirectTenantLink(sb, userId, existingRole.data.tenant_id, fullName);
    return existingRole.data.tenant_id;
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

  await ensureDirectTenantLink(sb, userId, newTenantId, fullName);
  return newTenantId;
}

async function generateMagicLink(sb, email) {
  const redirectTo = `${SITE_URL.replace(/\/$/, '')}/auth/callback?next=/ops`;
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

// ---------------------------------------------------------------------------
// action handlers
// ---------------------------------------------------------------------------
async function handleList(sb) {
  const res = await sb
    .from('waitlist_entries')
    .select(LIST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500);
  if (res.error) {
    return { status: 500, body: { error: res.error.message } };
  }
  const raw = res.data || [];
  const rows = raw.map((r) => ({
    ...r,
    name: r.full_name || r.name || null,
    company: r.company_name || r.company || null,
    created_date: r.created_at || null,
    updated_date: r.updated_at || null,
  }));
  return {
    status: 200,
    body: {
      ok: true,
      waitlist: rows,
      trials: [],
      entries: rows,
      data: rows,
      rows,
      items: rows,
      count: rows.length,
    },
  };
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

async function handleDeny(sb, entryId, reason) {
  if (!entryId || typeof entryId !== 'string') {
    return { status: 400, body: { error: 'entryId is required' } };
  }
  const entryRes = await sb
    .from('waitlist_entries')
    .select('id, email, full_name, status, notes')
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

  const noteLine = `[denied ${new Date().toISOString()}]${reason ? ` ${reason}` : ''}`;
  const newNotes = entry.notes ? `${entry.notes}\n${noteLine}` : noteLine;

  const upd = await sb
    .from('waitlist_entries')
    .update({ status: 'denied', notes: newNotes })
    .eq('id', entry.id);
  if (upd.error) {
    return { status: 500, body: { error: `waitlist_entries update failed: ${upd.error.message}` } };
  }
  return { status: 200, body: { ok: true, entryId: entry.id } };
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
    case 'reject':
      result = await handleDeny(sb, body.entryId, body.reason);
      break;
    case 'resendMagicLink':
    case 'resend_magic_link':
    case 'resend':
      result = await handleResendMagicLink(sb, body.entryId, body.email);
      break;
    default:
      return res.status(400).json({ error: `unknown action: ${body.action}` });
  }
  return res.status(result.status).json(result.body);
}
