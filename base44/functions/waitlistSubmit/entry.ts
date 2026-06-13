import { createClient } from 'npm:@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const { email, company, branches, name, phone } = await req.json();
    console.log('[waitlistSubmit] Received:', { email, company, branches, name, phone });

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const sb = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    const { data: entry, error: dbError } = await sb
      .from('waitlist_entries')
      .insert({ name: name || '', email, phone: phone || '', company: company || '', branches: branches || '1', status: 'pending' })
      .select()
      .single();
    if (dbError) {
      console.error('[waitlistSubmit] DB error:', dbError.message);
      return Response.json({ error: dbError.message }, { status: 500 });
    }
    console.log('[waitlistSubmit] Saved to Supabase:', entry?.id);

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      console.error('[waitlistSubmit] RESEND_API_KEY not configured');
      return Response.json({ success: true, warning: 'Entry saved but email not configured' });
    }

    const resend = new Resend(apiKey);

    await Promise.all([
      resend.emails.send({
        from: 'AIR Waitlist <info@theprojectair.com>',
        to: ['info@theprojectair.com'],
        reply_to: email,
        subject: `🚀 New Early Access Request — ${company || email}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#0ea5e9">New Early Access Request</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px;font-weight:bold;color:#555">Name</td><td style="padding:8px">${name || '—'}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Email</td><td style="padding:8px">${email}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Phone</td><td style="padding:8px">${phone || '—'}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Company</td><td style="padding:8px">${company || '—'}</td></tr>
              <tr><td style="padding:8px;font-weight:bold;color:#555">Branches</td><td style="padding:8px">${branches || '—'}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Submitted</td><td style="padding:8px">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST</td></tr>
            </table>
            <p style="color:#888;font-size:12px;margin-top:16px">Reply to reach ${name || 'submitter'} at ${email}.</p>
          </div>
        `,
      }),
      resend.emails.send({
        from: 'AIR by Lupine <info@theprojectair.com>',
        to: [email],
        subject: "🚀 You're on the list — AIR early access confirmed",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#f1f5f9;border-radius:12px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);padding:32px;text-align:center">
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff">You're on the list! 🎉</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:16px">AIR early access confirmed</p>
            </div>
            <div style="padding:32px">
              <p style="color:#94a3b8;line-height:1.7">Hi ${name || 'there'},</p>
              <p style="color:#cbd5e1;line-height:1.7">
                You picked the right time. Early subscribers lock in <strong style="color:#0ea5e9">founding pricing for 24 months</strong>, guaranteed.
              </p>
              <div style="background:#1e293b;border-radius:10px;padding:16px;margin:24px 0;font-size:13px;color:#475569">
                <strong style="color:#94a3b8">We have your info:</strong><br/>
                Company: <strong style="color:#cbd5e1">${company || 'N/A'}</strong> &nbsp;·&nbsp; Branches: <strong style="color:#cbd5e1">${branches || 'N/A'}</strong>
              </div>
              <p style="color:#475569;font-size:12px;margin-top:24px;text-align:center">
                Questions? Just reply to this email — we're here.<br/>
                <a href="https://theprojectair.com" style="color:#0ea5e9">theprojectair.com</a>
              </p>
            </div>
          </div>
        `,
      }),
    ]);

    console.log('[waitlistSubmit] Emails sent successfully');
    return Response.json({ success: true, entryId: entry?.id });

  } catch (error) {
    console.error('[waitlistSubmit] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});