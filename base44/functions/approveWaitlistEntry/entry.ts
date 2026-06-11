import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { entryId, name, email, company, phone, branches, notes } = await req.json();
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 });

    const toDate = (d) => d.toISOString().split('T')[0];
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const lockoutDate = new Date(now);
    lockoutDate.setDate(lockoutDate.getDate() + 30);

    // Create SubscriberTrial record
    const trial = await base44.asServiceRole.entities.SubscriberTrial.create({
      email,
      companyName: company || '',
      contactName: name || '',
      phone: phone || '',
      branches: branches || '1',
      status: 'invited',
      planTier: 'pro',
      trialStartDate: toDate(now),
      trialEndsAt: toDate(trialEndsAt),
      lockoutDate: toDate(lockoutDate),
      approvedBy: user.email,
      approvedAt: now.toISOString(),
      notes: notes || '',
    });

    // Invite user via Base44 (they'll get a platform invite to set their password)
    try {
      await base44.users.inviteUser(email, 'user');
      console.log(`[approveWaitlistEntry] Invited ${email} via Base44`);
    } catch (inviteErr) {
      console.warn(`[approveWaitlistEntry] Platform invite failed for ${email}:`, inviteErr.message);
      // Continue — our welcome email still goes out
    }

    // Send approval + welcome email
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: 'AIR by Lupine <info@theprojectair.com>',
        to: [email],
        subject: `🎉 Your AIR trial is approved — here's how to get started`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">You're in! 🚀</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px">Your AIR early access has been approved</p>
            </div>
            <div style="padding:32px">
              <p style="color:#94a3b8;line-height:1.7">Hi ${name || 'there'},</p>
              <p style="color:#cbd5e1;line-height:1.7">
                Your early access request for <strong style="color:#0ea5e9">AIR by Lupine</strong> has been approved.
                Here's what your 30-day window looks like:
              </p>

              <div style="background:#1e293b;border-radius:10px;padding:20px;margin:20px 0">
                <div style="margin-bottom:14px">
                  <span style="background:#0ea5e9;color:#000;border-radius:50%;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;vertical-align:middle;margin-right:10px">1</span>
                  <strong style="color:#f1f5f9">Days 1–14: Full Pro Access</strong>
                  <p style="color:#64748b;margin:4px 0 0 36px;font-size:13px">All features unlocked — AIRental, AIREvents, AIRepair, AIRoads, GPS tracking, and more.</p>
                </div>
                <div style="margin-bottom:14px">
                  <span style="background:#f59e0b;color:#000;border-radius:50%;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;vertical-align:middle;margin-right:10px">2</span>
                  <strong style="color:#f1f5f9">Days 15–30: Core Tier</strong>
                  <p style="color:#64748b;margin:4px 0 0 36px;font-size:13px">Essential rental features stay active. Upgrade to keep full Pro access.</p>
                </div>
                <div>
                  <span style="background:#ef4444;color:#fff;border-radius:50%;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;vertical-align:middle;margin-right:10px">3</span>
                  <strong style="color:#f1f5f9">Day 30: Account Pauses</strong>
                  <p style="color:#64748b;margin:4px 0 0 36px;font-size:13px">We'll send reminders. Your data is never deleted.</p>
                </div>
              </div>

              <div style="background:#0c2240;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;color:#93c5fd">
                <strong>📧 Next step:</strong> Check your inbox for a separate invitation email from the AIR platform.
                Click the link in that email to create your account and set your password.
                Then sign in at <a href="https://theprojectair.com" style="color:#0ea5e9">theprojectair.com</a> to complete setup.
              </div>

              <div style="text-align:center;margin:28px 0">
                <a href="https://theprojectair.com/onboarding"
                   style="background:#0ea5e9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block">
                  Complete Setup →
                </a>
              </div>

              <div style="background:#1e293b;border-radius:8px;padding:16px;font-size:13px;color:#475569">
                <strong style="color:#94a3b8">Your trial summary:</strong><br/>
                Company: ${company || 'N/A'}<br/>
                Trial start: ${toDate(now)}<br/>
                Full Pro access until: ${toDate(trialEndsAt)}<br/>
                Account pauses on: ${toDate(lockoutDate)}
              </div>

              <p style="color:#475569;font-size:12px;margin-top:24px;text-align:center">
                Questions? Reply to this email — we're here.<br/>
                <a href="https://theprojectair.com" style="color:#0ea5e9">theprojectair.com</a>
              </p>
            </div>
          </div>
        `,
      });
      console.log(`[approveWaitlistEntry] Welcome email sent to ${email}`);
    }

    // Update WaitlistEntry status
    if (entryId) {
      await base44.asServiceRole.entities.WaitlistEntry.update(entryId, {
        status: 'approved',
        approvedBy: user.email,
        approvedAt: now.toISOString(),
        notes: notes || '',
      });
    }

    console.log(`[approveWaitlistEntry] Approved ${email} — Trial ID: ${trial.id}`);
    return Response.json({ success: true, trialId: trial.id });

  } catch (error) {
    console.error('[approveWaitlistEntry] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});