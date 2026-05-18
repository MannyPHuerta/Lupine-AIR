/**
 * ThreatWatchPanel — Real-time behavioral anomaly detection
 * Detects: coordinated rental rings, identity fraud patterns,
 * velocity attacks (many rentals in short time), equipment targeting,
 * and social network theft patterns.
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Radar, Users, Zap, Shield, TrendingUp, Clock, AlertOctagon } from 'lucide-react';

function ThreatCard({ threat }) {
  const levelConfig = {
    critical: { border: 'border-red-500 bg-red-50', header: 'bg-red-600 text-white', dot: 'bg-red-600' },
    high:     { border: 'border-orange-400 bg-orange-50', header: 'bg-orange-500 text-white', dot: 'bg-orange-500' },
    medium:   { border: 'border-amber-300 bg-amber-50', header: 'bg-amber-400 text-gray-900', dot: 'bg-amber-400' },
    low:      { border: 'border-blue-300 bg-blue-50', header: 'bg-blue-400 text-white', dot: 'bg-blue-400' },
  };
  const cfg = levelConfig[threat.level] || levelConfig.low;

  const typeIcons = {
    coordinated_ring: '🕸️',
    velocity_attack: '⚡',
    identity_fraud: '👤',
    equipment_targeting: '🎯',
    social_network: '🔗',
    insider_risk: '🔑',
    other: '⚠️',
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${cfg.border}`}>
      <div className={`px-4 py-2.5 flex items-center justify-between ${cfg.header}`}>
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>{typeIcons[threat.type] || '⚠️'}</span>
          {threat.title}
        </div>
        <span className="text-xs font-bold opacity-80">{threat.level?.toUpperCase()}</span>
      </div>
      <div className="px-4 py-3 space-y-2">
        <p className="text-sm text-gray-700">{threat.description}</p>
        {threat.entities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {threat.entities.map((e, i) => (
              <span key={i} className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                {e}
              </span>
            ))}
          </div>
        )}
        {threat.evidence?.length > 0 && (
          <div className="bg-white rounded p-2 border space-y-0.5">
            <div className="text-xs font-semibold text-gray-500 uppercase">Evidence</div>
            {threat.evidence.map((e, i) => (
              <div key={i} className="text-xs text-gray-600 flex items-start gap-1">
                <span className="text-gray-400 flex-shrink-0">•</span> {e}
              </div>
            ))}
          </div>
        )}
        {threat.suggestedResponse && (
          <div className="text-xs font-semibold text-gray-900 bg-white rounded p-2 border-l-4 border-gray-400">
            🎯 {threat.suggestedResponse}
          </div>
        )}
      </div>
    </div>
  );
}

function IntegrationCard({ name, icon, description, status, url, actionLabel }) {
  return (
    <div className="bg-white border rounded-xl p-4 flex items-start gap-3">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        <div className={`text-xs font-medium mt-1 ${status === 'available' ? 'text-green-600' : status === 'requires_setup' ? 'text-amber-600' : 'text-gray-400'}`}>
          {status === 'available' ? '✓ Available' : status === 'requires_setup' ? '⚙️ Requires API Key' : '○ Not Configured'}
        </div>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition flex-shrink-0 font-medium">
          {actionLabel || 'Learn More'}
        </a>
      )}
    </div>
  );
}

const THEFT_PREVENTION_INTEGRATIONS = [
  {
    name: 'NICB VINCheck',
    icon: '🚗',
    description: 'National Insurance Crime Bureau — check VINs and vehicles associated with theft rings. Free API available.',
    status: 'available',
    url: 'https://www.nicb.org/vincheck',
    actionLabel: 'VINCheck',
  },
  {
    name: 'EquipmentWatch / HIN Check',
    icon: '🏗️',
    description: 'Equipment serial number / HIN theft database. Cross-reference recovered equipment serial numbers.',
    status: 'available',
    url: 'https://www.equipmentwatch.com',
    actionLabel: 'Check Database',
  },
  {
    name: 'NMVTIS / AAMVA',
    icon: '🪪',
    description: "Driver's license verification and DMV cross-check. Validates customer ID authenticity.",
    status: 'requires_setup',
    url: 'https://www.aamva.org/solutions/dldv',
    actionLabel: 'Setup DLDV',
  },
  {
    name: 'Twilio Lookup',
    icon: '📱',
    description: 'Phone number intelligence — carrier, line type, fraud score. Detect VOIP/burner phones.',
    status: 'available',
    url: 'https://www.twilio.com/docs/lookup',
    actionLabel: 'Docs',
  },
  {
    name: 'StolenEquipmentDB.com',
    icon: '🔎',
    description: 'Industry theft reporting database. Submit and search stolen equipment reports.',
    status: 'available',
    url: 'https://www.stolenequipmentdb.com',
    actionLabel: 'Visit',
  },
  {
    name: 'LoJack / CalAmp GPS',
    icon: '📡',
    description: 'Asset tracking integration. Real-time GPS for high-value equipment (generators, lifts). Alert on boundary breach.',
    status: 'requires_setup',
    url: 'https://www.calamp.com',
    actionLabel: 'Setup GPS',
  },
  {
    name: 'LexisNexis RiskView',
    icon: '🔍',
    description: 'Identity risk and fraud signals for customer screening. Address history, fraud indicators.',
    status: 'requires_setup',
    url: 'https://risk.lexisnexis.com',
    actionLabel: 'Contact Sales',
  },
  {
    name: 'Ekata / Mastercard ID',
    icon: '🌐',
    description: 'Global identity intelligence — email, phone, address velocity and consistency scoring.',
    status: 'requires_setup',
    url: 'https://ekata.com',
    actionLabel: 'Learn More',
  },
];

export default function ThreatWatchPanel({ rentals, customers, recoveries }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('threats');

  const runThreatWatch = async () => {
    setLoading(true);
    setResult(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      // Velocity: customers who rented multiple times in 30 days
      const recentRentals = rentals.filter(r => r.created_date >= thirtyDaysAgo);
      const customerVelocity = {};
      recentRentals.forEach(r => {
        customerVelocity[r.customerName] = (customerVelocity[r.customerName] || []);
        customerVelocity[r.customerName].push(r);
      });
      const velocityCustomers = Object.entries(customerVelocity)
        .filter(([, arr]) => arr.length >= 3)
        .map(([name, arr]) => ({ name, count: arr.length, equipment: arr.map(r => r.equipmentName).join(', ') }));

      // Phone sharing: multiple customers with same phone
      const phoneMap = {};
      rentals.forEach(r => {
        if (!r.customerPhone) return;
        const phone = r.customerPhone.replace(/\D/g, '');
        if (!phoneMap[phone]) phoneMap[phone] = new Set();
        phoneMap[phone].add(r.customerName);
      });
      const sharedPhones = Object.entries(phoneMap)
        .filter(([, names]) => names.size > 1)
        .map(([phone, names]) => ({ phone, customers: [...names] }));

      // Equipment targeting: same equipment category rented repeatedly by different customers to same area
      const categoryAddressMap = {};
      rentals.forEach(r => {
        const area = r.worksiteCity || r.customerCity || '';
        const cat = r.equipmentName?.split(' ')[0] || 'Unknown';
        const key = `${cat}||${area}`;
        categoryAddressMap[key] = (categoryAddressMap[key] || 0) + 1;
      });
      const targetedEquipment = Object.entries(categoryAddressMap)
        .filter(([, c]) => c >= 4)
        .map(([key, count]) => {
          const [cat, area] = key.split('||');
          return { category: cat, area, count };
        }).sort((a, b) => b.count - a.count).slice(0, 5);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a threat intelligence AI for an equipment rental company. Analyze these behavioral patterns for organized theft, fraud rings, and insider risks.

VELOCITY PATTERNS (multiple rentals in 30 days):
${velocityCustomers.map(c => `- ${c.name}: ${c.count} rentals — ${c.equipment}`).join('\n') || 'None'}

SHARED PHONE NUMBERS (multiple customers, same phone):
${sharedPhones.map(p => `- Phone: ${p.phone} shared by: ${p.customers.join(', ')}`).join('\n') || 'None'}

EQUIPMENT TARGETING (same type, same area, high frequency):
${targetedEquipment.map(t => `- ${t.category} in ${t.area || 'unspecified area'}: ${t.count} rentals`).join('\n') || 'None'}

TOTAL ACTIVE RENTALS OUT: ${rentals.filter(r => r.status === 'out').length}
NON-RETURNED WITH DAMAGE: ${recoveries.filter(r => r.detectedDamages?.length > 0).length}

Identify threat categories: coordinated_ring, velocity_attack, identity_fraud, equipment_targeting, social_network, insider_risk, or other.
Focus on patterns that suggest organized theft vs individual incidents.`,
        response_json_schema: {
          type: 'object',
          properties: {
            threats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  entities: { type: 'array', items: { type: 'string' } },
                  evidence: { type: 'array', items: { type: 'string' } },
                  suggestedResponse: { type: 'string' },
                }
              }
            },
            threatScore: { type: 'number' },
            riskTrend: { type: 'string', enum: ['increasing', 'stable', 'decreasing'] },
            networkAnalysis: { type: 'string' },
            preventionPriorities: { type: 'array', items: { type: 'string' } },
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-950 text-white rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg">
              <Radar className="w-5 h-5 text-green-400" />
              ThreatWatch — Behavioral Intelligence
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Detects organized theft rings, identity fraud, velocity attacks, and insider risks across all rental activity.
            </p>
          </div>
          <button
            onClick={runThreatWatch}
            disabled={loading}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg transition text-sm flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
            {loading ? 'Scanning…' : 'Run ThreatWatch'}
          </button>
        </div>

        {result && !result.error && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className={`text-2xl font-black ${result.threatScore >= 75 ? 'text-red-400' : result.threatScore >= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                {result.threatScore || 0}
              </div>
              <div className="text-xs text-gray-400">Threat Score / 100</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-white">{result.threats?.length || 0}</div>
              <div className="text-xs text-gray-400">Threats Detected</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 text-center">
              <div className={`text-lg font-black ${result.riskTrend === 'increasing' ? 'text-red-400' : result.riskTrend === 'decreasing' ? 'text-green-400' : 'text-gray-300'}`}>
                {result.riskTrend === 'increasing' ? '↑ Rising' : result.riskTrend === 'decreasing' ? '↓ Falling' : '→ Stable'}
              </div>
              <div className="text-xs text-gray-400">Risk Trend</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'threats', label: '🔍 Threat Analysis' },
          { key: 'integrations', label: '🔌 Prevention APIs' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition ${activeTab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'threats' && (
        <>
          {result?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">Error: {result.error}</div>
          )}

          {result && !result.error && (
            <>
              {result.networkAnalysis && (
                <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs leading-relaxed border border-gray-700">
                  <div className="text-gray-400 text-xs uppercase font-sans font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Network Analysis
                  </div>
                  {result.networkAnalysis}
                </div>
              )}

              {result.threats?.length > 0 ? (
                <div className="space-y-4">
                  {result.threats
                    .sort((a, b) => ['critical','high','medium','low'].indexOf(a.level) - ['critical','high','medium','low'].indexOf(b.level))
                    .map((threat, i) => <ThreatCard key={i} threat={threat} />)}
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="text-sm text-green-800 font-medium">No organized threat patterns detected in current data.</div>
                </div>
              )}

              {result.preventionPriorities?.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Prevention Priorities
                  </div>
                  <ol className="space-y-1">
                    {result.preventionPriorities.map((p, i) => (
                      <li key={i} className="text-sm text-indigo-800 flex items-start gap-2">
                        <span className="font-bold text-indigo-500 flex-shrink-0">{i + 1}.</span> {p}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          {!result && !loading && (
            <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              <Radar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Click "Run ThreatWatch" to detect organized theft patterns, velocity attacks, and fraud rings
            </div>
          )}
        </>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <strong>Third-Party Theft Prevention APIs</strong> — Connect these services to add real-time identity verification, GPS tracking, and stolen equipment database lookups. Contact support to integrate any of these into your rental workflow.
          </div>
          {THEFT_PREVENTION_INTEGRATIONS.map((integration, i) => (
            <IntegrationCard key={i} {...integration} />
          ))}
        </div>
      )}
    </div>
  );
}