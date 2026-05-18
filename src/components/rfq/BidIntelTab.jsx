import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Target, Award, AlertTriangle, Loader2, RefreshCw, Brain, DollarSign, BarChart3, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, Legend, LineChart, Line
} from 'recharts';

const ORG_TYPE_LABELS = {
  municipal: 'Municipal',
  county: 'County',
  state: 'State',
  federal: 'Federal',
  private: 'Private',
  nonprofit: 'Nonprofit',
  other: 'Other',
};

const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#60a5fa', '#facc15'];

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="text-white/60 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-semibold">{p.name}: {typeof p.value === 'number' && p.value > 100 ? `$${p.value.toLocaleString()}` : p.value}</div>
      ))}
    </div>
  );
};

function StatCard({ label, value, sub, color = 'text-cyan-400', icon: Icon }) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-white/40 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function buildOrgStats(rfqs) {
  const map = {};
  rfqs.forEach(r => {
    const orgType = r.orgType || 'other';
    if (!map[orgType]) map[orgType] = { orgType, label: ORG_TYPE_LABELS[orgType] || orgType, bids: 0, wins: 0, losses: 0, totalBidValue: 0, totalAwardedValue: 0, avgBid: 0, winRate: 0 };
    const val = r.estimatedTotalValue || 0;
    map[orgType].bids++;
    map[orgType].totalBidValue += val;
    if (r.status === 'won') {
      map[orgType].wins++;
      map[orgType].totalAwardedValue += r.awardedValue || val;
    } else if (r.status === 'lost') {
      map[orgType].losses++;
    }
  });
  return Object.values(map).map(d => ({
    ...d,
    avgBid: d.bids > 0 ? Math.round(d.totalBidValue / d.bids) : 0,
    winRate: d.bids > 0 ? Math.round((d.wins / d.bids) * 100) : 0,
  })).sort((a, b) => b.bids - a.bids);
}

function buildPricingBands(rfqs) {
  // Group wins/losses by bid value buckets to identify sweet spots
  const buckets = {};
  rfqs.filter(r => r.estimatedTotalValue && ['won', 'lost'].includes(r.status)).forEach(r => {
    const bucket = Math.floor(r.estimatedTotalValue / 5000) * 5000;
    const key = `$${(bucket / 1000).toFixed(0)}k–${((bucket + 5000) / 1000).toFixed(0)}k`;
    if (!buckets[key]) buckets[key] = { range: key, wins: 0, losses: 0, bucketVal: bucket };
    if (r.status === 'won') buckets[key].wins++;
    else buckets[key].losses++;
  });
  return Object.values(buckets)
    .sort((a, b) => a.bucketVal - b.bucketVal)
    .map(b => ({ ...b, winRate: b.wins + b.losses > 0 ? Math.round((b.wins / (b.wins + b.losses)) * 100) : 0 }));
}

function buildOrgHistory(rfqs) {
  // Per-org win/loss timeline
  const map = {};
  rfqs.filter(r => r.status === 'won' || r.status === 'lost').forEach(r => {
    const org = r.issuingOrg;
    if (!map[org]) map[org] = { org, bids: 0, wins: 0, lastBid: null, avgBid: 0, totalBid: 0, notes: [] };
    map[org].bids++;
    map[org].totalBid += r.estimatedTotalValue || 0;
    if (r.status === 'won') map[org].wins++;
    if (r.outcome) map[org].notes.push(r.outcome);
    if (!map[org].lastBid || r.receivedDate > map[org].lastBid) map[org].lastBid = r.receivedDate;
  });
  return Object.values(map).map(o => ({
    ...o,
    winRate: o.bids > 0 ? Math.round((o.wins / o.bids) * 100) : 0,
    avgBid: o.bids > 0 ? Math.round(o.totalBid / o.bids) : 0,
  })).sort((a, b) => b.bids - a.bids).slice(0, 15);
}

export default function BidIntelTab({ rfqs }) {
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeOrgType, setActiveOrgType] = useState('all');

  const filtered = activeOrgType === 'all' ? rfqs : rfqs.filter(r => r.orgType === activeOrgType);
  const orgStats = buildOrgStats(rfqs); // always use all for org breakdown
  const pricingBands = buildPricingBands(filtered);
  const orgHistory = buildOrgHistory(filtered);

  const totalBids = rfqs.filter(r => ['won', 'lost', 'submitted'].includes(r.status)).length;
  const totalWins = rfqs.filter(r => r.status === 'won').length;
  const overallWinRate = totalBids > 0 ? Math.round((totalWins / totalBids) * 100) : 0;
  const totalRevenue = rfqs.filter(r => r.status === 'won').reduce((s, r) => s + (r.awardedValue || r.estimatedTotalValue || 0), 0);
  const avgBidValue = rfqs.filter(r => r.estimatedTotalValue).length > 0
    ? Math.round(rfqs.reduce((s, r) => s + (r.estimatedTotalValue || 0), 0) / rfqs.filter(r => r.estimatedTotalValue).length)
    : 0;

  const runAIAnalysis = async () => {
    setLoadingAI(true);
    try {
      const summaryData = {
        totalBids,
        totalWins,
        overallWinRate,
        orgTypeBreakdown: orgStats.map(o => ({
          orgType: o.label,
          bids: o.bids,
          wins: o.wins,
          winRate: o.winRate,
          avgBid: o.avgBid,
        })),
        pricingBands: pricingBands.map(b => ({ range: b.range, wins: b.wins, losses: b.losses, winRate: b.winRate })),
        topOrgs: orgHistory.slice(0, 8).map(o => ({
          org: o.org,
          bids: o.bids,
          wins: o.wins,
          winRate: o.winRate,
          avgBid: o.avgBid,
          notes: o.notes.slice(0, 2).join('; '),
        })),
        recentOutcomes: rfqs
          .filter(r => r.status === 'won' || r.status === 'lost')
          .sort((a, b) => (b.receivedDate || '').localeCompare(a.receivedDate || ''))
          .slice(0, 10)
          .map(r => ({ org: r.issuingOrg, orgType: r.orgType, bid: r.estimatedTotalValue, awarded: r.awardedValue, status: r.status, outcome: r.outcome })),
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a competitive bidding analyst for an equipment rental company. Analyze this historical RFQ bidding data and provide strategic intelligence.

Data: ${JSON.stringify(summaryData, null, 2)}

Provide a thorough analysis including:
1. Optimal pricing strategy by organization type (what price ranges win vs. lose)
2. Competitor behavior patterns inferred from win/loss notes and patterns
3. The top 3 most actionable pricing recommendations
4. Risk-adjusted pricing zones (safe, competitive, aggressive)
5. Which org types to prioritize vs. deprioritize based on win rates

Be specific with dollar amounts and percentages where possible.`,
        response_json_schema: {
          type: 'object',
          properties: {
            pricingStrategy: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                byOrgType: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      orgType: { type: 'string' },
                      recommendation: { type: 'string' },
                      optimalRange: { type: 'string' },
                      winProbabilityAtOptimal: { type: 'string' },
                      watchOut: { type: 'string' }
                    }
                  }
                }
              }
            },
            competitorMatrix: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  pattern: { type: 'string' },
                  evidence: { type: 'string' },
                  counterStrategy: { type: 'string' },
                  severity: { type: 'string', enum: ['high', 'medium', 'low'] }
                }
              }
            },
            topRecommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  recommendation: { type: 'string' },
                  expectedImpact: { type: 'string' },
                  priority: { type: 'string', enum: ['critical', 'high', 'medium'] }
                }
              }
            },
            pricingZones: {
              type: 'object',
              properties: {
                safe: { type: 'string' },
                competitive: { type: 'string' },
                aggressive: { type: 'string' },
                avoidBelow: { type: 'string' }
              }
            }
          }
        }
      });

      setAiInsights(result);
    } catch (err) {
      console.error('AI analysis failed:', err);
    } finally {
      setLoadingAI(false);
    }
  };

  const priorityColors = { critical: 'text-red-400 border-red-500/30 bg-red-500/10', high: 'text-amber-400 border-amber-500/30 bg-amber-500/10', medium: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' };
  const severityColors = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-slate-400' };

  if (rfqs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/30">
        <BarChart3 className="w-12 h-12 mb-3" />
        <div className="text-lg font-semibold">No bid history yet</div>
        <div className="text-sm mt-1">Submit and track RFQ outcomes to unlock competitive intelligence.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall Win Rate" value={`${overallWinRate}%`} sub={`${totalWins} wins / ${totalBids} submitted`} color={overallWinRate >= 50 ? 'text-green-400' : 'text-amber-400'} icon={Trophy} />
        <StatCard label="Total Revenue Won" value={`$${(totalRevenue / 1000).toFixed(0)}k`} sub="from awarded contracts" color="text-cyan-400" icon={DollarSign} />
        <StatCard label="Avg Bid Value" value={`$${(avgBidValue / 1000).toFixed(1)}k`} sub="across all RFQs" icon={Target} />
        <StatCard label="Org Types Targeted" value={orgStats.length} sub="with bid history" color="text-purple-400" icon={BarChart3} />
      </div>

      {/* Org Type filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...orgStats.map(o => o.orgType)].map(ot => (
          <button key={ot} onClick={() => setActiveOrgType(ot)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${activeOrgType === ot ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-white/60 hover:text-white border border-white/10'}`}>
            {ot === 'all' ? 'All Types' : ORG_TYPE_LABELS[ot] || ot}
          </button>
        ))}
      </div>

      {/* Win Rate by Org Type */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Win Rate by Organization Type</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={orgStats} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<DarkTooltip />} formatter={v => [`${v}%`, 'Win Rate']} />
              <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                {orgStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Avg Bid Value by Org Type</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={orgStats} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="avgBid" name="Avg Bid ($)" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pricing Sweet Spot */}
      {pricingBands.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-1 text-sm">Pricing Sweet Spot Analysis</div>
          <div className="text-white/40 text-xs mb-4">Win rate by bid value range — higher bars = better odds at that price point</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pricingBands} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} angle={-20} textAnchor="end" height={45} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                {pricingBands.map((b, i) => <Cell key={i} fill={b.winRate >= 60 ? '#34d399' : b.winRate >= 40 ? '#facc15' : '#f87171'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block" /> ≥60% win rate</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" /> 40–59%</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> &lt;40%</span>
          </div>
        </div>
      )}

      {/* Per-Org History Matrix */}
      {orgHistory.length > 0 && (
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <div className="text-white font-semibold mb-4 text-sm">Organization Bid History Matrix</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 pb-2 pr-4 font-medium">Organization</th>
                  <th className="text-center text-white/40 pb-2 px-3 font-medium">Bids</th>
                  <th className="text-center text-white/40 pb-2 px-3 font-medium">Wins</th>
                  <th className="text-center text-white/40 pb-2 px-3 font-medium">Win Rate</th>
                  <th className="text-right text-white/40 pb-2 px-3 font-medium">Avg Bid</th>
                  <th className="text-left text-white/40 pb-2 pl-4 font-medium">Outcome Notes</th>
                </tr>
              </thead>
              <tbody>
                {orgHistory.map((o, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-2.5 pr-4 text-white font-medium">{o.org}</td>
                    <td className="py-2.5 px-3 text-center text-white/60">{o.bids}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="flex items-center justify-center gap-1">
                        {o.wins > 0 && <Trophy className="w-3 h-3 text-yellow-400" />}
                        <span className={o.wins > 0 ? 'text-yellow-400' : 'text-white/40'}>{o.wins}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-semibold ${o.winRate >= 50 ? 'text-green-400' : o.winRate >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                        {o.winRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-white/70">${o.avgBid.toLocaleString()}</td>
                    <td className="py-2.5 pl-4 text-white/40 max-w-xs truncate">{o.notes.slice(0, 1).join('; ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Competitive Intelligence */}
      <div className="bg-slate-900 border border-cyan-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-white font-semibold text-sm">AI Competitive Intelligence</div>
              <div className="text-white/40 text-xs">Optimal pricing strategy + competitor behavior analysis</div>
            </div>
          </div>
          <Button size="sm" onClick={runAIAnalysis} disabled={loadingAI}
            className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5 text-xs">
            {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
            {loadingAI ? 'Analyzing...' : aiInsights ? 'Re-Analyze' : 'Run Analysis'}
          </Button>
        </div>

        {!aiInsights && !loadingAI && (
          <div className="text-center py-8 text-white/30 text-sm">
            Click "Run Analysis" to generate AI-powered pricing strategy and competitor intelligence from your bid history.
          </div>
        )}

        {loadingAI && (
          <div className="flex items-center justify-center py-10 gap-3 text-white/50 text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            Analyzing {rfqs.length} bids across {orgStats.length} org types...
          </div>
        )}

        {aiInsights && !loadingAI && (
          <div className="space-y-6">
            {/* Top Recommendations */}
            {aiInsights.topRecommendations?.length > 0 && (
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Top Recommendations</div>
                <div className="space-y-2">
                  {aiInsights.topRecommendations.map((r, i) => (
                    <div key={i} className={`border rounded-lg p-3 ${priorityColors[r.priority] || priorityColors.medium}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm">{r.recommendation}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full border capitalize flex-shrink-0">{r.priority}</span>
                      </div>
                      <div className="text-white/60 text-xs mt-1">{r.expectedImpact}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Zones */}
            {aiInsights.pricingZones && (
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Risk-Adjusted Pricing Zones</div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'safe', label: 'Safe Zone', color: 'border-green-500/30 bg-green-500/10 text-green-400' },
                    { key: 'competitive', label: 'Competitive Zone', color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' },
                    { key: 'aggressive', label: 'Aggressive Zone', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
                    { key: 'avoidBelow', label: 'Avoid Below', color: 'border-red-500/30 bg-red-500/10 text-red-400' },
                  ].map(z => (
                    <div key={z.key} className={`border rounded-lg p-3 ${z.color}`}>
                      <div className="text-xs font-semibold mb-1">{z.label}</div>
                      <div className="text-sm font-bold">{aiInsights.pricingZones[z.key] || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Org Type Strategy */}
            {aiInsights.pricingStrategy?.byOrgType?.length > 0 && (
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Pricing Strategy by Org Type</div>
                <div className="space-y-2">
                  {aiInsights.pricingStrategy.byOrgType.map((o, i) => (
                    <div key={i} className="bg-slate-800 border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-white font-semibold text-sm">{o.orgType}</span>
                        <span className="text-cyan-400 text-xs font-mono">{o.optimalRange}</span>
                      </div>
                      <div className="text-white/70 text-xs mb-1">{o.recommendation}</div>
                      {o.watchOut && (
                        <div className="flex items-start gap-1.5 text-amber-400 text-xs">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {o.watchOut}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitor Matrix */}
            {aiInsights.competitorMatrix?.length > 0 && (
              <div>
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Competitor Behavior Matrix</div>
                <div className="space-y-2">
                  {aiInsights.competitorMatrix.map((c, i) => (
                    <div key={i} className="bg-slate-800 border border-white/5 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className={`text-xs font-bold uppercase mt-0.5 ${severityColors[c.severity]}`}>[{c.severity}]</span>
                        <div className="flex-1">
                          <div className="text-white text-sm font-medium mb-0.5">{c.pattern}</div>
                          <div className="text-white/50 text-xs mb-1">{c.evidence}</div>
                          <div className="text-cyan-400 text-xs">↳ {c.counterStrategy}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Summary */}
            {aiInsights.pricingStrategy?.summary && (
              <div className="bg-slate-800 border border-white/10 rounded-lg p-4 text-white/70 text-sm leading-relaxed">
                {aiInsights.pricingStrategy.summary}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}