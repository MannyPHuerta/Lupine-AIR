// @ts-check
/* global process */
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.SUPABASE_ANON_KEY || !!process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKeyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20) || 'MISSING';
  const urlOk = supabaseUrl.startsWith('https://');

  // Attempt a real insert with the service key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  let insertStatus = null;
  let insertBody = null;

  if (supabaseUrl && supabaseKey) {
    const r = await fetch(`${supabaseUrl}/rest/v1/waitlist_entries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        name: 'ENV CHECK TEST',
        email: `envcheck-${Date.now()}@test.com`,
        phone: '000-0000',
        company: 'Test',
        branches: '1',
        status: 'pending',
      }),
    });
    insertStatus = r.status;
    insertBody = await r.text();
  }

  return res.status(200).json({
    supabaseUrl: supabaseUrl?.slice(0, 50) || 'MISSING',
    urlOk,
    hasServiceKey,
    serviceKeyPrefix,
    hasAnonKey,
    usingKey: hasServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY',
    insertStatus,
    insertBody,
  });
}