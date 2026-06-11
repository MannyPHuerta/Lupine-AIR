import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const now = new Date();
    let processed = 0;

    const sendEmail = async (to, subject, html) => {
      try {
        await resend.emails.send({
          from: 'AIR by Lupine <info@theprojectair.com>',
          to: [to],
          subject,
          html,
        });
      } catch (e) {
        console.error(`[trialLifecycleCheck] Email error for ${to}:`, e.message);
      }
    };

    // Fetch all non-final trials in parallel
    const [trials, invitedTrials, coreTrials] = await Promise.all([
      base44.asServiceRole.entities.SubscriberTrial.filter({ status: 'trial' }),
      base44.asServiceRole.entities.SubscriberTrial.filter({ status: 'invited' }),
      base44.asServiceRole.entities.SubscriberTrial.filter({ status: 'core' }),
    ]);

    const allActive = [...trials, ...invitedTrials, ...coreTrials];
    console.log(`[trialLifecycleCheck] Processing ${allActive.length} active trials`);

    for (const trial of allActive) {
      const trialEndsAt = new Date(trial.trialEndsAt);
      const lockoutDate = new Date(trial.lockoutDate);
      const daysUntilExpiry = Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24));
      const isPreExpiry = trial.status === 'trial' || trial.status === 'invited';

      // ── Day 12: Reminder email (2 days before expiry) ──────────────────
      if (isPreExpiry && daysUntilExpiry <= 2 && daysUntilExpiry > 0 && !trial.reminderDay12Sent) {
        await sendEmail(
          trial.email,
          `⏰ ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} left on your AIR Pro trial`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#f59e0b">Your Pro trial expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}</h2>
            <p>Hi ${trial.contactName || 'there'},</p>
            <p>Your full Pro access to AIR expires on <strong>${trial.trialEndsAt}</strong>. After that, your account slides to Core — you'll keep essential rental features but lose Pro modules (AIRepair, AIRecovery, GPS tracking, multi-branch, etc.).</p>
            <p>To keep everything:</p>
            <a href="https://theprojectair.com/#pricing" style="background:#0ea5e9;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Upgrade to Pro →</a>
            <p style="color:#888;font-size:12px;margin-top:20px">Questions? Reply to this email.</p>
          </div>`
        );
        await base44.asServiceRole.entities.SubscriberTrial.update(trial.id, { reminderDay12Sent: true });
        processed++;
        console.log(`[trialLifecycleCheck] Day-12 reminder sent to ${trial.email}`);
      }

      // ── Day 14: Trial expired → downgrade to Core ──────────────────────
      if (isPreExpiry && trialEndsAt <= now && !trial.reminderDay14Sent) {
        await base44.asServiceRole.entities.SubscriberTrial.update(trial.id, {
          status: 'core',
          planTier: 'core',
          reminderDay14Sent: true,
        });
        await sendEmail(
          trial.email,
          `Your AIR Pro trial has ended — Core access is active`,
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#64748b">Your Pro trial has ended</h2>
            <p>Hi ${trial.contactName || 'there'},</p>
            <p>Your 14-day Pro trial has ended. Your account is now on the <strong>Core tier</strong> — you still have full access to counter operations, invoicing, customer management, and basic reports.</p>
            <p>To restore full Pro access and keep all AI modules:</p>
            <a href="https://theprojectair.com/#pricing" style="background:#0ea5e9;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-bottom:16px">Upgrade to Pro →</a>
            <p style="color:#64748b;">Your account will be paused on <strong>${trial.lockoutDate}</strong> if no subscription is set up. Your data is always preserved.</p>
            <p style="color:#888;font-size:12px;margin-top:20px">Questions? Reply to this email.</p>
          </div>`
        );
        processed++;
        console.log(`[trialLifecycleCheck] Downgraded ${trial.email} to Core`);
      }

      // ── Day 30: Lockout ────────────────────────────────────────────────
      if (lockoutDate <= now && !['suspended', 'active', 'cancelled'].includes(trial.status)) {
        await base44.asServiceRole.entities.SubscriberTrial.update(trial.id, { status: 'suspended' });
        if (!trial.lockoutNoticeSent) {
          await sendEmail(
            trial.email,
            `Your AIR account has been paused`,
            `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2 style="color:#ef4444">Your AIR account has been paused</h2>
              <p>Hi ${trial.contactName || 'there'},</p>
              <p>Your trial period ended 16 days ago and no subscription was set up, so your account has been paused. <strong>Your data is safe and will never be deleted.</strong></p>
              <p>To reactivate your account immediately:</p>
              <a href="https://theprojectair.com/#pricing" style="background:#0ea5e9;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-bottom:16px">Reactivate My Account →</a>
              <p style="color:#888;font-size:12px;margin-top:20px">Need help? Reply to this email or call us directly.</p>
            </div>`
          );
          await base44.asServiceRole.entities.SubscriberTrial.update(trial.id, { lockoutNoticeSent: true });
        }
        processed++;
        console.log(`[trialLifecycleCheck] Suspended ${trial.email}`);
      }
    }

    console.log(`[trialLifecycleCheck] Done — ${processed} lifecycle events processed`);
    return Response.json({ success: true, processed, total: allActive.length });

  } catch (error) {
    console.error('[trialLifecycleCheck] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});