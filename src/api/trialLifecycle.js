// Vercel Cron Function — runs daily at 8am CST (14:00 UTC)
/* global process */
// Configure in vercel.json: { "path": "/api/trialLifecycle", "schedule": "0 14 * * *" }
// No auth required — secured by CRON_SECRET header check

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // Vercel cron jobs inject Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const apiKey = process.env.RESEND_API_KEY;
  const today = new Date().toISOString().split('T')[0];

  const sendEmail = async (to, subject, html) => {
    if (!apiKey) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'AIR Platform <info@theprojectair.com>', to: [to], subject, html }),
    });
  };

  // Fetch all active trials
  const { data: trials, error } = await supabase
    .from('subscriber_trials')
    .select('*')
    .in('status', ['invited', 'trial', 'core']);

  if (error) return res.status(500).json({ error: error.message });

  const stats = { reminded: 0, downgraded: 0, locked: 0, total: trials?.length || 0 };

  for (const trial of trials || []) {
    const trialEndsAt = trial.trial_ends_at;
    const lockoutDate = trial.lockout_date;
    const daysUntilExpiry = Math.ceil((new Date(trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24));

    // Day 12 reminder (2 days before trial ends)
    if (daysUntilExpiry === 2 && !trial.reminder_day12_sent) {
      await sendEmail(trial.email, '⏰ 2 days left on your AIR Pro trial', `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#f59e0b">Your Pro trial ends in 2 days</h2>
          <p style="color:#555;">Hi ${trial.contact_name || 'there'}, your full Pro access expires on <strong>${trialEndsAt}</strong>.</p>
          <p style="color:#555;">After that you'll drop to Core tier. Subscribe now to keep everything.</p>
          <a href="https://theprojectair.com/#pricing" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">View Plans →</a>
        </div>
      `);
      await supabase.from('subscriber_trials').update({ reminder_day12_sent: true }).eq('id', trial.id);
      stats.reminded++;
    }

    // Day 14: downgrade to core
    if (today >= trialEndsAt && trial.status === 'trial' && !trial.reminder_day14_sent) {
      await supabase.from('subscriber_trials').update({ status: 'core', reminder_day14_sent: true }).eq('id', trial.id);
      await sendEmail(trial.email, 'Your AIR trial has ended — you\'re now on Core', `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#6366f1">Your Pro trial has ended</h2>
          <p style="color:#555;">Hi ${trial.contact_name || 'there'}, your 14-day Pro trial is over. You now have <strong>Core tier</strong> access.</p>
          <p style="color:#555;">You have until <strong>${lockoutDate}</strong> to subscribe before your account is paused.</p>
          <a href="https://theprojectair.com/#pricing" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Subscribe Now →</a>
        </div>
      `);
      stats.downgraded++;
    }

    // Day 30: suspend account
    if (today >= lockoutDate && ['trial', 'core'].includes(trial.status) && !trial.lockout_notice_sent) {
      await supabase.from('subscriber_trials').update({ status: 'suspended', lockout_notice_sent: true }).eq('id', trial.id);
      await sendEmail(trial.email, 'Your AIR account has been paused', `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#ef4444">Your account has been paused</h2>
          <p style="color:#555;">Hi ${trial.contact_name || 'there'}, your trial period has ended and your account is now paused.</p>
          <p style="color:#555;">Subscribe at any time to restore full access instantly.</p>
          <a href="https://theprojectair.com/#pricing" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px;">Reactivate Account →</a>
        </div>
      `);
      stats.locked++;
    }
  }

  return res.status(200).json({ success: true, stats });
}