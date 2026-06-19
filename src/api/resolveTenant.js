import { createClient } from '@supabase/supabase-js';

export default async function(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    // eslint-disable-next-line no-undef
    process.env.SUPABASE_URL,
    // eslint-disable-next-line no-undef
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    console.log('[resolveTenant] Starting lookup for email:', email);
    // eslint-disable-next-line no-undef
    console.log('[resolveTenant] SUPABASE_URL:', process.env.SUPABASE_URL?.substring(0, 20) + '...');

    // Check if user is platform admin
    if (email === 'info@theprojectair.com') {
      console.log('[resolveTenant] Platform admin detected');
      return res.json({ tenant: { slug: 'rental-world' }, source: 'platform_admin' });
    }

    // Lookup tenant by admin_email
    console.log('[resolveTenant] Querying tenants table for admin_email:', email);
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('slug, status')
      .eq('admin_email', email)
      .maybeSingle();

    console.log('[resolveTenant] Tenant query result:', { tenant, tenantError });

    if (tenant && tenant.status === 'active') {
      console.log('[resolveTenant] Found active tenant, returning:', tenant.slug);
      return res.json({ tenant, source: 'admin' });
    }

    // Check trial records
    console.log('[resolveTenant] Querying subscriber_trials for email:', email);
    const { data: trial, error: trialError } = await supabase
      .from('subscriber_trials')
      .select('status, tenant_id, company_name')
      .eq('email', email)
      .maybeSingle();

    console.log('[resolveTenant] Trial query result:', { trial, trialError });

    if (trial?.status === 'active' && trial?.tenant_id) {
      console.log('[resolveTenant] Found active trial with tenant_id:', trial.tenant_id);
      const { data: trialTenant, error: trialTenantError } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', trial.tenant_id)
        .maybeSingle();

      console.log('[resolveTenant] Trial tenant lookup result:', { trialTenant, trialTenantError });

      if (trialTenant) {
        return res.json({ tenant: trialTenant, source: 'trial' });
      }
    }

    console.log('[resolveTenant] No tenant found, returning null');
    return res.json({ tenant: null, source: 'none' });
  } catch (error) {
    console.error('[resolveTenant] error:', error);
    return res.status(500).json({ error: error.message });
  }
}