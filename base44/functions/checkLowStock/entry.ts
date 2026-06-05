import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all active supply items with a min stock level set
    const allItems = await base44.asServiceRole.entities.SupplyItem.list('name', 500);
    const lowItems = allItems.filter(i =>
      i.isActive !== false &&
      i.minStockLevel > 0 &&
      i.currentStock <= i.minStockLevel
    );

    if (lowItems.length === 0) {
      return Response.json({ success: true, alertsSent: 0, message: 'All items are adequately stocked.' });
    }

    // Fetch branch settings to get purchasing emails
    const branchSettings = await base44.asServiceRole.entities.BranchSettings.list('branch', 50);
    const purchasingEmailMap = {};
    branchSettings.forEach(bs => {
      if (bs.purchasingEmail) purchasingEmailMap[bs.branch] = bs.purchasingEmail;
    });

    // Group low-stock items by branch (items with no branch go to all branches or a fallback)
    const byBranch = {};
    lowItems.forEach(item => {
      const branch = item.branch || '__global__';
      if (!byBranch[branch]) byBranch[branch] = [];
      byBranch[branch].push(item);
    });

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    let alertsSent = 0;

    // For global items (no branch), send to all configured purchasing emails
    const globalItems = byBranch['__global__'] || [];
    const allPurchasingEmails = [...new Set(Object.values(purchasingEmailMap))];

    const buildTable = (items) => items.map(item => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 12px;font-weight:500;color:#1e293b;">${item.name}</td>
        <td style="padding:10px 12px;color:#64748b;">${item.category}</td>
        <td style="padding:10px 12px;color:#64748b;">${item.branch || 'Company-wide'}</td>
        <td style="padding:10px 12px;text-align:center;font-weight:700;color:#dc2626;">${item.currentStock} ${item.unit || ''}</td>
        <td style="padding:10px 12px;text-align:center;color:#64748b;">${item.minStockLevel} ${item.unit || ''}</td>
        <td style="padding:10px 12px;text-align:center;color:#64748b;">${item.reorderQuantity || 1} ${item.unit || ''}</td>
        <td style="padding:10px 12px;color:#64748b;">${item.preferredVendorName || '—'}</td>
      </tr>
    `).join('');

    const buildEmail = (recipientBranch, items) => `
      <div style="font-family:sans-serif;max-width:680px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
        <div style="background:#dc2626;padding:20px 24px;">
          <h2 style="margin:0;color:#fff;font-size:18px;">⚠️ Low Stock Alert — Action Required</h2>
          <p style="margin:4px 0 0;color:#fca5a5;font-size:13px;">${recipientBranch !== '__global__' ? recipientBranch : 'Company-wide'} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style="padding:20px 24px;">
          <p style="color:#475569;margin:0 0 16px;font-size:14px;">
            The following <strong>${items.length} item${items.length > 1 ? 's' : ''}</strong> 
            ${items.length > 1 ? 'have' : 'has'} dropped to or below the defined minimum stock level and require restocking.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:600;">Item</th>
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:600;">Category</th>
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:600;">Branch</th>
                <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:600;">Current Stock</th>
                <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:600;">Min Level</th>
                <th style="padding:10px 12px;text-align:center;color:#64748b;font-weight:600;">Reorder Qty</th>
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-weight:600;">Preferred Vendor</th>
              </tr>
            </thead>
            <tbody>${buildTable(items)}</tbody>
          </table>
          <div style="margin-top:20px;padding:14px 16px;background:#fef9c3;border:1px solid #fde047;border-radius:6px;font-size:13px;color:#713f12;">
            💡 Log in to the <strong>Supply Catalog</strong> to auto-generate draft purchase orders, or use <strong>Quick Reorder</strong> on any item.
          </div>
        </div>
        <div style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
          This is an automated alert from AIRequisition. Reply to purchasing@lupineair.com with any questions.
        </div>
      </div>
    `;

    // Send per-branch alerts
    for (const [branch, items] of Object.entries(byBranch)) {
      if (branch === '__global__') continue;
      const allForBranch = [...items, ...globalItems];
      const email = purchasingEmailMap[branch];
      if (!email) continue;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'alerts@lupineair.com',
          to: [email],
          subject: `⚠️ Low Stock Alert — ${allForBranch.length} item${allForBranch.length > 1 ? 's' : ''} need restocking (${branch})`,
          html: buildEmail(branch, allForBranch),
        }),
      });
      alertsSent++;
    }

    // Send global items to all purchasing emails (if not already covered by a branch)
    if (globalItems.length > 0 && allPurchasingEmails.length > 0) {
      for (const email of allPurchasingEmails) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'alerts@lupineair.com',
            to: [email],
            subject: `⚠️ Low Stock Alert — ${globalItems.length} company-wide item${globalItems.length > 1 ? 's' : ''} need restocking`,
            html: buildEmail('__global__', globalItems),
          }),
        });
        alertsSent++;
      }
    }

    return Response.json({ success: true, alertsSent, lowItemCount: lowItems.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});