// @ts-check
// Comprehensive diagnostic endpoint for waitlist system
/* global process */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const diagnostics = {
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✓ SET' : '✗ MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ SET' : '✗ MISSING',
      RESEND_API_KEY: process.env.RESEND_API_KEY ? '✓ SET' : '✗ MISSING',
    },
    tests: {},
  };

  // Test 1: Supabase Connection
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    
    const { data: pingData, error: pingError } = await supabase
      .from('waitlist_entries')
      .select('id')
      .limit(1);
    
    diagnostics.tests.supabase = {
      status: pingError ? '✗ FAILED' : '✓ OK',
      error: pingError?.message || null,
      rowCount: pingData?.length || 0,
    };
  } catch (e) {
    diagnostics.tests.supabase = {
      status: '✗ CRITICAL',
      error: e.message,
    };
  }

  // Test 2: Resend API
  try {
    const emailTest = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AIR Waitlist <info@theprojectair.com>',
        to: ['test@theprojectair.com'],
        subject: 'Resend API Test',
        html: '<p>Test</p>',
      }),
    });
    
    const emailResult = await emailTest.json();
    diagnostics.tests.resend = {
      status: emailResult.error ? '✗ FAILED' : '✓ OK',
      error: emailResult.error?.message || null,
      response: emailResult,
    };
  } catch (e) {
    diagnostics.tests.resend = {
      status: '✗ CRITICAL',
      error: e.message,
    };
  }

  // Test 3: Check waitlist_entries table structure
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    
    const { data: recentEntries, error } = await supabase
      .from('waitlist_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    diagnostics.tests.recentEntries = {
      status: error ? '✗ FAILED' : '✓ OK',
      count: recentEntries?.length || 0,
      error: error?.message || null,
      sample: recentEntries?.[0] || null,
    };
  } catch (e) {
    diagnostics.tests.recentEntries = {
      status: '✗ CRITICAL',
      error: e.message,
    };
  }

  return res.status(200).json(diagnostics);
}