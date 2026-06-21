// api/waitlist.js
// Vercel Serverless Function (Node 18+).
// 1) Validates input
// 2) Inserts into Supabase `waitlist_entries` via REST (service role, bypasses RLS)
// 3) Sends admin + confirmation emails via Resend
// 4) Returns detailed JSON so Vercel logs + browser show exactly what happened

const ADMIN_EMAIL  = 'info@theprojectair.com';
const FROM_ADDRESS = 'AIR Waitlist <info@theprojectair.com>';
const TABLE        = 'waitlist_entries';

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
  if (s === undefined || s === null || s === '') return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalize(body) {
  const email      = clean(body.email, 254);
  const full_name  = clean(body.full_name ?? body.name, 200);
  const company    = clean(body.company   ?? body.company_name, 200);
  const phone      = clean(body.phone, 50);
  const role       = clean(body.role      ?? body.job_title, 100);
  const message    = clean(body.message   ?? body.notes, 2000);

  let branch_count = null;
  const raw = body.branch_count ?? body.branches;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });

  const SUPABASE_URL              = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY            = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[waitlist] Missing Supabase env vars');
    return json(res, 500, { ok: false, error: 'server_misconfigured_supabase' });
  }
  if (!RESEND_API_KEY) {
    console.error('[waitlist] Missing RESEND_API_KEY');
    return json(res, 500, { ok: false, error: 'server_misconfigured_resend' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const entry = normalize(body);
  if (!entry.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
    return json(res, 400, { ok: false, error: 'invalid_email' });
  }

  const supaHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  // ---- duplicate check ----
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

  // ---- insert ----
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
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 16px 0;color:#0ea5e9;">🚀 New Early Access Request — Project AIR</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;width:140px;color:#64748b;">Email</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;"><a href="mailto:${escapeHtml(entry.email)}">${escapeHtml(entry.email)}</a></td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Name</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(entry.full_name)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Company</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(entry.company)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Phone</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(entry.phone)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Role</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(entry.role)}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b;">Branches</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escapeHtml(entry.branch_count)}</td></tr>
        <tr><td style="padding:8px;color:#64748b;vertical-align:top;">Message</td><td style="padding:8px;white-space:pre-wrap;">${escapeHtml(entry.message)}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8;">Entry id: ${escapeHtml(insertedId)}</p>
    </div>
  `;

  const userHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="margin:0 0 16px 0;color:#0ea5e9;">Thanks for your interest in Project AIR</h2>
      <p>Hi ${escapeHtml(entry.full_name || 'there')},</p>
      <p>We received your early access request and will be in touch shortly with next steps.</p>
      <p>In the meantime, if you have questions just reply to this email.</p>
      <p style="margin-top:24px;">— The Project AIR Team</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:32px;">TheProjectAIR.com</p>
    </div>
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
