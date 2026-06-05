import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { poId } = await req.json();
    const po = await base44.asServiceRole.entities.PurchaseOrder.get(poId);
    if (!po) return Response.json({ error: 'PO not found' }, { status: 404 });

    // Look up accounting email for this branch
    const branchSettingsList = await base44.asServiceRole.entities.BranchSettings.filter({ branch: po.branch });
    const branchSettings = branchSettingsList[0];
    const accountingEmail = branchSettings?.accountingEmail;

    const lineItemsHtml = (po.lineItems || []).map(item => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.itemName}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.qtyRequested} ${item.unit || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.unitPrice ? '$' + Number(item.unitPrice).toFixed(2) : 'TBD'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.lineTotal ? '$' + Number(item.lineTotal).toFixed(2) : 'TBD'}</td>
      </tr>
    `).join('');

    const emailBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e293b;">Purchase Order ${po.poNumber || po.id}</h2>
        <p><strong>From:</strong> ${po.branch}<br>
        <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
        ${po.expectedDeliveryDate ? `<strong>Expected Delivery:</strong> ${po.expectedDeliveryDate}<br>` : ''}
        ${po.isUrgent ? '<span style="color:red;font-weight:bold;">⚠️ URGENT / RUSH ORDER</span><br>' : ''}
        </p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px;text-align:left;">Item</th>
              <th style="padding:8px;text-align:center;">Qty</th>
              <th style="padding:8px;text-align:right;">Unit Price</th>
              <th style="padding:8px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
          ${po.totalAmount ? `<tfoot><tr><td colspan="3" style="padding:8px;text-align:right;font-weight:bold;">Order Total:</td><td style="padding:8px;text-align:right;font-weight:bold;">$${Number(po.totalAmount).toFixed(2)}</td></tr></tfoot>` : ''}
        </table>
        ${po.notes ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${po.notes}</p>` : ''}
        <p style="margin-top:24px;color:#64748b;font-size:13px;">Please confirm receipt of this order and provide an estimated delivery date.<br>Approved by: ${user.email}</p>
      </div>
    `;

    const accountingEmailBody = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <p style="background:#fef9c3;border:1px solid #fde047;padding:10px 14px;border-radius:6px;color:#713f12;font-size:13px;">
          📋 <strong>Accounting Copy</strong> — This PO has been approved by purchasing and sent to the vendor.
        </p>
        <h2 style="color:#1e293b;">Purchase Order ${po.poNumber || po.id}</h2>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin:16px 0;">
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;width:140px;">PO #</td><td style="padding:8px 12px;">${po.poNumber || po.id}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Branch</td><td style="padding:8px 12px;">${po.branch}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Vendor</td><td style="padding:8px 12px;">${po.vendorName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Vendor Email</td><td style="padding:8px 12px;">${po.vendorEmail || '—'}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Approved By</td><td style="padding:8px 12px;">${user.email}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Date Sent</td><td style="padding:8px 12px;">${new Date().toLocaleDateString()}</td></tr>
          ${po.totalAmount ? `<tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Total</td><td style="padding:8px 12px;font-weight:700;color:#1e293b;">$${Number(po.totalAmount).toFixed(2)}</td></tr>` : ''}
        </table>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px;text-align:left;">Item</th>
              <th style="padding:8px;text-align:center;">Qty</th>
              <th style="padding:8px;text-align:right;">Unit Price</th>
              <th style="padding:8px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
          ${po.totalAmount ? `<tfoot><tr><td colspan="3" style="padding:8px;text-align:right;font-weight:bold;">Order Total:</td><td style="padding:8px;text-align:right;font-weight:bold;">$${Number(po.totalAmount).toFixed(2)}</td></tr></tfoot>` : ''}
        </table>
        ${po.notes ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${po.notes}</p>` : ''}
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    // Send to vendor
    const vendorRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'orders@lupineair.com',
        to: [po.vendorEmail],
        subject: `Purchase Order ${po.poNumber || po.id} from ${po.branch}`,
        html: emailBody,
      }),
    });

    if (!vendorRes.ok) {
      const err = await vendorRes.text();
      return Response.json({ error: err }, { status: 500 });
    }

    // Send accounting copy concurrently if email is configured
    if (accountingEmail) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'orders@lupineair.com',
          to: [accountingEmail],
          subject: `[Accounting Copy] PO ${po.poNumber || po.id} — ${po.vendorName} — $${po.totalAmount ? Number(po.totalAmount).toFixed(2) : 'TBD'}`,
          html: accountingEmailBody,
        }),
      });
    }

    // Update PO status
    await base44.asServiceRole.entities.PurchaseOrder.update(poId, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      approvedBy: user.email,
      approvedAt: new Date().toISOString(),
    });

    return Response.json({ success: true, accountingNotified: !!accountingEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});