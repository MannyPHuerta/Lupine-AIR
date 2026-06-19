import { createClient } from '@supabase/supabase-js';

export default async function(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // eslint-disable-next-line no-undef
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    // Check if user is platform admin
    if (email === 'info@theprojectair.com') {
      return res.json({ tenant: { slug: 'rental-world' }, source: 'platform_admin' });
    }

    // Lookup tenant by admin_email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug, status')
      .eq('admin_email', email)
      .maybeSingle();

    if (tenant && tenant.status === 'active') {
      return res.json({ tenant, source: 'admin' });
    }

    // Check trial records
    const { data: trial } = await supabase
      .from('subscriber_trials')
      .select('status, tenant_id')
      .eq('email', email)
      .maybeSingle();

    if (trial?.status === 'active' && trial?.tenant_id) {
      const { data: trialTenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', trial.tenant_id)
        .maybeSingle();

      if (trialTenant) {
        return res.json({ tenant: trialTenant, source: 'trial' });
      }
    }

    return res.json({ tenant: null, source: 'none' });
  } catch (error) {
    console.error('[resolveTenant] error:', error);
    return res.status(500).json({ error: error.message });
  }
}