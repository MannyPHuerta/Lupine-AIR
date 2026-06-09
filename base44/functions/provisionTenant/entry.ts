import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    // Use service role to bypass RLS for provisioning
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY'),
      { auth: { persistSession: false } }
    );

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyName,
      industry,
      phone,
      branchName,
      branchAddress,
      branchPhone,
      branchEmail,
      invoicePrefix,
      planTier = 'starter',
    } = body;

    if (!companyName || !branchName) {
      return Response.json({ error: 'companyName and branchName are required' }, { status: 400 });
    }

    // Check if tenant already exists for this user
    const { data: existing } = await supabaseAdmin
      .from('tenant')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: 'Tenant already provisioned' }, { status: 409 });
    }

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // 1. Create Tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenant')
      .insert({
        company_name: companyName,
        admin_email: user.email,
        admin_user_id: user.id,
        status: 'trial',
        trial_start_date: now.toISOString().split('T')[0],
        trial_ends_at: trialEndsAt.toISOString().split('T')[0],
        plan_tier: planTier,
        industry: industry || 'both',
        phone: phone || null,
        onboarding_completed: false,
        onboarding_step: 0,
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    // 2. Create CompanySettings
    const { error: companyError } = await supabaseAdmin
      .from('company_settings')
      .insert({
        company_name: companyName,
        invoice_number_prefix: invoicePrefix || branchName.slice(0, 3).toUpperCase(),
        auto_assign_invoice_numbers: true,
        invoice_number_start: 1001,
        rental_day_mode: 'clock_hour',
        late_fees_enabled: false,
        sms_reminders_enabled: true,
        header_style: 'classic',
        store_mode: industry === 'construction' ? 'construction_only' : industry === 'events' ? 'events_only' : 'both',
      });

    if (companyError) throw companyError;

    // 3. Create BranchSettings
    const { error: branchError } = await supabaseAdmin
      .from('branch_settings')
      .insert({
        branch: branchName,
        invoice_prefix: invoicePrefix || branchName.slice(0, 3).toUpperCase(),
        next_invoice_number: 1000,
        address: branchAddress || null,
        phone: branchPhone || null,
        email: branchEmail || user.email,
        default_starting_float: 0,
      });

    if (branchError) throw branchError;

    // 4. Mark onboarding complete on tenant
    await supabaseAdmin
      .from('tenant')
      .update({ onboarding_completed: true, onboarding_step: 4 })
      .eq('id', tenant.id);

    return Response.json({ success: true, tenantId: tenant.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});