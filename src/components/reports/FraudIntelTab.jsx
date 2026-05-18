import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, ShieldAlert, Loader2, Zap, TrendingDown, UserX, Hash } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

// Benford's Law expected first-digit probabilities
const BENFORD = {
  1: 30.1, 2: 17.6, 3: 12.5, 4: 9.7,
  5: 7.9,  6: 6.7,  7: 5.8,  8: 5.1, 9: 4.6,
};

function firstDigit(n) {
  const s = Math.abs(n).toFixed(2).replace('.', '');
  for (const ch of s) {
    if (ch !== '0') return parseInt(ch);
  }
  return null;
}

// Chi-square goodness-of-fit deviation score (higher = more suspicious)
function benfordDeviation(observed) {
  let chi2 = 0;
  const total = Object.values(observed).reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  for (let d = 1; d <= 9; d++) {
    const obs = (observed[d] || 0) / total * 100;
    const exp = BENFORD[d];
    chi2 += Math.pow(obs - exp, 2) / exp;
  }
  return chi2;
}

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-white/60 mb-1">Digit {label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}%</div>
      ))}
    </div>
  );
};

function RiskBadge({ level }) {
  const cfg = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/40',
    high:     'bg-orange-500/20 text-orange-400 border-orange-500/40',
    medium:   'bg-amber-500/20 text-amber-400 border-amber-500/40',
    low:      'bg-green-500/20 text-green-400 border-green-500/40',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg[level] || cfg.low}`}>
      {level.toUpperCase()}
    </span>
  );
}

function BenfordChart({ data, title, deviationScore }) {
  const riskLevel = deviationScore > 20 ? 'critical' : deviationScore > 12 ? 'high' : deviationScore > 6 ? 'medium' : 'low';
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-white font-semibold text-sm">{title}</div>
        <RiskBadge level={riskLevel} />
      </div>
      <div className="text-white/40 text-xs mb-4">χ² deviation: {deviationScore.toFixed(1)} — higher = more suspicious</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="digit" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} domain={[0, 35]} />
          <Tooltip content={<DarkTooltip />} />
          <Bar dataKey="expected" name="Expected (Benford)" fill="rgba(34,211,238,0.25)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="actual" name="Actual %" radius={[2, 2, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={Math.abs(d.actual - d.expected) > 5 ? '#f87171' : '#a78bfa'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function FraudIntelTab({ rentals }) {
  const [aiResult, setAiResult] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // ── Benford analysis on rental amounts ──────────────────────────────────────
  const benfordData = useMemo(() => {
    const counts = {};
    rentals.forEach(r => {
      const amt = r.baseAmount || 0;
      if (amt < 1) return;
      const d = firstDigit(amt);
      if (d) counts[d] = (counts[d] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    return Array.from({ length: 9 }, (_, i) => {
      const digit = i + 1;
      return {
        digit,
        expected: BENFORD[digit],
        actual: total > 0 ? ((counts[digit] || 0) / total * 100) : 0,
        count: counts[digit] || 0,
      };
    });
  }, [rentals]);

  const benfordScore = useMemo(() => {
    const obs = {};
    benfordData.forEach(d => { obs[d.digit] = d.count; });
    return benfordDeviation(obs);
  }, [benfordData]);

  // ── Discount/void Benford on discounted amounts ──────────────────────────────
  const discountedRentals = useMemo(() =>
    rentals.filter(r => r.status === 'cancelled' || (r.amountPaid != null && r.amountPaid < (r.baseAmount || 0) * 0.9)),
    [rentals]
  );

  const discountBenfordData = useMemo(() => {
    const counts = {};
    discountedRentals.forEach(r => {
      const amt = r.baseAmount || 0;
      if (amt < 1) return;
      const d = firstDigit(amt);
      if (d) counts[d] = (counts[d] || 0) + 1;
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    return Array.from({ length: 9 }, (_, i) => {
      const digit = i + 1;
      return {
        digit,
        expected: BENFORD[digit],
        actual: total > 0 ? ((counts[digit] || 0) / total * 100) : 0,
        count: counts[digit] || 0,
      };
    });
  }, [discountedRentals]);

  const discountBenfordScore = useMemo(() => {
    const obs = {};
    discountBenfordData.forEach(d => { obs[d.digit] = d.count; });
    return benfordDeviation(obs);
  }, [discountBenfordData]);

  // ── Round number clustering ──────────────────────────────────────────────────
  const roundNumberFlags = useMemo(() => {
    const roundCounts = {};
    rentals.forEach(r => {
      const amt = r.baseAmount || 0;
      if (amt % 50 === 0 && amt > 0) {
        const key = `$${amt}`;
        roundCounts[key] = (roundCounts[key] || 0) + 1;
      }
    });
    return Object.entries(roundCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([amount, count]) => ({ amount, count }));
  }, [rentals]);

  // ── Threshold clustering (just below round numbers) ──────────────────────────
  const thresholdFlags = useMemo(() => {
    const thresholds = [99, 199, 299, 499, 999, 1999, 4999];
    return thresholds.map(t => ({
      threshold: `$${t}`,
      count: rentals.filter(r => {
        const amt = r.baseAmount || 0;
        return amt >= t - 2 && amt <= t;
      }).length,
    })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);
  }, [rentals]);

  // ── Cancelled/discounted transactions by employee ────────────────────────────
  const employeeFlags = useMemo(() => {
    const empMap = {};
    rentals.forEach(r => {
      const emp = r.created_by || 'Unknown';
      if (!empMap[emp]) empMap[emp] = { emp, total: 0, cancelled: 0, discounted: 0, cancelledValue: 0 };
      empMap[emp].total++;
      if (r.status === 'cancelled') {
        empMap[emp].cancelled++;
        empMap[emp].cancelledValue += r.baseAmount || 0;
      }
      if (r.amountPaid != null && r.amountPaid < (r.baseAmount || 0) * 0.9 && r.status !== 'cancelled') {
        empMap[emp].discounted++;
      }
    });
    return Object.values(empMap)
      .map(e => ({
        ...e,
        cancelRate: e.total > 0 ? (e.cancelled / e.total * 100) : 0,
        discountRate: e.total > 0 ? (e.discounted / e.total * 100) : 0,
      }))
      .filter(e => e.total >= 3)
      .sort((a, b) => (b.cancelRate + b.discountRate) - (a.cancelRate + a.discountRate));
  }, [rentals]);

  // ── Repeated exact amounts by same employee ──────────────────────────────────
  const repeatAmountFlags = useMemo(() => {
    const map = {};
    rentals.forEach(r => {
      const emp = r.created_by || 'Unknown';
      const amt = r.baseAmount || 0;
      if (amt < 1) return;
      const key = `${emp}::${amt}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .filter(([, cnt]) => cnt >= 4)
      .map(([key, cnt]) => {
        const [emp, amt] = key.split('::');
        return { emp, amt: parseFloat(amt), count: cnt };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rentals]);

  // ── AI Summary ───────────────────────────────────────────────────────────────
  const handleRunAI = async () => {
    setLoadingAI(true);
    setAiResult(null);
    try {
      const topEmp = employeeFlags.slice(0, 5).map(e =>
        `${e.emp}: ${e.total} tx, ${e.cancelled} cancelled (${e.cancelRate.toFixed(0)}%), ${e.discounted} discounted (${e.discountRate.toFixed(0)}%)`
      );
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a forensic accountant analyzing a rental company's transaction data for internal fraud indicators.

BENFORD'S LAW ANALYSIS:
- Overall transaction amounts chi-squared deviation: ${benfordScore.toFixed(1)} (>12 = suspicious, >20 = highly suspicious)
- Discounted/cancelled transactions deviation: ${discountBenfordScore.toFixed(1)}

ROUND NUMBER CLUSTERING (exact multiples of $50):
${roundNumberFlags.map(r => `  ${r.amount}: ${r.count} occurrences`).join('\n') || 'None'}

THRESHOLD CLUSTERING (just below round numbers):
${thresholdFlags.map(t => `  ${t.threshold}: ${t.count} transactions`).join('\n') || 'None'}

EMPLOYEE VOID/DISCOUNT RATES:
${topEmp.join('\n') || 'No data'}

REPEAT EXACT AMOUNTS (same employee, same amount ≥4×):
${repeatAmountFlags.map(r => `  ${r.emp}: $${r.amt} × ${r.count}`).join('\n') || 'None'}

Total transactions analyzed: ${rentals.length}
Cancelled/discounted: ${discountedRentals.length} (${rentals.length > 0 ? (discountedRentals.length / rentals.length * 100).toFixed(1) : 0}%)

Provide a fraud risk assessment with specific findings and recommended actions. Be direct and specific about which patterns are most concerning.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overallRisk: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            riskSummary: { type: 'string' },
            topFindings: { type: 'array', items: { type: 'string' } },
            recommendedActions: { type: 'array', items: { type: 'string' } },
            employeesToWatch: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setAiResult(result);
    } catch (err) {
      setAiResult({ error: err.message });
    } finally {
      setLoadingAI(false);
    }
  };

  const overallRiskLevel = benfordScore > 20 || discountBenfordScore > 20 ? 'critical'
    : benfordScore > 12 || discountBenfordScore > 12 ? 'high'
    : benfordScore > 6 || discountBenfordScore > 6 ? 'medium' : 'low';

  return (
    <div className="space-y-6">

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
          <div className="text-white/50 text-xs mb-1">Transactions Analyzed</div>
          <div className="text-2xl font-black text-cyan-400">{rentals.length.toLocaleString()}</div>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
          <div className="text-white/50 text-xs mb-1">Cancelled / Discounted</div>
          <div className="text-2xl font-black text-amber-400">{discountedRentals.length}</div>
          <div className="text-white/40 text-xs mt-1">
            {rentals.length > 0 ? (discountedRentals.length / rentals.length * 100).toFixed(1) : 0}% of total
          </div>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
          <div className="text-white/50 text-xs mb-1">Benford Deviation (All)</div>
          <div className={`text-2xl font-black ${benfordScore > 12 ? 'text-red-400' : benfordScore > 6 ? 'text-amber-400' : 'text-green-400'}`}>
            {benfordScore.toFixed(1)}
          </div>
          <div className="text-white/40 text-xs mt-1">χ² score</div>
        </div>
        <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
          <div className="text-white/50 text-xs mb-1">Overall Fraud Risk</div>
          <div className="mt-1"><RiskBadge level={overallRiskLevel} /></div>
        </div>
      </div>

      {/* Benford Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <BenfordChart
          data={benfordData}
          title="Benford's Law — All Transactions"
          deviationScore={benfordScore}
        />
        <BenfordChart
          data={discountBenfordData}
          title="Benford's Law — Cancelled / Discounted Only"
          deviationScore={discountBenfordScore}
        />
      </div>

      {/* Round Number & Threshold Clustering */}
      <div className="grid lg:grid-cols-2 gap-6">
        {roundNumberFlags.length > 0 && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-amber-400" />
              <div className="text-white font-semibold text-sm">Round Number Clustering</div>
              <span className="text-white/40 text-xs ml-auto">exact multiples of $50</span>
            </div>
            <div className="space-y-2">
              {roundNumberFlags.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-white text-sm font-mono">{r.amount}</span>
                  <div className="flex items-center gap-2">
                    <div className="bg-amber-500/20 rounded-full h-1.5 w-24 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, r.count / roundNumberFlags[0].count * 100)}%` }} />
                    </div>
                    <span className="text-amber-400 font-bold text-xs w-8 text-right">{r.count}×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {thresholdFlags.length > 0 && (
          <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <div className="text-white font-semibold text-sm">Threshold Clustering</div>
              <span className="text-white/40 text-xs ml-auto">just below round numbers</span>
            </div>
            <p className="text-white/40 text-xs mb-3">Transactions priced at $X97–$X99 to stay just under approval thresholds — a classic skimming pattern.</p>
            <div className="space-y-2">
              {thresholdFlags.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-white text-sm font-mono">{t.threshold}</span>
                  <span className={`font-bold text-sm ${t.count >= 5 ? 'text-red-400' : 'text-amber-400'}`}>{t.count} transactions</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Employee Void/Discount Rates */}
      {employeeFlags.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserX className="w-4 h-4 text-red-400" />
            <div className="text-white font-semibold text-sm">Void & Discount Rates by Employee</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40 border-b border-white/10">
                  <th className="text-left pb-2 font-medium">Employee</th>
                  <th className="text-right pb-2 font-medium">Total Tx</th>
                  <th className="text-right pb-2 font-medium">Cancelled</th>
                  <th className="text-right pb-2 font-medium">Cancel Rate</th>
                  <th className="text-right pb-2 font-medium">Discounted</th>
                  <th className="text-right pb-2 font-medium">Disc. Rate</th>
                  <th className="text-right pb-2 font-medium">Cancelled $</th>
                  <th className="text-right pb-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {employeeFlags.map((e, i) => {
                  const risk = (e.cancelRate + e.discountRate) > 40 ? 'critical'
                    : (e.cancelRate + e.discountRate) > 25 ? 'high'
                    : (e.cancelRate + e.discountRate) > 15 ? 'medium' : 'low';
                  return (
                    <tr key={i} className={`border-b border-white/5 last:border-0 ${risk === 'critical' ? 'bg-red-500/5' : risk === 'high' ? 'bg-orange-500/5' : ''}`}>
                      <td className="py-2 text-white font-medium truncate max-w-[140px]">{e.emp}</td>
                      <td className="py-2 text-right text-white/60">{e.total}</td>
                      <td className="py-2 text-right text-red-400 font-semibold">{e.cancelled}</td>
                      <td className="py-2 text-right">
                        <span className={`font-bold ${e.cancelRate > 20 ? 'text-red-400' : 'text-white/60'}`}>{e.cancelRate.toFixed(1)}%</span>
                      </td>
                      <td className="py-2 text-right text-amber-400 font-semibold">{e.discounted}</td>
                      <td className="py-2 text-right">
                        <span className={`font-bold ${e.discountRate > 20 ? 'text-amber-400' : 'text-white/60'}`}>{e.discountRate.toFixed(1)}%</span>
                      </td>
                      <td className="py-2 text-right text-white/60">${e.cancelledValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2 text-right"><RiskBadge level={risk} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repeat Exact Amount Flags */}
      {repeatAmountFlags.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <div className="text-white font-semibold text-sm">Repeated Exact Amounts (Same Employee)</div>
          </div>
          <p className="text-white/40 text-xs mb-3">The same employee charging the exact same dollar amount 4+ times is a skimming indicator — suggests a fixed off-books "price".</p>
          <div className="space-y-1.5">
            {repeatAmountFlags.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-xs truncate max-w-[200px]">{r.emp}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white font-mono text-sm">${r.amt}</span>
                  <span className="text-amber-400 font-bold text-xs">{r.count}× repeated</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis CTA */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold mb-1">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              AI Forensic Analysis
            </div>
            <p className="text-white/40 text-xs">Run a full AI-powered fraud risk assessment combining all signals above into actionable findings.</p>
          </div>
          <button
            onClick={handleRunAI}
            disabled={loadingAI}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-lg transition text-sm flex-shrink-0"
          >
            {loadingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {loadingAI ? 'Analyzing…' : 'Run AI Analysis'}
          </button>
        </div>

        {aiResult && !aiResult.error && (
          <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
            <div className="flex items-center gap-3">
              <div className="text-white/50 text-xs">Overall Risk:</div>
              <RiskBadge level={aiResult.overallRisk || 'low'} />
            </div>
            {aiResult.riskSummary && (
              <p className="text-white/70 text-sm">{aiResult.riskSummary}</p>
            )}
            {aiResult.topFindings?.length > 0 && (
              <div>
                <div className="text-red-400 font-semibold text-xs mb-2">🚨 Key Findings</div>
                <ul className="space-y-1">
                  {aiResult.topFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                      <span className="text-red-400 font-bold flex-shrink-0">{i + 1}.</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiResult.employeesToWatch?.length > 0 && (
              <div>
                <div className="text-amber-400 font-semibold text-xs mb-2">👤 Employees to Monitor</div>
                <div className="flex flex-wrap gap-2">
                  {aiResult.employeesToWatch.map((e, i) => (
                    <span key={i} className="bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-3 py-0.5 text-xs font-medium">{e}</span>
                  ))}
                </div>
              </div>
            )}
            {aiResult.recommendedActions?.length > 0 && (
              <div>
                <div className="text-cyan-400 font-semibold text-xs mb-2">✅ Recommended Actions</div>
                <ul className="space-y-1">
                  {aiResult.recommendedActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                      <span className="text-cyan-400 font-bold flex-shrink-0">{i + 1}.</span> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {aiResult?.error && (
          <div className="mt-3 text-red-400 text-xs">AI error: {aiResult.error}</div>
        )}
      </div>
    </div>
  );
}