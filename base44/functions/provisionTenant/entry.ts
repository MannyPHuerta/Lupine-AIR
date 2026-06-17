import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.107.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify auth
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return Response.json({ error: 'Server configuration error: Missing Supabase credentials' }, { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL.replace(/\/rest\/v1\/?$/, ''), SUPABASE_SERVICE_ROLE_KEY, { 
      auth: { persistSession: false } 
    });

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const body = await req.json();
    const {
      companyName, industry, phone,
      branchName, branchAddress, branchCity, branchState, branchZip,
      branchPhone, branchEmail, invoicePrefix, planTier = 'starter',
    } = body;

    console.log('Provisioning tenant:', { companyName, branchName, planTier, user: user.email });

    if (!companyName || !branchName) {
      return Response.json({ error: 'companyName and branchName are required' }, { status: 400 });
    }

    // Check if already provisioned
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (existingProfile?.tenant_id) {
      return Response.json({ error: 'Tenant already provisioned', tenantId: existingProfile.tenant_id }, { status: 409 });
    }

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) + '-' + Date.now().toString(36);

    // 1. Create Tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        company_name: companyName,
        slug,
        admin_email: user.email,
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

    if (tenantError) {
      console.error('Tenant error:', tenantError);
      return Response.json({ error: tenantError.message }, { status: 500 });
    }

    // 2. Create Branch
    const prefix = (invoicePrefix || branchName.slice(0, 3)).toUpperCase();
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .insert({
        tenant_id: tenant.id,
        name: branchName,
        code: prefix,
        address: branchAddress || null,
        city: branchCity || null,
        state: branchState || null,
        zip: branchZip || null,
        phone: branchPhone || null,
        email: branchEmail || user.email,
        next_invoice_number: 1000,
        default_starting_float: 0,
        is_active: true,
      })
      .select()
      .single();

    if (branchError) {
      console.error('Branch error:', branchError);
      return Response.json({ error: branchError.message }, { status: 500 });
    }

    // 3. Create CompanySettings
    const { error: companyError } = await supabaseAdmin
      .from('company_settings')
      .insert({
        tenant_id: tenant.id,
        invoice_number_prefix: prefix,
        auto_assign_invoice_numbers: true,
        invoice_number_start: 1001,
        rental_day_mode: 'clock_hour',
        late_fees_enabled: false,
        sms_reminders_enabled: true,
        header_style: 'classic',
        store_mode: industry === 'construction' ? 'construction_only' : industry === 'events' ? 'events_only' : 'both',
      });

    if (companyError) {
      console.error('Company settings error:', companyError);
      return Response.json({ error: companyError.message }, { status: 500 });
    }

    // 4. Create Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        tenant_id: tenant.id,
        home_branch_id: branch.id,
        current_branch_id: branch.id,
        full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        role: 'owner',
        is_active: true,
      });

    if (profileError) {
      console.error('Profile error:', profileError);
      return Response.json({ error: profileError.message }, { status: 500 });
    }

    // 5. Mark onboarding complete
    await supabaseAdmin
      .from('tenants')
      .update({ onboarding_completed: true, onboarding_step: 4 })
      .eq('id', tenant.id);

    return Response.json({ success: true, tenantId: tenant.id, branchId: branch.id });
  } catch (error) {
    console.error('Provision error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});