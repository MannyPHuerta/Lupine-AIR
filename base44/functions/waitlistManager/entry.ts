import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const supabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { action, entryId, notes } = await req.json();
    const sb = supabaseAdmin();

    // LIST: return both tables
    if (action === 'list') {
      const [{ data: waitlist }, { data: trials }] = await Promise.all([
        sb.from('waitlist_entries').select('*').order('created_at', { ascending: false }),
        sb.from('subscriber_trials').select('*').order('created_at', { ascending: false }),
      ]);
      return Response.json({ waitlist: waitlist || [], trials: trials || [] });
    }

    // REJECT
    if (action === 'reject') {
      await sb.from('waitlist_entries').update({ status: 'rejected' }).eq('id', entryId);
      return Response.json({ success: true });
    }

    // APPROVE
    if (action === 'approve') {
      const { data: entry } = await sb.from('waitlist_entries').select('*').eq('id', entryId).single();
      if (!entry) return Response.json({ error: 'Entry not found' }, { status: 404 });

      const now = new Date();
      const toDate = (d) => d.toISOString().split('T')[0];
      const trialEndsAt = new Date(now); trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      const lockoutDate = new Date(now); lockoutDate.setDate(lockoutDate.getDate() + 30);

      // Insert trial record
      const { error: trialErr } = await sb.from('subscriber_trials').insert({
        email: entry.email,
        company_name: entry.company,
        contact_name: entry.name,
        phone: entry.phone,
        branches: entry.branches,
        status: 'invited',
        plan_tier: 'pro',
        trial_start_date: toDate(now),
        trial_ends_at: toDate(trialEndsAt),
        lockout_date: toDate(lockoutDate),
        approved_by: user.email,
        approved_at: now.toISOString(),
        notes: notes || null,
      });
      if (trialErr) return Response.json({ error: trialErr.message }, { status: 500 });

      // Mark waitlist entry approved
      await sb.from('waitlist_entries').update({
        status: 'approved',
        approved_by: user.email,
        approved_at: now.toISOString(),
        notes: notes || null,
      }).eq('id', entryId);

      // Invite via Base44 platform
      try {
        await base44.users.inviteUser(entry.email, 'user');
        console.log(`[waitlistManager] Platform invite sent to ${entry.email}`);
      } catch (e) {
        console.warn(`[waitlistManager] Platform invite failed:`, e.message);
      }

      // Send welcome email
      const apiKey = Deno.env.get('RESEND_API_KEY');
      if (apiKey) {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: 'AIR by Lupine <info@theprojectair.com>',
          to: [entry.email],
          subject: `🎉 Your AIR trial is approved — here's how to get started`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
              <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
                <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">You're in! 🚀</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px">Your AIR early access has been approved</p>
              </div>
              <div style="padding:32px">
                <p style="color:#94a3b8;line-height:1.7">Hi ${entry.name || 'there'},</p>
                <p style="color:#cbd5e1;line-height:1.7">
                  Your early access request for <strong style="color:#0ea5e9">AIR by Lupine</strong> has been approved.
                  Here's what your 30-day window looks like:
                </p>
                <div style="background:#1e293b;border-radius:10px;padding:20px;margin:20px 0">
                  <div style="margin-bottom:14px">
                    <strong style="color:#f1f5f9">Days 1–14: Full Pro Access</strong>
                    <p style="color:#64748b;margin:4px 0 0 0;font-size:13px">All features unlocked.</p>
                  </div>
                  <div style="margin-bottom:14px">
                    <strong style="color:#f1f5f9">Days 15–30: Core Tier</strong>
                    <p style="color:#64748b;margin:4px 0 0 0;font-size:13px">Essential features stay active. Upgrade to keep Pro.</p>
                  </div>
                  <div>
                    <strong style="color:#f1f5f9">Day 30: Account Pauses</strong>
                    <p style="color:#64748b;margin:4px 0 0 0;font-size:13px">We'll send reminders. Your data is never deleted.</p>
                  </div>
                </div>
                <div style="background:#0c2240;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin:20px 0;font-size:14px;color:#93c5fd">
                  <strong>📧 Next step:</strong> Check your inbox for a separate invitation email from the AIR platform.
                  Click that link to create your account, then sign in at
                  <a href="https://theprojectair.com" style="color:#0ea5e9">theprojectair.com</a>.
                </div>
                <div style="text-align:center;margin:28px 0">
                  <a href="https://theprojectair.com/onboarding"
                     style="background:#0ea5e9;color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;display:inline-block">
                    Complete Setup →
                  </a>
                </div>
                <div style="background:#1e293b;border-radius:8px;padding:16px;font-size:13px;color:#475569">
                  <strong style="color:#94a3b8">Your trial summary:</strong><br/>
                  Company: ${entry.company || 'N/A'}<br/>
                  Trial start: ${toDate(now)}<br/>
                  Full Pro access until: ${toDate(trialEndsAt)}<br/>
                  Account pauses on: ${toDate(lockoutDate)}
                </div>
              </div>
            </div>
          `,
        });
        console.log(`[waitlistManager] Welcome email sent to ${entry.email}`);
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    console.error('[waitlistManager]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});