import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Send minimal-branding email (invoice/content only, no company header/logo).
 * Reusable for rental invoices, bridal designs, planning permits, etc.
 * Routes through Render backend.
 */
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

    // Strip wolf silhouette and other images from content
    const cleanContent = contentHtml.replace(/<img[^>]*>/g, '');

    // Wrap content in minimal HTML with no branding—just the invoice table/details
    const minimalHtml = `<!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #2c3e50; line-height: 1.6; margin: 0; padding: 0; }
    .container { max-width: 650px; margin: 0 auto; background: #fff; padding: 20px; }
    .content { }
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

    // Forward to Render backend via renderEmailGateway
    const response = await base44.functions.invoke('renderEmailGateway', {
      to,
      subject,
      htmlBody: minimalHtml,
      fromName,
    });

    return Response.json({ success: true, message: 'Email sent', data: response.data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});