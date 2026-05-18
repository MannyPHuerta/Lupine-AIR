/**
 * TheftIntelPanel — AI-powered chop shop & theft risk analysis
 * Scores addresses, detects repeat offenders, cross-references suspicious patterns
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, ShieldAlert, MapPin, User, TrendingUp, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';

const RISK_COLORS = {
  critical: 'bg-red-600 text-white',
  high:     'bg-red-100 text-red-800 border border-red-300',
  medium:   'bg-amber-100 text-amber-800 border border-amber-300',
  low:      'bg-green-100 text-green-800 border border-green-300',
};

const RISK_BAR = {
  critical: 'w-full bg-red-600',
  high:     'w-3/4 bg-red-500',
  medium:   'w-1/2 bg-amber-500',
  low:      'w-1/4 bg-green-500',
};

function RiskBadge({ level }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RISK_COLORS[level] || RISK_COLORS.low}`}>
      {level?.toUpperCase() || 'LOW'}
    </span>
  );
}

function AddressRiskCard({ item }) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${item.riskLevel === 'critical' ? 'border-red-400 shadow-red-100 shadow-md' : item.riskLevel === 'high' ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <MapPin className={`w-4 h-4 flex-shrink-0 mt-0.5 ${item.riskLevel === 'critical' || item.riskLevel === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-sm">{item.address}</div>
            <div className="text-xs text-gray-500 mt-0.5">{item.rentalCount} rental{item.rentalCount !== 1 ? 's' : ''} · {item.uniqueCustomers} customer{item.uniqueCustomers !== 1 ? 's' : ''}</div>
            {item.customers?.length > 0 && (
              <div className="text-xs text-gray-400 mt-0.5 truncate">{item.customers.slice(0, 3).join(', ')}{item.customers.length > 3 ? ` +${item.customers.length - 3} more` : ''}</div>
            )}
          </div>
        </div>
        <RiskBadge level={item.riskLevel} />
      </div>
      {/* Risk score bar */}
      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${RISK_BAR[item.riskLevel] || RISK_BAR.low}`} />
      </div>
      {item.flags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.flags.map((f, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{f}</span>
          ))}
        </div>
      )}
      {item.recommendation && (
        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
          💡 {item.recommendation}
        </div>
      )}
    </div>
  );
}

function RepeatOffenderCard({ item }) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${item.riskScore >= 80 ? 'border-red-300' : 'border-amber-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <User className={`w-4 h-4 flex-shrink-0 mt-0.5 ${item.riskScore >= 80 ? 'text-red-500' : 'text-amber-500'}`} />
          <div>
            <div className="font-semibold text-gray-900 text-sm">{item.customerName}</div>
            <div className="text-xs text-gray-500">{item.totalRentals} rentals · {item.lateReturns} late returns · {item.noReturns} non-returns</div>
            {item.phone && <div className="text-xs text-gray-400">{item.phone}</div>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-lg font-black ${item.riskScore >= 80 ? 'text-red-600' : item.riskScore >= 50 ? 'text-amber-600' : 'text-green-600'}`}>
            {item.riskScore}
          </div>
          <div className="text-xs text-gray-400">Risk Score</div>
        </div>
      </div>
      {item.patterns?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.patterns.map((p, i) => (
            <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TheftIntelPanel({ rentals, customers, recoveries }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runAnalysis = async () => {
    setLoading(true);
    setResult(null);
    try {
      // Build address frequency map from rentals
      const addressMap = {};
      rentals.forEach(r => {
        const addr = [r.worksiteAddress || r.customerAddress, r.worksiteCity || r.customerCity, r.worksiteState || r.customerState]
          .filter(Boolean).join(', ').trim();
        if (!addr) return;
        if (!addressMap[addr]) addressMap[addr] = { customers: [], rentalIds: [] };
        if (!addressMap[addr].customers.includes(r.customerName)) addressMap[addr].customers.push(r.customerName);
        addressMap[addr].rentalIds.push(r.id);
      });

      // Build customer history
      const customerMap = {};
      rentals.forEach(r => {
        if (!r.customerName) return;
        if (!customerMap[r.customerName]) {
          customerMap[r.customerName] = { rentals: [], phone: r.customerPhone };
        }
        customerMap[r.customerName].rentals.push(r);
      });

      const addressData = Object.entries(addressMap)
        .filter(([, v]) => v.rentalIds.length >= 2)
        .map(([addr, v]) => ({ address: addr, rentalCount: v.rentalIds.length, uniqueCustomers: v.customers.length, customers: v.customers }))
        .sort((a, b) => b.rentalCount - a.rentalCount)
        .slice(0, 20);

      const nonReturnIds = new Set(recoveries.filter(r => r.status !== 'completed' && r.status !== 'cancelled').map(r => r.rentalId));
      const customerData = Object.entries(customerMap)
        .map(([name, data]) => ({
          name,
          phone: data.phone,
          total: data.rentals.length,
          overdue: data.rentals.filter(r => r.status === 'out' && r.endDate < new Date().toISOString().split('T')[0]).length,
          nonReturn: data.rentals.filter(r => nonReturnIds.has(r.id)).length,
        }))
        .filter(c => c.overdue > 0 || c.nonReturn > 0 || c.total >= 5)
        .sort((a, b) => (b.overdue + b.nonReturn * 3) - (a.overdue + a.nonReturn * 3))
        .slice(0, 15);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a theft prevention AI for an equipment rental company in South Texas (Rio Grande Valley — McAllen, Weslaco, Harlingen, Brownsville area).

Analyze these delivery/worksite addresses and customer patterns for CHOP SHOP RISK and equipment theft indicators.

HIGH-FREQUENCY ADDRESSES (multiple rentals to same location):
${addressData.map(a => `- "${a.address}": ${a.rentalCount} rentals, ${a.uniqueCustomers} different customers: ${a.customers.slice(0,3).join(', ')}`).join('\n') || 'None'}

CUSTOMERS WITH OVERDUE/NON-RETURNS:
${customerData.map(c => `- ${c.name} (${c.phone || 'no phone'}): ${c.total} total rentals, ${c.overdue} overdue, ${c.nonReturn} active non-returns`).join('\n') || 'None'}

For addresses: flag if multiple DIFFERENT customers use the same location (chop shop indicator), industrial areas with unusual frequency, addresses near known chop shop corridors in RGV.

For customers: compute a 0-100 theft risk score. Patterns to flag: multiple non-returns, phone changes between rentals, no ID on file, high-value equipment repeatedly.

Return structured intelligence.`,
        response_json_schema: {
          type: 'object',
          properties: {
            addressRisks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  address: { type: 'string' },
                  rentalCount: { type: 'number' },
                  uniqueCustomers: { type: 'number' },
                  customers: { type: 'array', items: { type: 'string' } },
                  riskLevel: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  flags: { type: 'array', items: { type: 'string' } },
                  recommendation: { type: 'string' },
                }
              }
            },
            repeatOffenders: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  customerName: { type: 'string' },
                  phone: { type: 'string' },
                  totalRentals: { type: 'number' },
                  lateReturns: { type: 'number' },
                  noReturns: { type: 'number' },
                  riskScore: { type: 'number' },
                  patterns: { type: 'array', items: { type: 'string' } },
                }
              }
            },
            summary: { type: 'string' },
            totalHighRiskAddresses: { type: 'number' },
            estimatedExposure: { type: 'number' },
          }
        },
        model: 'claude_sonnet_4_6'
      });
      setResult(res);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const highRiskAddresses = result?.addressRisks?.filter(a => ['critical', 'high'].includes(a.riskLevel)) || [];
  const highRiskOffenders = result?.repeatOffenders?.filter(r => r.riskScore >= 60) || [];

  return (
    <div className="space-y-4">
      <div className="bg-red-950 text-white rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Theft Intelligence Engine
            </div>
            <p className="text-red-300 text-sm mt-1">
              AI scans address patterns, repeat offenders, and chop shop indicators across all rental history.
              Uses <strong>Claude Sonnet</strong> for deeper reasoning.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-lg transition text-sm flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            {loading ? 'Analyzing…' : 'Run Theft Analysis'}
          </button>
        </div>

        {result && !result.error && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-red-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-red-300">{highRiskAddresses.length}</div>
              <div className="text-xs text-red-400">High-Risk Addresses</div>
            </div>
            <div className="bg-red-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-amber-300">{highRiskOffenders.length}</div>
              <div className="text-xs text-red-400">Flagged Customers</div>
            </div>
            <div className="bg-red-900/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-white">${(result.estimatedExposure || 0).toLocaleString()}</div>
              <div className="text-xs text-red-400">Estimated Exposure</div>
            </div>
          </div>
        )}
      </div>

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">Error: {result.error}</div>
      )}

      {result && !result.error && (
        <>
          {result.summary && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              <div className="font-semibold mb-1">🔍 Intelligence Summary</div>
              {result.summary}
            </div>
          )}

          {result.addressRisks?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm mb-3">
                <MapPin className="w-4 h-4 text-red-500" />
                Address Risk Analysis ({result.addressRisks.length} locations)
              </div>
              <div className="space-y-3">
                {result.addressRisks.map((item, i) => (
                  <AddressRiskCard key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {result.repeatOffenders?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm mb-3">
                <User className="w-4 h-4 text-red-500" />
                Repeat Offender Profiles ({result.repeatOffenders.length} flagged)
              </div>
              <div className="space-y-3">
                {result.repeatOffenders.map((item, i) => (
                  <RepeatOffenderCard key={i} item={item} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
          Click "Run Theft Analysis" to scan all rental history for theft risk patterns
        </div>
      )}
    </div>
  );
}