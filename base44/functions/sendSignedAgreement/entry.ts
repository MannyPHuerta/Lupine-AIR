import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Resend } from 'npm:resend@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      agreementId,
      customerName,
      customerEmail,
      invoiceNumber,
      branch,
      signedPdfBase64,   // base64-encoded PDF from frontend
    } = await req.json();

    if (!customerEmail) return Response.json({ error: 'No customer email provided' }, { status: 400 });
    if (!signedPdfBase64) return Response.json({ error: 'No PDF data provided' }, { status: 400 });

    // Fetch company/branch info for email branding
    const [companyList, branchList] = await Promise.all([
      base44.asServiceRole.entities.CompanySettings.list(),
      branch ? base44.asServiceRole.entities.BranchSettings.filter({ branch }) : Promise.resolve([]),
    ]);
    const company = companyList[0] || {};
    const bs = branchList[0] || {};
    const companyName = company.companyName || 'AIR Equipment Rental';
    const branchPhone = bs.phone || company.phone || '';
    const branchEmail = bs.email || company.email || '';

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const subject = invoiceNumber
      ? `Signed Rental Agreement — Invoice ${invoiceNumber}`
      : `Signed Equipment Rental Agreement`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; color: #2c3e50; margin: 0; padding: 0; background: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center;">
      <div style="font-size: 22px; font-weight: bold; margin-bottom: 4px;">${companyName}</div>
      <div style="font-size: 13px; opacity: 0.85;">Signed Rental Agreement</div>
    </div>
    <div style="padding: 30px;">
      <p style="margin: 0 0 16px 0;">Dear <strong>${customerName || 'Customer'}</strong>,</p>
      <p style="margin: 0 0 16px 0;">
        Thank you for completing your rental agreement. A signed copy is attached to this email for your records.
        ${invoiceNumber ? `<br><strong>Invoice #:</strong> ${invoiceNumber}` : ''}
        ${branch ? `<br><strong>Branch:</strong> ${branch}` : ''}
      </p>
      <div style="background: #f0f7ff; border-left: 4px solid #2a5298; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-size: 13px; color: #1e3c72;">
          Please retain this copy for your records. The terms of this agreement are binding as of the date signed.
        </p>
      </div>
      <p style="margin: 20px 0 0 0; font-size: 13px; color: #7f8c8d;">
        Questions? Contact us:
        ${branchPhone ? `<br>📞 ${branchPhone}` : ''}
        ${branchEmail ? `<br>✉️ ${branchEmail}` : ''}
      </p>
    </div>
    <div style="background: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #95a5a6; border-top: 1px solid #ecf0f1;">
      ${companyName} · Automated agreement delivery
    </div>
  </div>
</body>
</html>`;

    // Convert base64 to Uint8Array for attachment
    const pdfBytes = Uint8Array.from(atob(signedPdfBase64), c => c.charCodeAt(0));
    const filename = invoiceNumber
      ? `agreement-${invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`
      : `rental-agreement-signed.pdf`;

    const { data, error } = await resend.emails.send({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [customerEmail],
      subject,
      html: htmlBody,
      attachments: [
        {
          filename,
          content: Array.from(pdfBytes),
        }
      ],
    });

    if (error) {
      console.error('[sendSignedAgreement] Resend error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log('[sendSignedAgreement] Sent to', customerEmail, 'id:', data?.id);
    return Response.json({ success: true, emailId: data?.id });
  } catch (err) {
    console.error('[sendSignedAgreement] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});