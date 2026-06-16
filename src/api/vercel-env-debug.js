// @ts-check
// Debug endpoint to verify Vercel environment variables
/* global process */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_resend_key: !!process.env.RESEND_API_KEY,
    has_vite_supabase_url: !!process.env.VITE_SUPABASE_URL,
    timestamp: new Date().toISOString(),
    message: 'If all values are false, environment variables are not set in Vercel dashboard',
  });
}