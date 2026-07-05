// @ts-check
// Vercel serverless function — provisions a new tenant in Supabase
/* global process */
import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase env vars:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey });
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !user) {
    console.error('Auth error:', userError);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    companyName, industry, phone,
    branchName, branchAddress, branchCity, branchState, branchZip,
    branchPhone, branchEmail, invoicePrefix, planTier = 'starter',
  } = req.body;

  console.log('Provisioning tenant:', { companyName, branchName, planTier, user: user.email });

  if (!companyName || !branchName) {
    return res.status(400).json({ error: 'companyName and branchName are required' });
  }

  // Already provisioned?
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingProfile?.tenant_id) {
    return res.status(409).json({ error: 'Tenant already provisioned', tenantId: existingProfile.tenant_id });
  }

  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) + '-' + Date.now().toString(36);

  // 1. Tenant
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

  if (tenantError) return res.status(500).json({ error: tenantError.message });

  // 2. Branch
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

  if (branchError) return res.status(500).json({ error: branchError.message });

  // 3. Company settings
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

  if (companyError) return res.status(500).json({ error: companyError.message });

  // 4. Profile (NO role column — roles live in user_roles only)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: user.id,
      tenant_id: tenant.id,
      home_branch_id: branch.id,
      current_branch_id: branch.id,
      full_name: user.user_metadata?.full_name || user.email.split('@')[0],
      is_active: true,
    });

  if (profileError) return res.status(500).json({ error: profileError.message });

  // 5. Owner role — sole source of truth for authorization
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: user.id,
      role: 'owner',
      tenant_id: tenant.id,
    });

  if (roleError && roleError.code !== '23505') {
    // 23505 = unique_violation (already has owner role); anything else is fatal
    return res.status(500).json({ error: roleError.message });
  }

  // 6. Mark onboarding complete
  await supabaseAdmin
    .from('tenants')
    .update({ onboarding_completed: true, onboarding_step: 4 })
    .eq('id', tenant.id);


  return res.status(200).json({ success: true, tenantId: tenant.id, branchId: branch.id });
}

