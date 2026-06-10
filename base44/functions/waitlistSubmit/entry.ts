import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const { email, company, branches, name, phone } = await req.json();
    console.log('[WaitlistBackend] Received payload:', { email, company, branches, name, phone });

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    console.log('[WaitlistBackend] RESEND_API_KEY exists:', !!apiKey);
    
    if (!apiKey) {
      return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    // Send notification email to admin
    console.log('[WaitlistBackend] Sending admin notification...');
    const adminResult = await resend.emails.send({
      from: 'AIR Waitlist <info@theprojectair.com>',
      to: ['info@theprojectair.com'],
      reply_to: email,
      subject: `🚀 New Early Access Request — ${company || email}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">New Early Access Request</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #555;">Name</td>
              <td style="padding: 8px;">${name || '—'}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #555;">Email</td>
              <td style="padding: 8px;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #555;">Phone</td>
              <td style="padding: 8px;">${phone || '—'}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #555;">Company</td>
              <td style="padding: 8px;">${company || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #555;">Branches</td>
              <td style="padding: 8px;">${branches || '—'}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; color: #555;">Submitted</td>
              <td style="padding: 8px;">${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST</td>
            </tr>
          </table>
          <p style="color: #888; font-size: 12px; margin-top: 16px;">
            Reply to this email to reach ${name || 'the submitter'} directly at ${email}.
          </p>
        </div>
      `,
    });

    console.log('[WaitlistBackend] Admin notification result:', JSON.stringify(adminResult, null, 2));

    // Send confirmation email to submitter
    console.log('[WaitlistBackend] Sending confirmation to submitter...');
    const confirmationResult = await resend.emails.send({
      from: 'AIR Waitlist <info@theprojectair.com>',
      to: [email],
      subject: 'Thanks for your interest in AIR! 🎉',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0ea5e9;">Thanks for requesting early access!</h2>
          <p style="color: #555; line-height: 1.6;">
            Hi ${name || 'there'},
          </p>
          <p style="color: #555; line-height: 1.6;">
            Thanks for your interest in AIR by Lupine. We've received your request and our team will reach out within 2 business days to schedule your personalized demo.
          </p>
          <div style="background: #f9f9f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #555; margin: 0;"><strong>Your submission:</strong></p>
            <p style="color: #555; margin: 8px 0 0 0;">Company: ${company || 'N/A'}</p>
            <p style="color: #555; margin: 4px 0 0 0;">Branches: ${branches}</p>
            <p style="color: #555; margin: 4px 0 0 0;">Phone: ${phone || 'N/A'}</p>
          </div>
          <p style="color: #555; line-height: 1.6;">
            In the meantime, feel free to explore our platform at <a href="https://www.theprojectair.com" style="color: #0ea5e9;">www.theprojectair.com</a>.
          </p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Questions? Reply to this email — we're here to help.
          </p>
        </div>
      `,
    });

    console.log('[WaitlistBackend] Confirmation email result:', JSON.stringify(confirmationResult, null, 2));

    if (adminResult.error) {
      console.error('[WaitlistBackend] Admin email error:', JSON.stringify(adminResult.error, null, 2));
      return Response.json({ error: adminResult.error.message }, { status: 500 });
    }

    if (confirmationResult.error) {
      console.error('[WaitlistBackend] Confirmation email error:', JSON.stringify(confirmationResult.error, null, 2));
      return Response.json({ error: confirmationResult.error.message }, { status: 500 });
    }

    console.log('[WaitlistBackend] Both emails sent successfully!');
    return Response.json({ 
      success: true, 
      adminEmailId: adminResult.data?.id,
      confirmationEmailId: confirmationResult.data?.id
    });
  } catch (error) {
    console.error('[WaitlistBackend] Caught error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});