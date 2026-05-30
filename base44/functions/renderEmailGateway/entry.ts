import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, htmlBody, fromName } = await req.json();

    if (!to || !subject || !htmlBody) {
      return Response.json({ error: 'Missing required fields: to, subject, htmlBody' }, { status: 400 });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { data, error } = await resend.emails.send({
      from: `${fromName || 'Rental World LLC'} <noreply@theprojectair.com>`,
      to: [to],
      subject,
      html: htmlBody,
    });

    if (error) {
      console.error('[renderEmailGateway] Resend error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Email sent via Resend', emailId: data?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});