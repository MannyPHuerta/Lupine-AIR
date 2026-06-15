// @ts-check
// Vercel serverless function — Node.js, uses raw fetch (no SDK dependency issues)
/* global process */

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, company, branches, name, phone } = req.body || {};
  console.log('[waitlist] payload:', { name, email, phone, company, branches });

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('[waitlist] supabaseUrl:', supabaseUrl?.slice(0, 50) || 'MISSING');
  console.log('[waitlist] serviceKey present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !supabaseKey) {
    console.error('[waitlist] Missing Supabase config');
    return res.status(500).json({ error: 'Server misconfiguration: missing Supabase credentials' });
  }

  // Use raw fetch to avoid any package resolution issues
  console.log('[waitlist] Inserting into Supabase via REST...');
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/waitlist_entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({ name, email, phone, company, branches, status: 'pending' }),
  });

  const insertText = await insertRes.text();
  console.log('[waitlist] Supabase insert status:', insertRes.status);
  console.log('[waitlist] Supabase insert body:', insertText);

  let insertData = null;
  try { insertData = JSON.parse(insertText); } catch (_) { /* raw error */ }

  if (!insertRes.ok) {
    // Unique constraint violation (409 or code 23505) — treat as success
    const isConflict = insertRes.status === 409 || (insertData?.code === '23505') || insertText.includes('23505');
    if (isConflict) {
      console.log('[waitlist] Duplicate email, treating as success:', email);
      return res.status(200).json({ success: true, duplicate: true });
    }
    console.error('[waitlist] DB insert failed:', insertText);
    return res.status(500).json({ error: 'Database insert failed', details: insertText });
  }

  const entryId = Array.isArray(insertData) ? insertData[0]?.id : insertData?.id;
  console.log('[waitlist] Insert success, entryId:', entryId);

  // Send emails via Resend
  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[waitlist] No RESEND_API_KEY — skipping emails');
    return res.status(200).json({ success: true, entryId });
  }

  const send = (payload) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json());

  const [adminResult, confirmResult] = await Promise.all([
    send({
      from: 'AIR Waitlist <info@theprojectair.com>',
      to: ['info@theprojectair.com'],
      reply_to: email,
      subject: `🚀 New Early Access Request — ${company || email}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0ea5e9">New Early Access Request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;color:#555">Name</td><td style="padding:8px">${name || '—'}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Email</td><td style="padding:8px">${email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Phone</td><td style="padding:8px">${phone || '—'}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Company</td><td style="padding:8px">${company || '—'}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;color:#555">Branches</td><td style="padding:8px">${branches || '—'}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Submitted</td><td style="padding:8px">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST</td></tr>
          </table>
        </div>
      `,
    }),
    send({
      from: 'AIR Waitlist <info@theprojectair.com>',
      to: [email],
      subject: "🚀 You're in — AIR early access confirmed",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0ea5e9">Welcome to the AIR early access list! 🎉</h2>
          <p style="color:#555;line-height:1.6">Hi ${name || 'there'},</p>
          <p style="color:#555;line-height:1.6">You're in. Early subscribers lock in <strong>founding pricing for 24 months</strong>, guaranteed.</p>
          <div style="background:#0ea5e9;color:white;padding:20px;border-radius:8px;margin:24px 0;text-align:center">
            <p style="margin:0;font-size:14px"><strong>What you're getting:</strong></p>
            <p style="margin:12px 0 0 0;font-weight:bold;font-size:18px">AIRental + AIREvents + AIReports + more</p>
            <p style="margin:8px 0 0 0;font-size:13px;opacity:0.9">14-day free trial. Full Pro access. No credit card required.</p>
          </div>
          <p style="color:#555;line-height:1.6"><strong>What happens next:</strong></p>
          <ol style="color:#555;line-height:1.8">
            <li>We'll reach out within 2 business days to schedule a personalized demo</li>
            <li>See your rental operation on AIR — with YOUR data</li>
            <li>Ask any questions; we'll handle setup</li>
          </ol>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #ddd;padding-top:16px">Questions? Hit reply — we'll get back to you within a few hours.</p>
        </div>
      `,
    }),
  ]);

  console.log('[waitlist] Admin email:', adminResult?.id || adminResult?.error);
  console.log('[waitlist] Confirm email:', confirmResult?.id || confirmResult?.error);

  return res.status(200).json({ success: true, entryId });
}