// @ts-check
/* global process */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email    = String(body.email    || '').trim().toLowerCase();
    const name     = String(body.name     || '').trim();
    const company  = String(body.company  || '').trim();
    const phone    = String(body.phone    || '').trim();
    const branches = String(body.branches || '').trim();
    const notes    = String(body.notes    || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        email,
        name:     name     || null,
        company:  company  || null,
        phone:    phone    || null,
        branches: branches || null,
        notes:    notes    || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log('[waitlist] duplicate email:', email);
        return res.status(200).json({ ok: true, duplicate: true });
      }
      console.error('[waitlist] insert failed:', error.code, error.message, error.details, error.hint);
      return res.status(500).json({ error: 'Could not save request', details: error.message });
    }

    console.log('[waitlist] inserted', data.id, email);

    // Send notification emails via Resend (fire-and-forget, don't fail on email error)
    const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
    if (apiKey) {
      const send = (payload) => fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()).catch(e => console.warn('[waitlist] email error:', e.message));

      await Promise.all([
        send({
          from: 'AIR Waitlist <info@theprojectair.com>',
          to: ['info@theprojectair.com'],
          reply_to: email,
          subject: `🚀 New Early Access Request — ${company || email}`,
          html: `<div style="font-family:sans-serif"><h2>New Early Access Request</h2>
            <p><b>Name:</b> ${name || '—'}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone || '—'}</p>
            <p><b>Company:</b> ${company || '—'}</p>
            <p><b>Branches:</b> ${branches || '—'}</p></div>`,
        }),
        send({
          from: 'AIR Waitlist <info@theprojectair.com>',
          to: [email],
          subject: "🚀 You're on the list — AIR early access confirmed",
          html: `<div style="font-family:sans-serif"><h2>Welcome to the AIR early access list! 🎉</h2>
            <p>Hi ${name || 'there'},</p>
            <p>You're in. We'll reach out within 2 business days to schedule your personalized demo.</p>
            <p>Early subscribers lock in <strong>founding pricing for 24 months</strong>, guaranteed.</p>
            <p style="color:#888;font-size:12px">Questions? Reply to this email.</p></div>`,
        }),
      ]);
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    console.error('[waitlist] unhandled error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
}