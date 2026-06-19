import { createClient } from 'npm:@supabase/supabase-js@2.107.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://esckfcvxmbuhimmseqtb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || 'info@theprojectair.com';

    const [waitlist, trials, tenants, profiles] = await Promise.all([
      supabase.from('waitlist_entries').select('*').eq('email', email),
      supabase.from('subscriber_trials').select('*').eq('email', email),
      supabase.from('tenants').select('id, slug, status, admin_email, company_name').eq('admin_email', email),
      supabase.from('profiles').select('id, email, tenant_id, role').eq('email', email),
    ]);

    // Also look up tenant by profile tenant_id if found
    let tenantViaProfile = null;
    if (profiles.data?.length > 0 && profiles.data[0].tenant_id) {
      const { data } = await supabase
        .from('tenants')
        .select('id, slug, status, admin_email, company_name')
        .eq('id', profiles.data[0].tenant_id)
        .maybeSingle();
      tenantViaProfile = data;
    }

    return Response.json({
      email,
      waitlist: waitlist.data,
      trials: trials.data,
      tenants_by_admin_email: tenants.data,
      profiles: profiles.data,
      tenant_via_profile: tenantViaProfile,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});