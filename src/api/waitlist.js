// Vercel serverless function — Node.js + Supabase + Resend
/* global process */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('[api/waitlist] Received request:', req.method, req.body);
  
  if (req.method !== 'POST') {
    console.error('[api/waitlist] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, company, branches, name, phone } = req.body;
  console.log('[api/waitlist] Payload:', { email, company, branches, name, phone });
  
  if (!email) {
    console.error('[api/waitlist] Email is required');
    return res.status(400).json({ error: 'Email is required' });
  }

  // Fall back to VITE_ prefixed vars since those are what's set in the environment
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[Waitlist] Supabase URL resolved:', supabaseUrl.slice(0, 40));
  console.log('[Waitlist] Supabase Key present:', !!supabaseKey);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Store in Supabase
  console.log('[Waitlist] Inserting into Supabase...');
  console.log('[Waitlist] Supabase URL:', process.env.SUPABASE_URL);
  console.log('[Waitlist] Supabase Key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: insertData, error: dbError } = await supabase
    .from('waitlist_entries')
    .insert({ name, email, phone, company, branches, status: 'pending' })
    .select();

  if (dbError) {
    console.error('[Waitlist] DB insert failed:', JSON.stringify(dbError, null, 2));
    console.error('[Waitlist] Full error:', dbError);
    return res.status(500).json({ error: dbError.message, details: dbError, hint: 'Check Supabase table schema and RLS policies' });
  }
  console.log('[Waitlist] DB insert success:', JSON.stringify(insertData, null, 2));
  console.log('[Waitlist] Inserted ID:', insertData?.[0]?.id);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
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
      subject: 'Thanks for your interest in AIR! 🎉',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#0ea5e9">Thanks for requesting early access!</h2>
          <p style="color:#555;line-height:1.6">Hi ${name || 'there'},</p>
          <p style="color:#555;line-height:1.6">We've received your request and will reach out within 2 business days to schedule your demo.</p>
          <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:20px 0">
            <p style="color:#555;margin:0"><strong>Your submission:</strong></p>
            <p style="color:#555;margin:8px 0 0 0">Company: ${company || 'N/A'}</p>
            <p style="color:#555;margin:4px 0 0 0">Branches: ${branches}</p>
            <p style="color:#555;margin:4px 0 0 0">Phone: ${phone || 'N/A'}</p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px">Questions? Reply to this email.</p>
        </div>
      `,
    }),
  ]);

  console.log('[Waitlist] Admin email result:', adminResult);
  console.log('[Waitlist] Confirmation email result:', confirmResult);
  
  if (adminResult.error || confirmResult.error) {
    const err = adminResult.error || confirmResult.error;
    console.error('[Waitlist] Email send failed:', err);
    return res.status(500).json({ error: err.message || 'Email send failed', details: err });
  }

  console.log('[Waitlist] Success!');
  return res.status(200).json({ success: true, entryId: insertData?.[0]?.id });
}