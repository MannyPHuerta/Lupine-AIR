import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { companyName, prospectEmail } = await req.json();
    if (!companyName) {
      return Response.json({ error: 'companyName is required' }, { status: 400 });
    }

    const slug = generateSlug(companyName);
    const adminPassword = generatePassword();
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create Tenant record
    const tenant = await base44.asServiceRole.entities.Tenant.create({
      companyName,
      adminEmail: prospectEmail || `admin@${slug}.demo`,
      status: 'trial',
      trialStartDate: now.toISOString().split('T')[0],
      trialEndsAt: trialEndsAt.toISOString().split('T')[0],
      planTier: 'starter',
      industry: 'both',
      onboardingCompleted: true,
      onboardingStep: 4,
      subdomain: slug,
    });

    // Create CompanySettings
    await base44.asServiceRole.entities.CompanySettings.create({
      companyName,
      invoiceNumberPrefix: slug.slice(0, 3).toUpperCase(),
      autoAssignInvoiceNumbers: true,
      invoiceNumberStart: 1001,
      rentalDayMode: 'clock_hour',
      lateFeesEnabled: false,
      smsRemindersEnabled: false,
      headerStyle: 'classic',
      storeMode: 'both',
      demoModeEnabled: true,
      demoBranch: '01 State Street',
    });

    // Create BranchSettings
    await base44.asServiceRole.entities.BranchSettings.create({
      branch: '01 State Street',
      invoicePrefix: slug.slice(0, 3).toUpperCase(),
      nextInvoiceNumber: 1000,
      address: '100 State Street, Chicago, IL 60601',
      defaultStartingFloat: 200,
    });

    return Response.json({
      success: true,
      tenantId: tenant.id,
      companyName,
      adminEmail: prospectEmail || `admin@${slug}.demo`,
      adminPassword,
      loginUrl: 'https://theprojectair.com/signin',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});