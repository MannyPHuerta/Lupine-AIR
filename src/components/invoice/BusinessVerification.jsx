import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, Loader2, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';

const STATUS_CONFIG = {
  verified:   { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Business Verified' },
  caution:    { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Proceed with Caution' },
  not_found:  { icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50 border-red-200',     label: 'Not Found / Suspicious' },
};

export default function BusinessVerification({ companyName, state, city }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState('');

  const canCheck = companyName && companyName.trim().length >= 3;
  const checkKey = `${companyName}|${state}|${city}`;

  const runCheck = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a business verification assistant for a rental equipment company in Texas.
A customer claims to represent the following business:
- Business Name: "${companyName}"
- State: "${state || 'TX'}"
- City: "${city || 'unknown'}"

Search the web thoroughly for this business. Check ALL of the following:

1. STATE REGISTRATION: Does this business appear in the relevant Secretary of State or Comptroller records? Is it in good standing or forfeited/dissolved?
2. WEB PRESENCE: Does it have a real website, Google Maps listing, BBB profile, or LinkedIn page consistent with an operating company?
3. ADDRESS REUSE (CRITICAL): Look up the business address. Is this address shared by a large number of unrelated businesses (e.g. a registered agent mill, UPS Store, virtual office, or known shell company address)? In recent fraud cases (e.g. Minnesota 2024), dozens of fake LLCs were registered to the same address — flag this prominently if found.
4. RECENT REGISTRATION: Was the business registered very recently (within the last 6 months)? Newly formed entities renting heavy equipment is a risk signal.
5. OPERATING EVIDENCE: Is there any real-world evidence this company actually operates — employees, job postings, news mentions, contracts, reviews?
6. NAME PATTERNS: Is the name generic/vague (e.g. "XYZ Holdings LLC", "Global Resources Group") with no real identity? Does it match a pattern of known fraudulent shell company naming?

Be specific. If you find the address is shared by many businesses, name the address and the approximate count.

Respond with a JSON object only.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['verified', 'caution', 'not_found'] },
            summary: { type: 'string' },
            findings: { type: 'array', items: { type: 'string' } },
            red_flags: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setResult(res);
      setLastChecked(checkKey);
    } catch (err) {
      setResult({ status: 'caution', summary: 'Verification service unavailable. Proceed manually.', findings: [], red_flags: [] });
    } finally {
      setLoading(false);
    }
  };

  if (!canCheck) return null;

  const cfg = result ? STATUS_CONFIG[result.status] : null;
  const alreadyChecked = lastChecked === checkKey;

  return (
    <div className="mt-2">
      {!result && !loading && (
        <button
          type="button"
          onClick={runCheck}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
        >
          <Search className="w-3.5 h-3.5" />
          Verify "{companyName}" with AI
        </button>
      )}

      {loading && (
        <div className="inline-flex items-center gap-2 text-xs text-gray-500 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Searching state records &amp; web…
        </div>
      )}

      {result && cfg && (
        <div className={`border rounded-lg p-3 space-y-2 ${cfg.bg}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold ${cfg.color}`}>
            <cfg.icon className="w-4 h-4 flex-shrink-0" />
            {cfg.label}
            <button
              type="button"
              onClick={runCheck}
              className="ml-auto text-xs font-normal text-gray-400 hover:text-gray-600 underline"
            >
              Re-check
            </button>
          </div>

          {result.summary && (
            <p className="text-xs text-gray-700 leading-relaxed">{result.summary}</p>
          )}

          {result.findings?.length > 0 && (
            <ul className="space-y-0.5">
              {result.findings.map((f, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                  <span className="text-green-500 flex-shrink-0">✓</span> {f}
                </li>
              ))}
            </ul>
          )}

          {result.red_flags?.length > 0 && (
            <ul className="space-y-0.5">
              {result.red_flags.map((f, i) => (
                <li key={i} className="text-xs text-red-700 flex gap-1.5 font-medium">
                  <span className="flex-shrink-0">⚠</span> {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}