/**
 * CustomerRiskCheck — Inline risk check panel for the rental form.
 * Shows overdue history, blacklist/credit-hold flags, address risk,
 * and optionally runs the external DL check (Twilio + NICB links).
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldAlert, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle, Phone, ExternalLink, Ban } from 'lucide-react';

function RiskBadge({ level }) {
  const cfg = {
    clear:  'bg-green-100 text-green-800 border-green-300',
    low:    'bg-blue-100 text-blue-800 border-blue-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    high:   'bg-red-100 text-red-800 border-red-300',
    reject: 'bg-red-200 text-red-900 border-red-500',
  };
  const labels = { clear: '✅ Clear', low: '🟡 Low Risk', medium: '🟠 Caution', high: '🔴 High Risk', reject: '🚫 Do Not Rent' };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg[level] || cfg.low}`}>
      {labels[level] || level}
    </span>
  );
}

export default function CustomerRiskCheck({ customer, rentals }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [externalCheck, setExternalCheck] = useState(null);
  const [extLoading, setExtLoading] = useState(false);

  // Auto-run when we have at least a name
  const canRun = !!(customer.name && customer.name.trim().length >= 2);

  // Reset when customer changes significantly
  useEffect(() => {
    setResult(null);
    setExternalCheck(null);
  }, [customer.name, customer.phone]);

  const runCheck = async () => {
    if (!canRun) return;
    setLoading(true);
    setResult(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nameQ = customer.name.trim().toLowerCase();

      // Match rentals by name
      const matched = rentals.filter(r =>
        (r.customerName || '').toLowerCase() === nameQ
      );

      const overdue = matched.filter(r => r.status === 'out' && r.endDate < today);
      const active  = matched.filter(r => ['out', 'contract', 'reservation'].includes(r.status));
      const nonReturns = matched.filter(r => r.status === 'out' && r.endDate < new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);

      // Address frequency across ALL rentals (chop shop check)
      const addr = (customer.worksiteAddress || customer.address || '').toLowerCase().trim();
      let addressMatchCount = 0;
      let addressOtherCustomers = [];
      if (addr.length > 5) {
        const addrRentals = rentals.filter(r => {
          const ra = (r.worksiteAddress || r.customerAddress || '').toLowerCase();
          return ra.includes(addr.split(' ')[1] || addr);
        });
        const others = addrRentals.filter(r => (r.customerName || '').toLowerCase() !== nameQ);
        addressMatchCount = addrRentals.length;
        addressOtherCustomers = [...new Set(others.map(r => r.customerName).filter(Boolean))].slice(0, 4);
      }

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a risk assessment AI for an equipment rental counter in South Texas. 
A customer is at the counter right now. Give a quick risk assessment so the counter rep knows how to proceed.

CUSTOMER: ${customer.name}
Phone: ${customer.phone || 'not provided'}
Address: ${[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ') || 'not provided'}
ID Verified via DL Scan: ${customer._dlVerified ? `YES — DL last 4: ${customer._dlLast4}, exp: ${customer._dlExpiry}` : 'NO — manual entry'}
ID Expired: ${customer._dlVerified && customer._dlExpiry ? (new Date(customer._dlExpiry) < new Date() ? 'YES - EXPIRED' : 'No') : 'Unknown'}

ACCOUNT FLAGS:
- Blacklisted: ${customer._blacklisted ? 'YES' : 'No'}
- Credit Hold: ${customer._creditHold ? `YES — ${customer._creditHoldReason || 'no reason given'}` : 'No'}
- Tax Exempt: ${customer._taxExempt ? 'Yes' : 'No'}

RENTAL HISTORY (${matched.length} total rentals):
- Currently overdue (past due date): ${overdue.length}
- Active rentals right now: ${active.length}
- Long overdue (7+ days late): ${nonReturns.length}
- Recent rentals: ${matched.slice(0, 5).map(r => `${r.invoiceNumber || '—'} ${r.equipmentName} (${r.status})`).join(', ') || 'None'}

ADDRESS CROSS-REFERENCE:
- Other customers who used same address: ${addressOtherCustomers.length > 0 ? addressOtherCustomers.join(', ') : 'None found'}
- Total rentals to this address: ${addressMatchCount}

Provide a concise counter-level risk assessment. Be direct — the rep needs to make a quick decision.`,
        response_json_schema: {
          type: 'object',
          properties: {
            riskLevel: { type: 'string', enum: ['clear', 'low', 'medium', 'high', 'reject'] },
            riskScore: { type: 'number' },
            summary: { type: 'string' },
            flags: { type: 'array', items: { type: 'string' } },
            counterAction: { type: 'string' },
            requiresExtraDeposit: { type: 'boolean' },
            suggestedDepositAmount: { type: 'number' },
            callManager: { type: 'boolean' },
          }
        }
      });

      setResult({
        ...res,
        matchedCount: matched.length,
        overdueCount: overdue.length,
        activeCount: active.length,
        addressMatchCount,
        addressOtherCustomers,
      });
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const runExternal = async () => {
    setExtLoading(true);
    try {
      const res = await base44.functions.invoke('dlExternalCheck', {
        phone: customer.phone || null,
        name: customer.name || null,
        address: customer.address || null,
        city: customer.city || null,
        state: customer.state || null,
        zip: customer.zip || null,
      });
      setExternalCheck(res.data);
    } catch (err) {
      setExternalCheck({ error: err.message });
    } finally {
      setExtLoading(false);
    }
  };

  const riskBg = {
    clear:  'border-green-200 bg-green-50',
    low:    'border-blue-200 bg-blue-50',
    medium: 'border-amber-200 bg-amber-50',
    high:   'border-red-200 bg-red-50',
    reject: 'border-red-400 bg-red-100',
  };

  // Determine header pill color based on flags or result
  const hasCriticalFlag = customer._blacklisted;
  const hasWarningFlag = customer._creditHold || (result && ['high', 'reject'].includes(result.riskLevel));

  return (
    <div className={`rounded-lg border transition-all ${hasCriticalFlag ? 'border-red-400 bg-red-50' : hasWarningFlag ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !result && !loading && canRun) runCheck();
        }}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-black/5 rounded-lg transition"
      >
        <ShieldAlert className={`w-4 h-4 ${hasCriticalFlag ? 'text-red-600' : hasWarningFlag ? 'text-amber-600' : 'text-gray-400'}`} />
        <span className="flex-1 text-left">
          Risk Check
          {result && !result.error && (
            <span className="ml-2"><RiskBadge level={result.riskLevel} /></span>
          )}
          {loading && <Loader2 className="inline w-3 h-3 ml-2 animate-spin text-indigo-500" />}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
          {/* Run / Re-run button */}
          {!loading && canRun && (
            <button
              onClick={runCheck}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-lg transition"
            >
              {result ? '↻ Re-run Check' : '▶ Run Risk Check'}
            </button>
          )}
          {!canRun && <p className="text-xs text-gray-400">Enter customer name to run a risk check.</p>}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-indigo-700">
              <Loader2 className="w-4 h-4 animate-spin" /> Analyzing rental history…
            </div>
          )}

          {result?.error && (
            <div className="text-xs text-red-600 bg-red-50 rounded p-2">Error: {result.error}</div>
          )}

          {result && !result.error && (
            <div className={`rounded-lg border p-3 space-y-2 ${riskBg[result.riskLevel] || riskBg.low}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <RiskBadge level={result.riskLevel} />
                <div className="text-right">
                  <span className={`text-xl font-black ${result.riskScore >= 70 ? 'text-red-600' : result.riskScore >= 40 ? 'text-amber-600' : 'text-green-600'}`}>
                    {result.riskScore}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">/ 100</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/60 rounded p-1.5">
                  <div className={`font-bold text-sm ${result.matchedCount > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>{result.matchedCount}</div>
                  <div className="text-[10px] text-gray-500">Prior Rentals</div>
                </div>
                <div className="bg-white/60 rounded p-1.5">
                  <div className={`font-bold text-sm ${result.overdueCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{result.overdueCount}</div>
                  <div className="text-[10px] text-gray-500">Overdue</div>
                </div>
                <div className="bg-white/60 rounded p-1.5">
                  <div className={`font-bold text-sm ${result.addressMatchCount > 3 ? 'text-amber-700' : 'text-gray-400'}`}>{result.addressMatchCount}</div>
                  <div className="text-[10px] text-gray-500">Addr. Matches</div>
                </div>
              </div>

              {result.summary && (
                <p className="text-xs text-gray-700">{result.summary}</p>
              )}

              {result.flags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.flags.map((f, i) => (
                    <span key={i} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">⚑ {f}</span>
                  ))}
                </div>
              )}

              {result.addressOtherCustomers?.length > 0 && (
                <div className="text-xs bg-white/70 rounded p-2 border border-amber-200">
                  <span className="font-semibold text-amber-800">⚠️ Same address used by: </span>
                  <span className="text-amber-700">{result.addressOtherCustomers.join(', ')}</span>
                </div>
              )}

              {result.counterAction && (
                <div className={`rounded p-2 text-xs font-semibold ${result.callManager ? 'bg-red-100 border border-red-300 text-red-900' : 'bg-white border border-gray-200 text-gray-800'}`}>
                  {result.callManager && '📞 CALL MANAGER — '}
                  {result.counterAction}
                </div>
              )}

              {result.requiresExtraDeposit && result.suggestedDepositAmount > 0 && (
                <div className="text-xs bg-amber-100 border border-amber-300 rounded p-2 font-semibold text-amber-900">
                  💰 Collect extra deposit: ${result.suggestedDepositAmount.toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* External Checks */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={runExternal}
              disabled={extLoading}
              className="text-xs bg-gray-700 hover:bg-gray-900 text-white font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              {extLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
              Phone & Database Check
            </button>
            {externalCheck?.nicbCheck && (
              <>
                <a href={externalCheck.nicbCheck.machineryTraderStolen} target="_blank" rel="noopener noreferrer"
                  className="text-xs bg-gray-600 text-white px-2 py-1.5 rounded-lg hover:bg-gray-800 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> MachineryTrader
                </a>
                <a href={externalCheck.nicbCheck.stolenRegister} target="_blank" rel="noopener noreferrer"
                  className="text-xs bg-gray-600 text-white px-2 py-1.5 rounded-lg hover:bg-gray-800 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Stolen Register
                </a>
                <a href={externalCheck.nicbCheck.nerIronCheck} target="_blank" rel="noopener noreferrer"
                  className="text-xs bg-amber-700 text-white px-2 py-1.5 rounded-lg hover:bg-amber-800 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> NER IRONcheck
                </a>
                {externalCheck.nicbCheck.googleFraudSearch && (
                  <a href={externalCheck.nicbCheck.googleFraudSearch} target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-indigo-600 text-white px-2 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Google Search
                  </a>
                )}
              </>
            )}
          </div>

          {/* Twilio result */}
          {externalCheck?.twilioLookup && (
            <div className={`rounded-lg border p-2.5 text-xs ${externalCheck.twilioLookup.isFraudRisk ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
              <span className="font-semibold">📱 Phone: </span>
              <span className={`font-bold uppercase ${externalCheck.twilioLookup.phoneType === 'voip' ? 'text-red-700' : externalCheck.twilioLookup.phoneType === 'prepaid' ? 'text-amber-700' : 'text-green-700'}`}>
                {externalCheck.twilioLookup.phoneType || 'unknown'}
              </span>
              {externalCheck.twilioLookup.carrier && <span className="text-gray-600"> · {externalCheck.twilioLookup.carrier}</span>}
              {externalCheck.twilioLookup.isFraudRisk && <span className="text-red-700 font-semibold ml-1">⚠️ VOIP/Prepaid — fraud risk</span>}
            </div>
          )}

          {externalCheck?.error && (
            <div className="text-xs text-red-600">External check error: {externalCheck.error}</div>
          )}
        </div>
      )}
    </div>
  );
}