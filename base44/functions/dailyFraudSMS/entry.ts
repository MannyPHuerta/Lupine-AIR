/**
 * dailyFraudSMS — runs every day at 7:30am CT.
 * Sends a concise 60-second SMS briefing to configured fraud alert phones.
 * Covers yesterday's activity: rentals, flags, discounts, blacklist hits, no-invoice rentals.
 * Every finding names the responsible employee.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@4.20.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const settingsList = await base44.asServiceRole.entities.CompanySettings.list();
    const settings = settingsList[0] || {};
    const alertPhones = settings.fraudAlertPhones || settings.geofenceAlertPhones || [];

    if (alertPhones.length === 0) {
      return Response.json({ skipped: true, reason: 'no fraud alert phones configured' });
    }

    // Yesterday window
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStart = yesterday.toISOString().split('T')[0];

    // Pull all users for name resolution
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userById = {};
    allUsers.forEach(u => { userById[u.id] = u.full_name || u.email || u.id; });

    const allRentals = await base44.asServiceRole.entities.Rental.list('-created_date', 500);
    const yesterdayRentals = allRentals.filter(r => r.created_date && r.created_date.startsWith(yStart));

    const total = yesterdayRentals.length;
    const cancelled = yesterdayRentals.filter(r => r.status === 'cancelled');
    const noInvoice = yesterdayRentals.filter(r =>
      ['out', 'contract'].includes(r.status) && !r.invoiceNumber
    );
    const deepDiscount = yesterdayRentals.filter(r => {
      const base = r.baseAmount || 0;
      const paid = r.amountPaid != null ? Number(r.amountPaid) : null;
      return paid != null && base > 0 && paid < base * 0.70 && r.status !== 'cancelled';
    });

    // Blacklist hits — check customers
    let blacklistHits = [];
    if (yesterdayRentals.length > 0) {
      const customerIds = [...new Set(yesterdayRentals.map(r => r.customerId).filter(Boolean))];
      const customers = await base44.asServiceRole.entities.Customer.list();
      const blacklisted = new Set(customers.filter(c => c.blacklisted).map(c => c.id));
      blacklistHits = yesterdayRentals.filter(r => r.customerId && blacklisted.has(r.customerId));
    }

    // Branch breakdown
    const byBranch = {};
    yesterdayRentals.forEach(r => {
      const b = r.branch || 'Unknown';
      byBranch[b] = (byBranch[b] || 0) + 1;
    });
    const branchLine = Object.entries(byBranch)
      .sort((a,b) => b[1]-a[1])
      .map(([b,c]) => `${b.replace(/^\d+ /, '')}:${c}`)
      .join(' | ');

    // Build flag lines
    const flagLines = [];
    if (noInvoice.length > 0) {
      const empCounts = {};
      noInvoice.forEach(r => {
        const name = userById[r.created_by_id] || r.created_by || '?';
        empCounts[name] = (empCounts[name] || 0) + 1;
      });
      const empList = Object.entries(empCounts).map(([n,c]) => `${n}(${c})`).join(', ');
      flagLines.push(`🚨 ${noInvoice.length} no-invoice active rental${noInvoice.length>1?'s':''}: ${empList}`);
    }
    if (blacklistHits.length > 0) {
      const empList = [...new Set(blacklistHits.map(r => userById[r.created_by_id] || r.created_by || '?'))].join(', ');
      flagLines.push(`🚫 ${blacklistHits.length} blacklisted customer${blacklistHits.length>1?'s':''} rented: ${empList}`);
    }
    if (deepDiscount.length > 0) {
      const empList = [...new Set(deepDiscount.map(r => userById[r.created_by_id] || r.created_by || '?'))].join(', ');
      flagLines.push(`⚠️ ${deepDiscount.length} deep discount${deepDiscount.length>1?'s':''} (>30%): ${empList}`);
    }
    if (cancelled.length > 0) {
      const cancelRate = total > 0 ? Math.round(cancelled.length / total * 100) : 0;
      if (cancelRate > 15) {
        const empCounts = {};
        cancelled.forEach(r => {
          const name = userById[r.created_by_id] || r.created_by || '?';
          empCounts[name] = (empCounts[name] || 0) + 1;
        });
        const empList = Object.entries(empCounts).map(([n,c]) => `${n}(${c})`).join(', ');
        flagLines.push(`📋 ${cancelled.length} cancels (${cancelRate}%): ${empList}`);
      }
    }

    const dateLabel = yesterday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const statusEmoji = flagLines.length === 0 ? '✅' : flagLines.some(f => f.startsWith('🚨') || f.startsWith('🚫')) ? '🚨' : '⚠️';

    let sms = `${statusEmoji} DAILY FRAUD BRIEF — ${dateLabel}\n\n`;
    sms += `${total} rental${total !== 1 ? 's' : ''} | ${branchLine || 'No activity'}\n`;

    if (flagLines.length === 0) {
      sms += `\n✓ All clear — no fraud flags detected.`;
    } else {
      sms += `\n${flagLines.join('\n')}`;
    }
    sms += `\n\nLog in to AIReports → Fraud Intel for details.`;

    const twilioClient = twilio(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN')
    );
    const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER');

    let sent = 0;
    for (const phone of alertPhones) {
      try {
        await twilioClient.messages.create({
          from: TWILIO_PHONE,
          to: phone,
          body: sms.slice(0, 1600),
        });
        sent++;
      } catch(e) { console.error('Daily fraud SMS failed to', phone, e.message); }
    }

    console.log(`dailyFraudSMS: sent to ${sent}/${alertPhones.length} phones. Flags: ${flagLines.length}`);
    return Response.json({ sent, phones: alertPhones.length, flagCount: flagLines.length, date: yStart });

  } catch (error) {
    console.error('dailyFraudSMS error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});