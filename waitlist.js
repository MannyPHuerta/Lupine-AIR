// @ts-check
// Vercel serverless function — Node.js + Supabase + Resend
/* global process */
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  console.log('[api/waitlist] Received request:', req.method, req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, company, branches, name, phone } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: insertData, error: dbError } = await supabase
    .from('waitlist_entries')
    .insert({ name, email, phone, company, branches, status: 'pending' })
    .select();

  if (dbError) {
    console.error('[Waitlist] DB insert failed:', dbError);
    return res.status(500).json({ error: dbError.message });
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ success: true, entryId: insertData?.[0]?.id, warning: 'Email not sent: RESEND_API_KEY missing' });
  }

  const send = async (payload) => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return r.json();
  };

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
          <p style="color:#888;font-size:12px;margin-top:16px">Reply to reach ${name || 'submitter'} at ${email}.</p>
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
          <p style="color:#555;line-height:1.6">You're in — and you picked the right time. Early subscribers lock in <strong>founding pricing for 24 months</strong>, guaranteed. No surprise bills, no per-user seats, just one price per branch.</p>
          <div style="background:#0ea5e9;color:white;padding:20px;border-radius:8px;margin:24px 0;text-align:center">
            <p style="margin:0;font-size:14px"><strong>What you're getting:</strong></p>
            <p style="margin:12px 0 0 0;font-weight:bold;font-size:18px">AIRental + AIREvents + AIReports + more</p>
            <p style="margin:8px 0 0 0;font-size:13px;opacity:0.9">14-day free trial. Full Pro access. No credit card required.</p>
          </div>
          <p style="color:#555;line-height:1.6"><strong>Here's what happens next:</strong></p>
          <ol style="color:#555;line-height:1.8">
            <li>We'll reach out within 2 business days to schedule a personalized 30-min demo</li>
            <li>See your rental operation on the AIR platform — with YOUR data</li>
            <li>Ask any questions; we'll handle setup</li>
          </ol>
          <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:20px 0">
            <p style="color:#555;margin:0;font-size:13px"><strong>We have your info:</strong></p>
            <p style="color:#888;margin:8px 0 0 0;font-size:13px">Company: <strong>${company || 'N/A'}</strong> · Branches: <strong>${branches || 'N/A'}</strong></p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #ddd;padding-top:16px">Questions or want to move faster? Hit reply — we'll get back to you within a few hours.</p>
        </div>
      `,
    }),
  ]);

  if (adminResult.error || confirmResult.error) {
    const err = adminResult.error || confirmResult.error;
    console.error('[Waitlist] Email send failed:', err);
    return res.status(500).json({ error: err.message || 'Email send failed' });
  }

  return res.status(200).json({ success: true, entryId: insertData?.[0]?.id });
}
