import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const { email, company, branches, name, phone } = await req.json();
    console.log('[waitlistSubmit] Received:', { email, company, branches, name, phone });

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Store in Base44 WaitlistEntry entity
    const base44 = createClientFromRequest(req);
    const entry = await base44.asServiceRole.entities.WaitlistEntry.create({
      name: name || '',
      email,
      phone: phone || '',
      company: company || '',
      branches: branches || '1',
      status: 'pending',
    });
    console.log('[waitlistSubmit] Saved WaitlistEntry:', entry?.id);

    // Send emails
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
        from: 'AIR Waitlist <info@theprojectair.com>',
        to: [email],
        subject: "🚀 You're in — AIR early access confirmed",
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#0ea5e9">Welcome to the AIR early access list! 🎉</h2>
            <p style="color:#555;line-height:1.6">Hi ${name || 'there'},</p>
            <p style="color:#555;line-height:1.6">You're in — and you picked the right time. Early subscribers lock in <strong>founding pricing for 24 months</strong>, guaranteed. No surprise bills, no per-user seats, just one price per branch.</p>
            <div style="background:#0ea5e9;color:white;padding:20px;border-radius:8px;margin:24px 0;text-align:center">
              <p style="margin:0;font-size:14px"><strong>What you're getting:</strong></p>
              <p style="margin:12px 0 0 0;font-weight:bold;font-size:18px">AIRental + AIREvents + AIReports + more</p>
              <p style="margin:8px 0 0 0;font-size:13px;opacity:0.9">14-day free trial. Full Pro access. No credit card required.</p>
            </div>
            <p style="color:#555;line-height:1.6"><strong>Here's what happens next:</strong></p>
            <ol style="color:#555;line-height:1.8">
              <li>We'll reach out within 2 business days to schedule a personalized 30-min demo</li>
              <li>See your rental operation on the AIR platform — with YOUR data</li>
              <li>Ask any questions; we'll handle setup</li>
            </ol>
            <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:20px 0">
              <p style="color:#555;margin:0;font-size:13px"><strong>We have your info:</strong></p>
              <p style="color:#888;margin:8px 0 0 0;font-size:13px">Company: <strong>${company || 'N/A'}</strong> · Branches: <strong>${branches || 'N/A'}</strong></p>
            </div>
            <p style="color:#888;font-size:12px;margin-top:24px;border-top:1px solid #ddd;padding-top:16px">Questions or want to move faster? Hit reply — we'll get back to you within a few hours.</p>
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