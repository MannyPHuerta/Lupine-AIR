import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Auth check — must be an admin
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: { user: adminUser }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !adminUser) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: adminUser.id, _role: 'admin' });
    if (!isAdmin) return Response.json({ error: 'Admin access required' }, { status: 403 });

    const { entryId, name, email, company, phone, branches, notes } = await req.json();
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const now = new Date();
    const toDate = (d) => d.toISOString().split('T')[0];
    const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

    // Ensure Supabase auth user exists (idempotent)
    await supabase.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});

    // Generate magic link to /ops
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: 'https://theprojectair.com/ops' },
    });
    if (linkErr) {
      console.error('[approveWaitlistEntry] generateLink error:', linkErr.message);
    }
    const magicLink = linkData?.properties?.action_link || 'https://theprojectair.com/ops';

    // Upsert subscriber_trials row
    const { error: trialErr } = await supabase.from('subscriber_trials').upsert({
      email,
      company_name: company || null,
      contact_name: name || null,
      phone: phone || null,
      branches: branches || null,
      status: 'invited',
      plan_tier: 'pro',
      trial_start_date: toDate(now),
      trial_ends_at: toDate(trialEndsAt),
      lockout_date: toDate(lockoutDate),
      approved_by: adminUser.email,
      approved_at: now.toISOString(),
      notes: notes || null,
    }, { onConflict: 'email' });
    if (trialErr) console.error('[approveWaitlistEntry] trial upsert error:', trialErr.message);

    // Mark waitlist entry approved
    if (entryId) {
      await supabase.from('waitlist_entries').update({
        status: 'approved',
        approved_by: adminUser.email,
        approved_at: now.toISOString(),
        notes: notes || null,
      }).eq('id', entryId);
    }

    // Send approval email with magic link
    const resendKey = Deno.env.get('RESEND_API_KEY');
    let emailSent = false;
    if (resendKey) {
      const resend = new Resend(resendKey);
      const { error: emailErr } = await resend.emails.send({
        from: 'AIR by Lupine <info@theprojectair.com>',
        to: [email],
        subject: `🎉 Your AIR trial is approved — sign in to get started`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h1 style="margin:0 0 8px">You're in! 🚀</h1>
            <p>Hi ${name || 'there'}, your early access for <strong>AIR by Lupine</strong> has been approved.</p>

            <p style="margin:24px 0">
              <a href="${magicLink}"
                 style="background:#0f172a;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">
                Sign In to AIR →
              </a>
            </p>
            <p style="font-size:12px;color:#64748b">This link expires in 24 hours. After that, visit <a href="https://theprojectair.com/ops">theprojectair.com/ops</a> to request a new one.</p>

            <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:20px 0;font-size:13px;color:#475569">
              Company: ${company || 'N/A'}<br/>
              Full Pro access until: ${toDate(trialEndsAt)}<br/>
              Account pauses on: ${toDate(lockoutDate)}
            </div>

            <p style="font-size:12px;color:#94a3b8">Questions? Reply to this email — we're here.</p>
          </div>
        `,
      });
      if (emailErr) console.error('[approveWaitlistEntry] email error:', emailErr);
      else emailSent = true;
    }

    console.log(`[approveWaitlistEntry] Approved ${email}, emailSent=${emailSent}`);
    return Response.json({ success: true, emailSent, magicLink });

  } catch (error) {
    console.error('[approveWaitlistEntry] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});