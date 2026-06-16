// @ts-check
// Debug endpoint to trace waitlist submission
/* global process */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  
  if (req.method === 'GET') {
    // Diagnostics
    return res.status(200).json({
      has_supabase_url: !!process.env.SUPABASE_URL,
      has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      has_resend_key: !!process.env.RESEND_API_KEY,
      supabase_url_partial: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.slice(0, 20) + '...' : 'MISSING',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const logs = [];
  logs.push(`[${new Date().toISOString()}] Request received`);
  logs.push(`Body: ${JSON.stringify(req.body)}`);

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    logs.push(`SUPABASE_URL present: ${!!supabaseUrl}`);
    logs.push(`SUPABASE_SERVICE_ROLE_KEY present: ${!!supabaseKey}`);

    if (!supabaseUrl || !supabaseKey) {
      logs.push('ERROR: Missing credentials');
      return res.status(500).json({ 
        error: 'Missing Supabase credentials',
        logs,
        has_url: !!supabaseUrl,
        has_key: !!supabaseKey,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    logs.push('Supabase client created');

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = String(body.email || '').trim().toLowerCase();

    logs.push(`Email extracted: ${email}`);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logs.push('ERROR: Invalid email');
      return res.status(400).json({ error: 'Valid email required', logs });
    }

    logs.push('Email validation passed');

    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        email,
        name: String(body.name || '').trim() || null,
        company: String(body.company || '').trim() || null,
        phone: String(body.phone || '').trim() || null,
        branches: String(body.branches || '').trim() || null,
        notes: String(body.notes || '').trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logs.push(`ERROR: Insert failed - ${error.message}`);
      logs.push(`Error code: ${error.code}`);
      logs.push(`Error details: ${JSON.stringify(error.details)}`);
      return res.status(500).json({ 
        error: 'Could not save request', 
        details: error.message, 
        code: error.code,
        logs,
      });
    }

    logs.push(`SUCCESS: Inserted ${data.id}`);

    // Test Resend
    const apiKey = process.env.RESEND_API_KEY;
    logs.push(`RESEND_API_KEY present: ${!!apiKey}`);

    if (apiKey) {
      try {
        const emailResult = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${apiKey}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            from: 'AIR Waitlist <info@theprojectair.com>',
            to: ['info@theprojectair.com'],
            reply_to: email,
            subject: `🚀 New Early Access Request — ${body.company || email}`,
            html: `<div><h2>New Early Access Request</h2><p><b>Name:</b> ${body.name || '—'}</p><p><b>Email:</b> ${email}</p><p><b>Company:</b> ${body.company || '—'}</p></div>`,
          }),
        }).then(r => r.json());
        
        logs.push(`Resend response: ${JSON.stringify(emailResult)}`);
      } catch (e) {
        logs.push(`Email send error: ${e.message}`);
      }
    }

    return res.status(200).json({ 
      ok: true, 
      id: data.id,
      logs,
    });
  } catch (e) {
    logs.push(`UNHANDLED ERROR: ${e.message}`);
    console.error('[waitlist-debug] unhandled:', e);
    return res.status(500).json({ 
      error: 'Server error', 
      message: e.message,
      logs,
    });
  }
}