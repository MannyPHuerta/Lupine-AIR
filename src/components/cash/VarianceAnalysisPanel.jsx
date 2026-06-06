import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, TrendingDown, TrendingUp, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VarianceAnalysisPanel({ drawers }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Only drawers that have a non-zero variance
  const variantDrawers = drawers.filter(d => d.variance !== undefined && d.variance !== null && d.variance !== 0);

  const shortDrawers = variantDrawers.filter(d => d.variance < 0);
  const overDrawers = variantDrawers.filter(d => d.variance > 0);
  const totalShort = shortDrawers.reduce((s, d) => s + Math.abs(d.variance), 0);
  const totalOver = overDrawers.reduce((s, d) => s + d.variance, 0);

  const runAnalysis = async () => {
    setLoading(true);
    setExpanded(true);
    try {
      const summary = variantDrawers.map(d => ({
        branch: d.branch,
        date: d.shiftDate,
        shift: d.shiftLabel,
        openedBy: d.openedBy,
        closedBy: d.closedBy,
        startingFloat: d.startingFloat,
        cashCollected: d.cashCollected,
        countedCash: d.countedCash,
        expectedCash: d.expectedCash,
        variance: d.variance,
        pettyCashOut: (d.pettyCashTransactions || []).filter(t => t.type === 'out').reduce((s, t) => s + t.amount, 0),
        closingNotes: d.closingNotes || '',
        reconciledBy: d.reconciledBy || '',
      }));

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a cash management auditor for an equipment rental company. Analyze the following cash drawer variance data and provide:

1. A short executive summary (2-3 sentences) of the overall variance pattern
2. Any suspicious patterns (same employee, same branch, recurring short drawers, round-number variances)
3. Branches or shifts that need attention
4. Recommended actions for management

Variance records:
${JSON.stringify(summary, null, 2)}

Total short: $${totalShort.toFixed(2)} across ${shortDrawers.length} drawers
Total over: $${totalOver.toFixed(2)} across ${overDrawers.length} drawers

Keep the response concise, professional, and actionable. Use bullet points for findings. Flag anything that looks like theft risk.`,
        response_json_schema: {
          type: 'object',
          properties: {
            executiveSummary: { type: 'string' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            findings: { type: 'array', items: { type: 'string' } },
            suspiciousPatterns: { type: 'array', items: { type: 'string' } },
            recommendedActions: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setAnalysis(res);
    } finally {
      setLoading(false);
    }
  };

  const riskColors = {
    low: 'bg-green-50 border-green-200 text-green-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    high: 'bg-red-50 border-red-200 text-red-800',
  };

  if (variantDrawers.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">✓</span>
        <div>
          <div className="font-semibold text-green-800">No variances on record</div>
          <div className="text-xs text-green-600">All drawers balanced — nothing to analyze.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-indigo-600" />
          <div>
            <div className="font-semibold text-gray-900">AI Variance Analysis</div>
            <div className="text-xs text-gray-500">{variantDrawers.length} drawer{variantDrawers.length !== 1 ? 's' : ''} with variances · Short ${totalShort.toFixed(2)} · Over ${totalOver.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!analysis && !loading && (
            <Button size="sm" onClick={e => { e.stopPropagation(); runAnalysis(); }} className="gap-1 bg-indigo-600 hover:bg-indigo-700">
              <Brain className="w-4 h-4" /> Analyze
            </Button>
          )}
          {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Variance quick stats */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
              <div className="font-bold text-red-700">${totalShort.toFixed(2)}</div>
              <div className="text-xs text-red-500">{shortDrawers.length} short drawer{shortDrawers.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <TrendingUp className="w-4 h-4 text-blue-500 mx-auto mb-1" />
              <div className="font-bold text-blue-700">${totalOver.toFixed(2)}</div>
              <div className="text-xs text-blue-500">{overDrawers.length} over drawer{overDrawers.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
              <div className="font-bold text-gray-700">{variantDrawers.length}</div>
              <div className="text-xs text-gray-500">Total variances</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-gray-700">
                {variantDrawers.length > 0
                  ? (variantDrawers.reduce((s, d) => s + Math.abs(d.variance), 0) / variantDrawers.length).toFixed(2)
                  : '0.00'}
              </div>
              <div className="text-xs text-gray-500">Avg abs. variance</div>
            </div>
          </div>

          {/* Variance list */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Variance Detail</div>
            {variantDrawers.map(d => (
              <div key={d.id} className="flex justify-between items-center text-xs bg-gray-50 rounded px-3 py-2">
                <span className="text-gray-700 font-medium">{d.branch} · {d.shiftDate} {d.shiftLabel}</span>
                <span className="text-gray-500">{d.closedBy || d.openedBy}</span>
                <span className={`font-bold ${d.variance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {d.variance > 0 ? '+' : ''}${d.variance.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* AI output */}
          {loading && (
            <div className="flex items-center gap-3 text-indigo-600 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Analyzing variance patterns…</span>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-3">
              {/* Risk badge */}
              <div className={`border rounded-lg px-4 py-3 text-sm font-medium ${riskColors[analysis.riskLevel] || riskColors.medium}`}>
                Risk Level: <span className="uppercase font-bold">{analysis.riskLevel}</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                {analysis.executiveSummary}
              </div>

              {analysis.findings?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Findings</div>
                  <ul className="space-y-1">
                    {analysis.findings.map((f, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-indigo-500 shrink-0">•</span>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.suspiciousPatterns?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-600 uppercase mb-2">⚠ Suspicious Patterns</div>
                  <ul className="space-y-1">
                    {analysis.suspiciousPatterns.map((p, i) => (
                      <li key={i} className="text-sm text-red-700 flex gap-2 bg-red-50 rounded px-3 py-1.5"><span className="shrink-0">•</span>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.recommendedActions?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Recommended Actions</div>
                  <ul className="space-y-1">
                    {analysis.recommendedActions.map((a, i) => (
                      <li key={i} className="text-sm text-gray-700 flex gap-2"><span className="text-green-500 shrink-0">→</span>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button size="sm" variant="outline" onClick={runAnalysis} className="gap-1 text-indigo-600 border-indigo-200">
                <Brain className="w-3.5 h-3.5" /> Re-analyze
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}