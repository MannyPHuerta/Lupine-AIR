// api/waitlist.js
// Vercel Serverless Function (Node 18+). Handles Early Access submissions:
//   1. Validates input
//   2. Inserts into Supabase `waitlist_entries` (service role, bypasses RLS)
//   3. Sends two emails via Resend: admin notification + requester confirmation
//   4. Returns clear JSON so the browser and Vercel logs show exactly where it failed

const ADMIN_EMAIL = 'info@theprojectair.com';
const FROM_ADDRESS = 'AIR Waitlist <info@theprojectair.com>';
const TABLE = 'waitlist_entries';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

function clean(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalize(body) {
  const email = clean(body.email, 254);
  const full_name = clean(body.full_name ?? body.name, 200);
  const company = clean(body.company ?? body.company_name, 200);
  const phone = clean(body.phone, 50);
  const role = clean(body.role ?? body.job_title, 100);
  const message = clean(body.message ?? body.notes, 2000);

  let branch_count = null;
  const raw = body.branch_count ?? body.branches;
  if (raw !== undefined && raw !== null && raw !== '') {
    const n = parseInt(String(raw), 10);
    if (!Number.isNaN(n) && n >= 0 && n < 100000) branch_count = n;
  }

  return { email, full_name, company, phone, role, message, branch_count };
}

async function sendResendEmail({ apiKey, to, subject, html, replyTo }) {
  const payload = {
    from: FROM_ADDRESS,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await r.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  if (!r.ok) {
    return { ok: false, status: r.status, error: parsed?.message || text || `HTTP ${r.status}` };
  }
  return { ok: true, id: parsed?.id || null };
}

module.exports = async function handler(req, res) {
  // CORS (safe defaults; same-origin doesn't need it but it doesn't hurt)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });

  // ---- env ----
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[waitlist] Missing Supabase env vars');
    return json(res, 500, { ok: false, error: 'server_misconfigured_supabase' });
  }
  if (!RESEND_API_KEY) {
    console.error('[waitlist] Missing RESEND_API_KEY');
    return json(res, 500, { ok: false, error: 'server_misconfigured_resend' });
  }

  // ---- parse body (Vercel parses JSON automatically when Content-Type is application/json) ----
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const entry = normalize(body);
  if (!entry.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
    return json(res, 400, { ok: false, error: 'invalid_email' });
  }

  // ---- Supabase REST (no SDK needed; keeps function cold-start tiny) ----
  const supaHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // duplicate check
  try {
    const dupUrl = `${SUPABASE_URL}/rest/v1/${TABLE}?email=eq.${encodeURIComponent(entry.email)}&select=id&limit=1`;
    const dupRes = await fetch(dupUrl, { headers: supaHeaders });
    if (dupRes.ok) {
      const rows = await dupRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return json(res, 200, { ok: true, duplicate: true });
      }
    } else {
      const t = await dupRes.text();
      console.error('[waitlist] dup-check failed', dupRes.status, t);
    }
  } catch (e) {
    console.error('[waitlist] dup-check threw', e);
  }

  // insert
  let insertedId = null;
  try {
    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: { ...supaHeaders, Prefer: 'return=representation' },
      body: JSON.stringify([{ ...entry, status: 'pending' }]),
    });
    const insText = await insRes.text();
    if (!insRes.ok) {
      console.error('[waitlist] insert failed', insRes.status, insText);
      return json(res, 500, { ok: false, error: 'db_insert_failed', detail: insText });
    }
    try {
      const rows = JSON.parse(insText);
      insertedId = Array.isArray(rows) && rows[0]?.id ? rows[0].id : null;
    } catch { /* ignore */ }
  } catch (e) {
    console.error('[waitlist] insert threw', e);
    return json(res, 500, { ok: false, error: 'db_insert_threw' });
  }

  // ---- emails ----
  const adminHtml = `
    <h2>🚀 New Early Access Request — Project AIR</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
      <tr><td><b>Email</b></td><td>${escapeHtml(entry.email)}</td></tr>
      <tr><td><b>Name</b></td><td>${escapeHtml(entry.full_name)}</td></tr>
      <tr><td><b>Company</b></td><td>${escapeHtml(entry.company)}</td></tr>
      <tr><td><b>Phone</b></td><td>${escapeHtml(entry.phone)}</td></tr>
      <tr><td><b>Role</b></td><td>${escapeHtml(entry.role)}</td></tr>
      <tr><td><b>Branches</b></td><td>${escapeHtml(entry.branch_count)}</td></tr>
      <tr><td valign="top"><b>Message</b></td><td>${escapeHtml(entry.message)}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">Entry id: ${escapeHtml(insertedId)}</p>
  `;

  const userHtml = `
    <p>Hi ${escapeHtml(entry.full_name || 'there')},</p>
    <p>Thanks for requesting early access to <b>Project AIR</b>. We received your request and will be in touch shortly.</p>
    <p>— The Project AIR Team</p>
  `;

  const adminResult = await sendResendEmail({
    apiKey: RESEND_API_KEY,
    to: ADMIN_EMAIL,
    subject: '🚀 New Early Access Request — Project AIR',
    html: adminHtml,
    replyTo: entry.email,
  });
  if (!adminResult.ok) console.error('[waitlist] admin email failed', adminResult);

  const userResult = await sendResendEmail({
    apiKey: RESEND_API_KEY,
    to: entry.email,
    subject: 'We received your Project AIR early access request',
    html: userHtml,
    replyTo: ADMIN_EMAIL,
  });
  if (!userResult.ok) console.error('[waitlist] user email failed', userResult);

  return json(res, 200, {
    ok: true,
    id: insertedId,
    emails: {
      admin: adminResult.ok ? { sent: true, id: adminResult.id } : { sent: false, error: adminResult.error },
      user:  userResult.ok  ? { sent: true, id: userResult.id  } : { sent: false, error: userResult.error  },
    },
  });
};
