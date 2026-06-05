import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { poId } = await req.json();
    const po = await base44.asServiceRole.entities.PurchaseOrder.get(poId);
    if (!po) return Response.json({ error: 'PO not found' }, { status: 404 });

    // Look up branch settings for purchasing email
    const branchSettingsList = await base44.asServiceRole.entities.BranchSettings.filter({ branch: po.branch });
    const branchSettings = branchSettingsList[0];
    const purchasingEmail = branchSettings?.purchasingEmail;

    if (!purchasingEmail) {
      return Response.json({ error: 'No purchasing email configured for this branch' }, { status: 400 });
    }

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
        <h2 style="color:#1e293b;">Purchase Request Needs Your Approval</h2>
        <p style="color:#475569;">A new purchase request has been submitted and is awaiting your review.</p>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin:16px 0;">
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;width:140px;">PO #</td><td style="padding:8px 12px;">${po.poNumber || po.id}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Branch</td><td style="padding:8px 12px;">${po.branch}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Vendor</td><td style="padding:8px 12px;">${po.vendorName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Requested By</td><td style="padding:8px 12px;">${user.email}</td></tr>
          ${po.totalAmount ? `<tr><td style="padding:8px 12px;font-weight:600;color:#64748b;">Total</td><td style="padding:8px 12px;font-weight:700;color:#1e293b;">$${Number(po.totalAmount).toFixed(2)}</td></tr>` : ''}
          ${po.isUrgent ? `<tr><td colspan="2" style="padding:8px 12px;color:red;font-weight:bold;">⚠️ URGENT / RUSH ORDER</td></tr>` : ''}
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
        </table>
        ${po.notes ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${po.notes}</p>` : ''}
        <p style="margin-top:24px;color:#64748b;font-size:13px;">Please log in to the system to approve and send this order to the vendor.</p>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'orders@lupineair.com',
        to: [purchasingEmail],
        subject: `[Action Required] Purchase Request ${po.poNumber || po.id} — ${po.vendorName} — ${po.branch}`,
        html: emailBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});