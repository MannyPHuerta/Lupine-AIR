import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MANAGEMENT_EMAILS = [
  "manny@rentalworld.com",
  "bwolf@rentalworld.com",
  "awolf@rentalworld.com",
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allReports = await base44.asServiceRole.entities.Report.list('-created_date', 500);
    const reports = allReports.filter(r => !r.isDeleted);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // This week's new reports
    const newThisWeek = reports.filter(r => r.created_date && new Date(r.created_date) >= sevenDaysAgo);

    // Pending (unsent) reports
    const pending = reports.filter(r => !r.isSent);

    // For Sale — not yet posted
    const forSaleUnposted = reports.filter(r => r.action === 'Sell' && !r.isPosted && !r.isDeleted);

    // For Sale — posted (active listings)
    const forSalePosted = reports.filter(r => r.action === 'Sell' && r.isPosted);

    // Aging — Sell reports older than 30 days, not posted
    const aging = forSaleUnposted.filter(r => r.created_date && new Date(r.created_date) < thirtyDaysAgo);

    // By branch breakdown (all active)
    const byBranch = reports.reduce((acc, r) => {
      if (r.branch) acc[r.branch] = (acc[r.branch] || 0) + 1;
      return acc;
    }, {});
    const branchLines = Object.entries(byBranch)
      .sort((a, b) => b[1] - a[1])
      .map(([branch, count]) => `  ${branch}: ${count}`)
      .join('\n');

    // Aging items detail
    const agingLines = aging.slice(0, 10).map(r => {
      const daysOld = Math.floor((now - new Date(r.created_date)) / (1000 * 60 * 60 * 24));
      return `  • ${r.itemName}${r.assetNumber ? ` (#${r.assetNumber})` : ''} — ${r.branch} — ${daysOld} days old${r.askingPrice ? ` — $${Number(r.askingPrice).toLocaleString()}` : ''}`;
    }).join('\n');

    const weekStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Chicago' });

    const body = `
Asset Wolf — Weekly Digest
Week of ${weekStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SUMMARY
  Total Active Reports:   ${reports.length}
  New This Week:          ${newThisWeek.length}
  Pending (Unsent):       ${pending.length}
  For Sale (Not Listed):  ${forSaleUnposted.length}
  For Sale (Listed):      ${forSalePosted.length}
  Aging (30+ days, unsold): ${aging.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 REPORTS BY BRANCH
${branchLines || '  (none)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ AGING INVENTORY (30+ days, not yet posted)
${agingLines || '  None — great job!'}
${aging.length > 10 ? `  ...and ${aging.length - 10} more. Check Report History for full list.` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
View full details in Asset Wolf Report History.

— Asset Wolf · Rental World
    `.trim();

    // Only send to registered app users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const registeredEmails = allUsers.map(u => u.email.toLowerCase());
    const recipients = MANAGEMENT_EMAILS.filter(e => registeredEmails.includes(e.toLowerCase()));

    for (const email of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'Asset Wolf',
        subject: `📋 Asset Wolf Weekly Digest — ${weekStr}`,
        body,
      });
    }

    return Response.json({ sent: true, recipients: recipients.length, totalReports: reports.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});