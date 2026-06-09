import { Resend } from 'npm:resend@2.0.0';

Deno.serve(async (req) => {
  try {
    const { email, company, branches, name, phone } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const result = await resend.emails.send({
      from: 'AIR Waitlist <noreply@theprojectair.com>',
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

    console.log('Resend result:', JSON.stringify(result));

    if (result.error) {
      console.error('Resend error:', JSON.stringify(result.error));
      return Response.json({ error: result.error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Caught error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});