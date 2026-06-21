// api/waitlist.js
// Vercel Serverless Function (Node 18+, ESM — package.json has "type": "module")
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

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function insertWaitlistEntry({ supabaseUrl, serviceKey, entry }) {
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/${TABLE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(entry),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  if (!res.ok) {
    return { ok: false, status: res.status, error: data || text || 'Supabase insert failed' };
  }
  return { ok: true, data };
}

async function sendResendEmail({ apiKey, to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    return { ok: false, status: res.status, error: data || text || 'Resend send failed' };
  }
  return { ok: true, data };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[waitlist] Missing Supabase env vars', {
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return json(res, 500, { ok: false, error: 'Server is missing Supabase configuration' });
  }
  if (!RESEND_API_KEY) {
    console.error('[waitlist] Missing RESEND_API_KEY');
    return json(res, 500, { ok: false, error: 'Server is missing email configuration' });
  }

  // Parse body (Vercel usually parses JSON automatically, but be defensive)
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const full_name    = String(body.full_name    || '').trim();
  const email        = String(body.email        || '').trim().toLowerCase();
  const company      = String(body.company      || '').trim();
  const role         = String(body.role         || '').trim();
  const branch_count = body.branch_count == null ? null : Number(body.branch_count);
  const message      = String(body.message      || '').trim();

  if (!full_name || !email) {
    return json(res, 400, { ok: false, error: 'full_name and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { ok: false, error: 'Invalid email address' });
  }

  const entry = {
    full_name,
    email,
    company: company || null,
    role: role || null,
    branch_count: Number.isFinite(branch_count) ? branch_count : null,
    message: message || null,
    status: 'pending',
  };

  // Insert into Supabase
  const insert = await insertWaitlistEntry({
    supabaseUrl: SUPABASE_URL,
    serviceKey: SUPABASE_SERVICE_ROLE_KEY,
    entry,
  });

  if (!insert.ok) {
    console.error('[waitlist] Supabase insert failed', insert);
    return json(res, 500, {
      ok: false,
      stage: 'supabase_insert',
      status: insert.status,
      error: insert.error,
    });
  }

  // Build email bodies
  const adminHtml = `
    <h2>New AIR Early Access Request</h2>
    <table cellpadding="6" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;">
      <tr><td><strong>Name</strong></td><td>${escapeHtml(full_name)}</td></tr>
      <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
      <tr><td><strong>Company</strong></td><td>${escapeHtml(company || '—')}</td></tr>
      <tr><td><strong>Role</strong></td><td>${escapeHtml(role || '—')}</td></tr>
      <tr><td><strong>Branch count</strong></td><td>${entry.branch_count ?? '—'}</td></tr>
      <tr><td valign="top"><strong>Message</strong></td><td>${escapeHtml(message || '—').replace(/\n/g, '<br>')}</td></tr>
    </table>
  `;

  const userHtml = `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#111;">
      <p>Hi ${escapeHtml(full_name.split(' ')[0] || 'there')},</p>
      <p>Thanks for requesting early access to <strong>AIR</strong>. We received your information and someone from The Project AIR team will be in touch shortly.</p>
      <p>— The Project AIR Team<br>
      <a href="https://theprojectair.com">theprojectair.com</a></p>
    </div>
  `;

  // Send emails (don't fail the whole request if one email errors — log it)
  const [adminEmail, userEmail] = await Promise.all([
    sendResendEmail({
      apiKey: RESEND_API_KEY,
      to: ADMIN_EMAIL,
      subject: `New AIR Early Access: ${full_name}${company ? ' — ' + company : ''}`,
      html: adminHtml,
    }),
    sendResendEmail({
      apiKey: RESEND_API_KEY,
      to: email,
      subject: 'We received your AIR early access request',
      html: userHtml,
    }),
  ]);

  if (!adminEmail.ok) console.error('[waitlist] Admin email failed', adminEmail);
  if (!userEmail.ok)  console.error('[waitlist] User email failed',  userEmail);

  return json(res, 200, {
    ok: true,
    inserted: Array.isArray(insert.data) ? insert.data[0] : insert.data,
    emails: {
      admin: adminEmail.ok ? 'sent' : { error: adminEmail.error, status: adminEmail.status },
      user:  userEmail.ok  ? 'sent' : { error: userEmail.error,  status: userEmail.status  },
    },
  });
}
