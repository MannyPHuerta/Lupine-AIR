import { createClient } from '@supabase/supabase-js';

/* global process */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Verify the user's JWT and get their ID
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) return res.status(401).json({ error: 'Invalid token' });

    // Look up their profile for tenant_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.tenant_id) {
      // Try looking up by admin_email in tenants table
      const { data: tenantByEmail } = await supabase
        .from('tenants')
        .select('slug, status, company_name')
        .eq('admin_email', user.email)
        .maybeSingle();

      if (tenantByEmail) return res.json({ tenant: tenantByEmail });
      return res.json({ tenant: null });
    }

    // Look up the tenant by ID
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug, status, company_name')
      .eq('id', profile.tenant_id)
      .maybeSingle();

    return res.json({ tenant: tenant || null });
  } catch (err) {
    console.error('[resolveMyTenant] error:', err);
    return res.status(500).json({ error: err.message });
  }
}