// api/waitlist.js
// Vercel Serverless Function (ESM — package.json has "type":"module")

const ADMIN_EMAIL  = 'info@theprojectair.com';
const FROM_ADDRESS = 'AIR Waitlist <info@theprojectair.com>';
const TABLE        = 'waitlist_entries';

function pick(obj, keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  }[c]));
}

async function sendResend({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: 'no_resend_key' };
  const body = { from: FROM_ADDRESS, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) body.reply_to = replyTo;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: r.ok, status: r.status, body: json };
}

function buildAdminHtml(entry, { resubmission = false } = {}) {
  const rows = Object.entries(entry)
    .map(([k,v]) => `<tr><td style="padding:4px 10px;border:1px solid #ddd"><b>${escapeHtml(k)}</b></td><td style="padding:4px 10px;border:1px solid #ddd">${escapeHtml(v ?? '')}</td></tr>`)
    .join('');
  const banner = resubmission
    ? `<p style="color:#b45309"><b>Resubmission</b> — this email is already on the waitlist.</p>`
    : '';
  return `<div style="font-family:Arial,sans-serif">
    <h2>New AIR early access request</h2>
    ${banner}
    <table style="border-collapse:collapse">${rows}</table>
  </div>`;
}

function buildUserHtml(name) {
  const first = (name || '').split(' ')[0] || 'there';
  return `<div style="font-family:Arial,sans-serif;line-height:1.5">
    <p>Hi ${escapeHtml(first)},</p>
    <p>Thanks for requesting early access to <b>The Project AIR</b>. You're on the list — we'll be in touch as we open spots.</p>
    <p>— The AIR team</p>
  </div>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const full_name    = pick(body, ['full_name','name','fullName']);
  const email        = pick(body, ['email']).toLowerCase();
  const phone        = pick(body, ['phone']);
  const company      = pick(body, ['company']);
  const role         = pick(body, ['role']);
  const message      = pick(body, ['message']);
  const branchRaw    = pick(body, ['branch_count','branches','branchCount']);
  const branch_count = branchRaw ? Number(branchRaw) : null;

  if (!full_name || !email) {
    return res.status(400).json({
      ok: false,
      error: 'full_name and email are required',
      receivedKeys: Object.keys(body),
    });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ ok: false, stage: 'config', error: 'missing_supabase_env' });
  }

  const row = { full_name, email, company, role, message, branch_count, phone };
  Object.keys(row).forEach(k => (row[k] === '' || row[k] === null) && delete row[k]);

  // Insert
  let insert = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  // Retry without phone if column missing
  if (insert.status === 400) {
    const txt = await insert.clone().text();
    if (/phone/i.test(txt) && /column/i.test(txt)) {
      const { phone: _drop, ...noPhone } = row;
      insert = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(noPhone),
      });
    }
  }

  const insertText = await insert.text();
  let insertJson; try { insertJson = JSON.parse(insertText); } catch { insertJson = { raw: insertText }; }

  // Duplicate path — still send emails so the user gets a confirmation
  const isDuplicate =
    insert.status === 409 ||
    (insertJson && insertJson.code === '23505');

  if (isDuplicate) {
    const adminEmail = await sendResend({
      to: ADMIN_EMAIL,
      subject: `AIR waitlist resubmission: ${full_name}`,
      html: buildAdminHtml({ full_name, email, phone, company, role, branch_count, message }, { resubmission: true }),
      replyTo: email,
    });
    const userEmail = await sendResend({
      to: email,
      subject: `You're on the AIR early access list`,
      html: buildUserHtml(full_name),
    });
    return res.status(200).json({
      ok: true,
      duplicate: true,
      message: "You're already on the AIR early access list. We've re-sent your confirmation.",
      emails: { admin: adminEmail, user: userEmail },
    });
  }

  if (!insert.ok) {
    return res.status(500).json({
      ok: false,
      stage: 'supabase_insert',
      status: insert.status,
      error: insertJson,
    });
  }

  // Fresh insert — send both emails
  const adminEmail = await sendResend({
    to: ADMIN_EMAIL,
    subject: `New AIR early access request: ${full_name}`,
    html: buildAdminHtml({ full_name, email, phone, company, role, branch_count, message }),
    replyTo: email,
  });
  const userEmail = await sendResend({
    to: email,
    subject: `You're on the AIR early access list`,
    html: buildUserHtml(full_name),
  });

  return res.status(200).json({
    ok: true,
    duplicate: false,
    message: "Thanks — you're on the AIR early access list.",
    emails: { admin: adminEmail, user: userEmail },
  });
}
