import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { poId } = await req.json();
    const po = await base44.asServiceRole.entities.PurchaseOrder.get(poId);
    if (!po) return Response.json({ error: 'PO not found' }, { status: 404 });

    const lineItemsHtml = (po.lineItems || []).map(item => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.itemName}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.qtyRequested} ${item.unit || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.unitPrice ? '$' + item.unitPrice.toFixed(2) : 'TBD'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${item.lineTotal ? '$' + item.lineTotal.toFixed(2) : 'TBD'}</td>
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
          ${po.totalAmount ? `<tfoot><tr><td colspan="3" style="padding:8px;text-align:right;font-weight:bold;">Order Total:</td><td style="padding:8px;text-align:right;font-weight:bold;">$${po.totalAmount.toFixed(2)}</td></tr></tfoot>` : ''}
        </table>
        ${po.notes ? `<p style="margin-top:16px;"><strong>Notes:</strong> ${po.notes}</p>` : ''}
        <p style="margin-top:24px;color:#64748b;font-size:13px;">Please confirm receipt of this order and provide an estimated delivery date.<br>Ordered by: ${user.email}</p>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'orders@lupineair.com',
        to: [po.vendorEmail],
        subject: `Purchase Order ${po.poNumber || po.id} from ${po.branch}`,
        html: emailBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    // Update PO status
    await base44.asServiceRole.entities.PurchaseOrder.update(poId, {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});