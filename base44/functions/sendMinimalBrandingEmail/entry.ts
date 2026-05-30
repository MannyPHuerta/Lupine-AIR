import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, subject, contentHtml, fromName = 'Rental World LLC' } = await req.json();

    if (!to || !subject || !contentHtml) {
      return Response.json({ error: 'Missing required fields: to, subject, contentHtml' }, { status: 400 });
    }

    // Strip images from content
    const cleanContent = contentHtml.replace(/<img[^>]*>/g, '');

    const minimalHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #2c3e50; line-height: 1.6; margin: 0; padding: 0; }
.container { max-width: 650px; margin: 0 auto; background: #fff; padding: 20px; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; }
th { background: #ecf0f1; padding: 12px; text-align: left; font-weight: 600; font-size: 12px; color: #2c3e50; border-bottom: 2px solid #bdc3c7; }
td { padding: 12px; border-bottom: 1px solid #ecf0f1; }
.totals { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
.total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
.total-row.grand { border-top: 2px solid #2c3e50; padding-top: 12px; font-weight: bold; font-size: 16px; color: #2c3e50; margin-top: 12px; }
.footer { text-align: center; padding: 20px; font-size: 12px; color: #7f8c8d; border-top: 1px solid #ecf0f1; margin-top: 20px; }
</style>
</head>
<body>
<div class="container">
<div class="content">
${cleanContent}
</div>
<div class="footer">
<p>This is an automated message. Please do not reply directly to this email.</p>
</div>
</div>
</body>
</html>`;

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const { data, error } = await resend.emails.send({
      from: `${fromName} <noreply@theprojectair.com>`,
      to: [to],
      subject,
      html: minimalHtml,
    });

    if (error) {
      console.error('[sendMinimalBrandingEmail] Resend error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Email sent', emailId: data?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});