// @ts-check
// Debug endpoint — check environment variables
/* global process */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.status(200).json({
    ok: true,
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✓ set' : '✗ MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ set (hidden)' : '✗ MISSING',
      RESEND_API_KEY: process.env.RESEND_API_KEY ? '✓ set (hidden)' : '✗ MISSING',
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '✓ set' : '✗ MISSING',
    },
    timestamp: new Date().toISOString(),
  });
}