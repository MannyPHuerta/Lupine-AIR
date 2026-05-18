import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Benford's Law helpers ──────────────────────────────────────────────────
const BENFORD = { 1:30.1, 2:17.6, 3:12.5, 4:9.7, 5:7.9, 6:6.7, 7:5.8, 8:5.1, 9:4.6 };

function firstDigit(n) {
  const s = Math.abs(n).toFixed(2).replace('.', '');
  for (const ch of s) if (ch !== '0') return parseInt(ch);
  return null;
}

function benfordDeviation(amounts) {
  const counts = {};
  amounts.forEach(n => {
    const d = firstDigit(n);
    if (d) counts[d] = (counts[d] || 0) + 1;
  });
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (total < 10) return { score: 0, counts, total };
  let chi2 = 0;
  for (let d = 1; d <= 9; d++) {
    const obs = ((counts[d] || 0) / total) * 100;
    chi2 += Math.pow(obs - BENFORD[d], 2) / BENFORD[d];
  }
  return { score: chi2, counts, total };
}

function riskLabel(score) {
  if (score > 20) return 'CRITICAL';
  if (score > 12) return 'HIGH';
  if (score > 6)  return 'MEDIUM';
  return 'LOW';
}

// ── Main digest logic ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all rentals from the past 7 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const allRentals = await base44.asServiceRole.entities.Rental.list('-created_date', 2000);
    const weekRentals = allRentals.filter(r => r.created_date >= cutoffStr || r.startDate >= cutoffStr);

    if (weekRentals.length === 0) {
      console.log('No rentals this week, skipping digest.');
      return Response.json({ skipped: true, reason: 'no rentals this week' });
    }

    const cancelledOrDiscounted = weekRentals.filter(r =>
      r.status === 'cancelled' ||
      (r.amountPaid != null && r.amountPaid < (r.baseAmount || 0) * 0.9)
    );

    // Benford on all weekly amounts
    const allAmounts = weekRentals.map(r => r.baseAmount || 0).filter(a => a >= 1);
    const benford = benfordDeviation(allAmounts);

    // Benford on discounted/cancelled
    const discAmounts = cancelledOrDiscounted.map(r => r.baseAmount || 0).filter(a => a >= 1);
    const benfordDisc = benfordDeviation(discAmounts);

    // Threshold clustering
    const thresholds = [99, 199, 299, 499, 999, 1999, 4999];
    const thresholdHits = thresholds
      .map(t => ({ t, count: weekRentals.filter(r => (r.baseAmount||0) >= t-2 && (r.baseAmount||0) <= t).length }))
      .filter(x => x.count > 0);

    // Round number clustering
    const roundHits = {};
    weekRentals.forEach(r => {
      const amt = r.baseAmount || 0;
      if (amt > 0 && amt % 50 === 0) roundHits[amt] = (roundHits[amt] || 0) + 1;
    });
    const topRound = Object.entries(roundHits).sort(([,a],[,b]) => b-a).slice(0, 5);

    // Employee void/discount rates
    const empMap = {};
    weekRentals.forEach(r => {
      const emp = r.created_by || 'Unknown';
      if (!empMap[emp]) empMap[emp] = { emp, total: 0, cancelled: 0, discounted: 0, cancelledValue: 0 };
      empMap[emp].total++;
      if (r.status === 'cancelled') { empMap[emp].cancelled++; empMap[emp].cancelledValue += r.baseAmount || 0; }
      if (r.amountPaid != null && r.amountPaid < (r.baseAmount||0) * 0.9 && r.status !== 'cancelled') empMap[emp].discounted++;
    });
    const flaggedEmployees = Object.values(empMap)
      .map(e => ({ ...e, cancelRate: e.total > 0 ? (e.cancelled/e.total*100) : 0, discRate: e.total > 0 ? (e.discounted/e.total*100) : 0 }))
      .filter(e => e.total >= 2 && (e.cancelRate > 20 || e.discRate > 20))
      .sort((a, b) => (b.cancelRate + b.discRate) - (a.cancelRate + a.discRate));

    // Determine overall risk
    const overallScore = Math.max(benford.score, benfordDisc.score);
    const overallRisk = riskLabel(overallScore);

    // Build AI narrative
    let aiNarrative = '';
    try {
      const prompt = `You are a forensic accountant writing a concise weekly fraud digest email for a rental equipment company manager.

DATA FOR THE PAST 7 DAYS:
- Total transactions: ${weekRentals.length}
- Cancelled/discounted: ${cancelledOrDiscounted.length} (${weekRentals.length > 0 ? (cancelledOrDiscounted.length/weekRentals.length*100).toFixed(1) : 0}%)
- Benford deviation (all transactions): ${benford.score.toFixed(1)} — ${riskLabel(benford.score)}
- Benford deviation (cancelled/discounted only): ${benfordDisc.score.toFixed(1)} — ${riskLabel(benfordDisc.score)}
- Threshold clustering hits: ${thresholdHits.map(x => `$${x.t}: ${x.count}×`).join(', ') || 'none'}
- Round number clusters: ${topRound.map(([amt, cnt]) => `$${amt}: ${cnt}×`).join(', ') || 'none'}
- Flagged employees: ${flaggedEmployees.map(e => `${e.emp} (${e.cancelRate.toFixed(0)}% cancel, ${e.discRate.toFixed(0)}% discount)`).join('; ') || 'none'}

Write 2-3 short paragraphs: overall status, specific concerns if any, and recommended action this week. Be direct but professional. If risk is LOW with nothing flagged, keep it brief and positive.`;

      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
      aiNarrative = res;
    } catch (err) {
      console.error('AI narrative failed:', err.message);
      aiNarrative = `Automated analysis complete. Overall fraud risk this week: ${overallRisk}. Benford deviation: ${benford.score.toFixed(1)}. Cancelled/discounted: ${cancelledOrDiscounted.length} transactions.`;
    }

    // Fetch admin users to email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = allUsers.filter(u => u.role === 'admin' && u.email);

    if (admins.length === 0) {
      console.log('No admin users found to email.');
      return Response.json({ skipped: true, reason: 'no admin users' });
    }

    // Build email HTML
    const riskColor = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e' };
    const color = riskColor[overallRisk] || '#64748b';
    const weekStr = cutoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const empRows = flaggedEmployees.map(e => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0;">${e.emp}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:center;color:#94a3b8;">${e.total}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:center;color:${e.cancelRate>20?'#f87171':'#94a3b8'};">${e.cancelRate.toFixed(1)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:center;color:${e.discRate>20?'#fb923c':'#94a3b8'};">${e.discRate.toFixed(1)}%</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:center;color:#94a3b8;">$${e.cancelledValue.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
      </tr>`).join('');

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #334155;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <span style="font-size:22px;">🕵️</span>
        <div>
          <div style="color:#f1f5f9;font-size:18px;font-weight:700;">Weekly Fraud Intelligence Digest</div>
          <div style="color:#64748b;font-size:13px;">Week of ${weekStr} · Generated ${todayStr}</div>
        </div>
      </div>
      <div style="margin-top:16px;display:inline-block;background:${color}22;border:1px solid ${color}66;border-radius:20px;padding:4px 14px;">
        <span style="color:${color};font-weight:700;font-size:13px;">Overall Risk: ${overallRisk}</span>
      </div>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
      <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center;">
        <div style="color:#22d3ee;font-size:22px;font-weight:800;">${weekRentals.length}</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px;">Transactions</div>
      </div>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center;">
        <div style="color:#fb923c;font-size:22px;font-weight:800;">${cancelledOrDiscounted.length}</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px;">Cancelled / Discounted</div>
      </div>
      <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;text-align:center;">
        <div style="color:${color};font-size:22px;font-weight:800;">${benford.score.toFixed(1)}</div>
        <div style="color:#64748b;font-size:11px;margin-top:4px;">Benford χ² Score</div>
      </div>
    </div>

    <!-- AI Narrative -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;">
      <div style="color:#a78bfa;font-size:12px;font-weight:700;margin-bottom:10px;">🤖 AI ANALYSIS</div>
      <div style="color:#cbd5e1;font-size:14px;line-height:1.7;">${aiNarrative.replace(/\n/g, '<br/>')}</div>
    </div>

    ${flaggedEmployees.length > 0 ? `
    <!-- Flagged Employees -->
    <div style="background:#1e293b;border:1px solid #f97316;border-radius:10px;padding:20px;margin-bottom:16px;">
      <div style="color:#fb923c;font-size:12px;font-weight:700;margin-bottom:12px;">⚠️ EMPLOYEES TO MONITOR THIS WEEK</div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#0f172a;">
            <th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;font-weight:600;">Employee</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-size:11px;font-weight:600;">Tx</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-size:11px;font-weight:600;">Cancel%</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-size:11px;font-weight:600;">Disc%</th>
            <th style="padding:8px 12px;text-align:center;color:#64748b;font-size:11px;font-weight:600;">Cancelled $</th>
          </tr>
        </thead>
        <tbody>${empRows}</tbody>
      </table>
    </div>` : ''}

    ${thresholdHits.length > 0 ? `
    <!-- Threshold Flags -->
    <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin-bottom:16px;">
      <div style="color:#facc15;font-size:12px;font-weight:700;margin-bottom:10px;">🎯 THRESHOLD CLUSTERING DETECTED</div>
      <div style="color:#94a3b8;font-size:12px;margin-bottom:8px;">Transactions priced just below round numbers — a skimming indicator.</div>
      ${thresholdHits.map(x => `<div style="color:#e2e8f0;font-size:13px;padding:4px 0;">$${x.t} range: <strong style="color:#facc15;">${x.count} transaction${x.count>1?'s':''}</strong></div>`).join('')}
    </div>` : ''}

    <!-- Footer -->
    <div style="text-align:center;color:#334155;font-size:11px;margin-top:20px;">
      AIReports Fraud Intelligence · Auto-generated every Monday 8am CT<br/>
      Log in to AIReports → Fraud Intel tab for full interactive analysis
    </div>
  </div>
</body>
</html>`;

    // Send to all admins
    const resendKey = Deno.env.get('RESEND_API_KEY');
    let sent = 0;
    for (const admin of admins) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'AIReports <reports@lupine.rental>',
            to: admin.email,
            subject: `🕵️ Weekly Fraud Digest — Risk: ${overallRisk} (${weekRentals.length} tx, ${cancelledOrDiscounted.length} flagged)`,
            html: emailHtml,
          }),
        });
        if (resp.ok) sent++;
        else console.error('Resend error for', admin.email, await resp.text());
      } catch (err) {
        console.error('Failed to send to', admin.email, err.message);
      }
    }

    console.log(`Fraud digest sent to ${sent}/${admins.length} admins. Risk: ${overallRisk}, txCount: ${weekRentals.length}`);
    return Response.json({ success: true, risk: overallRisk, txCount: weekRentals.length, flaggedEmployees: flaggedEmployees.length, sentTo: sent });

  } catch (error) {
    console.error('fraudDigest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});