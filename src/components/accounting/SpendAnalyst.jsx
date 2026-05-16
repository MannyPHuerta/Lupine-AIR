import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, Loader2, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

const SEVERITY_CONFIG = {
  high: { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
  medium: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <TrendingUp className="w-4 h-4 text-amber-600" /> },
  low: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: <TrendingDown className="w-4 h-4 text-blue-600" /> },
  positive: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
};

function FindingCard({ finding }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;

  return (
    <div className={`border rounded-lg overflow-hidden ${cfg.border}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${cfg.bg} hover:opacity-90 transition`}
      >
        <div className="flex-shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${cfg.color}`}>{finding.title}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{finding.summary}</div>
        </div>
        <div className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${cfg.border} ${cfg.color} flex-shrink-0`}>
          {finding.severity}
        </div>
        {finding.detail && (
          expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {expanded && finding.detail && (
        <div className="px-4 py-3 bg-white border-t text-sm text-gray-700 whitespace-pre-line">
          {finding.detail}
        </div>
      )}
    </div>
  );
}

export default function SpendAnalyst({ expenses, rentals, timesheets, dateFrom, dateTo, branch }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);

    // Build a concise summary to send to the LLM (avoid sending raw arrays of thousands of records)
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalRevenue = rentals.reduce((s, r) => s + (r.baseAmount || 0) + (r.deliveryFee || 0) + (r.returnFee || 0), 0);

    // Category breakdown
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount || 0);
    });

    // Vendor breakdown
    const byVendor = {};
    expenses.forEach(e => {
      if (e.vendor) byVendor[e.vendor] = (byVendor[e.vendor] || 0) + (e.amount || 0);
    });
    const topVendors = Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 20);

    // Monthly breakdown
    const byMonth = {};
    expenses.forEach(e => {
      if (!e.date) return;
      const mo = e.date.slice(0, 7);
      byMonth[mo] = (byMonth[mo] || 0) + (e.amount || 0);
    });
    const monthlyExpenses = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]));

    // Potential duplicates (same vendor + amount within 7 days)
    const sorted = [...expenses].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const potentialDups = [];
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].date && sorted[i].date) {
          const diff = Math.abs(new Date(sorted[j].date) - new Date(sorted[i].date)) / (1000 * 60 * 60 * 24);
          if (diff > 14) break;
          if (sorted[i].vendor && sorted[i].vendor === sorted[j].vendor && sorted[i].amount === sorted[j].amount) {
            potentialDups.push({ vendor: sorted[i].vendor, amount: sorted[i].amount, date1: sorted[i].date, date2: sorted[j].date });
          }
        }
      }
    }

    // Branch expense breakdown
    const byBranch = {};
    expenses.forEach(e => {
      byBranch[e.branch] = (byBranch[e.branch] || 0) + (e.amount || 0);
    });

    const prompt = `You are a financial analyst for an equipment rental company. Analyze the following spending data and identify issues, anomalies, and opportunities.

Period: ${dateFrom} to ${dateTo}
Branch filter: ${branch}

EXPENSE SUMMARY:
- Total expenses: $${totalExpenses.toFixed(2)}
- Total revenue: $${totalRevenue.toFixed(2)}
- Expense-to-revenue ratio: ${totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : 'N/A'}%
- Number of expense records: ${expenses.length}

SPENDING BY CATEGORY:
${Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k}: $${v.toFixed(2)}`).join('\n')}

TOP VENDORS (by spend):
${topVendors.map(([v, a]) => `  ${v}: $${a.toFixed(2)}`).join('\n')}

MONTHLY EXPENSE TREND:
${monthlyExpenses.map(([mo, v]) => `  ${mo}: $${v.toFixed(2)}`).join('\n')}

EXPENSE BY BRANCH:
${Object.entries(byBranch).map(([b, v]) => `  ${b}: $${v.toFixed(2)}`).join('\n')}

POTENTIAL DUPLICATE PAYMENTS DETECTED (same vendor + amount within 14 days):
${potentialDups.length === 0 ? '  None detected' : potentialDups.slice(0, 10).map(d => `  ${d.vendor} - $${d.amount} on ${d.date1} and ${d.date2}`).join('\n')}

Analyze this data and return a JSON array of findings. Each finding must have:
- title: short headline (max 8 words)
- summary: one sentence explanation  
- detail: 2-4 sentences with specific numbers and recommendations
- severity: one of "high" (urgent issue/waste), "medium" (worth investigating), "low" (minor suggestion), "positive" (something going well)

Focus on: duplicate payments, vendor concentration risk, category spikes, branch anomalies, expense-to-revenue ratio issues, unusual patterns, and cost-saving opportunities.
Generate 5-10 findings. Be specific with dollar amounts.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                summary: { type: 'string' },
                detail: { type: 'string' },
                severity: { type: 'string' },
              }
            }
          },
          overall_health: { type: 'string' },
          health_score: { type: 'number' },
        }
      }
    });

    setAnalysis(result);
    setLoading(false);
  };

  const scoreColor = (score) => {
    if (score >= 80) return 'text-emerald-700';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const highCount = analysis?.findings?.filter(f => f.severity === 'high').length || 0;
  const medCount = analysis?.findings?.filter(f => f.severity === 'medium').length || 0;

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="w-7 h-7 text-indigo-300" />
          <div>
            <div className="text-lg font-bold">AI Spend Analyst</div>
            <div className="text-indigo-300 text-xs">Powered by advanced AI — detects anomalies, waste & opportunities</div>
          </div>
        </div>
        <div className="text-sm text-indigo-200 mt-3 mb-4">
          Analyzes <strong className="text-white">{expenses.length} expenses</strong> across{' '}
          <strong className="text-white">{new Set(expenses.map(e => e.vendor).filter(Boolean)).size} vendors</strong> for the selected period.
          {' '}Flags duplicates, category spikes, branch anomalies, and cost-saving opportunities.
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading || expenses.length === 0}
          className="flex items-center gap-2 bg-white text-indigo-900 font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing spending…</>
            : analysis
              ? <><RefreshCw className="w-4 h-4" /> Re-run Analysis</>
              : <><Brain className="w-4 h-4" /> Run AI Analysis</>
          }
        </button>
        {expenses.length === 0 && (
          <div className="mt-2 text-xs text-indigo-300">No expenses in the selected date range / branch.</div>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-indigo-700">
          <Loader2 className="w-10 h-10 animate-spin" />
          <div className="text-sm font-medium">Crunching the numbers…</div>
          <div className="text-xs text-gray-400">This takes about 10–20 seconds</div>
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Health Score */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Spend Health Score</div>
              <div className={`text-3xl font-bold ${scoreColor(analysis.health_score)}`}>{analysis.health_score ?? '—'}<span className="text-lg">/100</span></div>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">High Priority Issues</div>
              <div className={`text-3xl font-bold ${highCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{highCount}</div>
            </div>
            <div className="bg-white border rounded-lg p-4 shadow-sm text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Items to Review</div>
              <div className={`text-3xl font-bold ${medCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{medCount}</div>
            </div>
          </div>

          {/* Overall summary */}
          {analysis.overall_health && (
            <div className="bg-slate-50 border rounded-lg px-4 py-3 text-sm text-slate-700 italic">
              💡 {analysis.overall_health}
            </div>
          )}

          {/* Findings */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {analysis.findings?.length || 0} Findings
            </div>
            <div className="space-y-2">
              {(analysis.findings || [])
                .sort((a, b) => {
                  const order = { high: 0, medium: 1, low: 2, positive: 3 };
                  return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
                })
                .map((f, i) => <FindingCard key={i} finding={f} />)
              }
            </div>
          </div>

          <div className="text-xs text-gray-400 text-center">
            Analysis based on data from {dateFrom} to {dateTo} · {branch} · Click any finding to expand details
          </div>
        </>
      )}
    </div>
  );
}