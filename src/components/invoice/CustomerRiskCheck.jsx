/**
 * CustomerRiskCheck — Auto-runs risk assessment as soon as a customer is loaded.
 * No button click required. Auto-expands on high/reject risk or blacklist flag.
 * Detects: overdue history, blacklist/credit-hold, address cross-ref, expired ID,
 * burner phone, and third-party contractor scheme (billing ≠ worksite, new customer).
 */
import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ShieldAlert, ChevronDown, ChevronUp, Loader2, ExternalLink, Phone, AlertTriangle } from 'lucide-react';

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

const riskBg = {
  clear:  'border-green-200 bg-green-50',
  low:    'border-blue-200 bg-blue-50',
  medium: 'border-amber-200 bg-amber-50',
  high:   'border-red-200 bg-red-50',
  reject: 'border-red-400 bg-red-100',
};

export default function CustomerRiskCheck({ customer, rentals }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [externalCheck, setExternalCheck] = useState(null);
  const [extLoading, setExtLoading] = useState(false);
  const debounceRef = useRef(null);

  const canRun = !!(customer?.name && customer.name.trim().length >= 2);
  const hasCriticalFlag = customer?._blacklisted;
  const hasWarningFlag = customer?._creditHold || (result && ['high', 'reject'].includes(result.riskLevel));

  // Reset on customer change
  useEffect(() => {
    setResult(null);
    setExternalCheck(null);
    setOpen(false);
    // Auto-expand immediately for blacklisted
    if (customer?._blacklisted) setOpen(true);
  }, [customer?.name, customer?.phone]);

  // AUTO-RUN: fire risk check as soon as we have a customer name (debounced)
  useEffect(() => {
    if (!canRun) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCheck();
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [customer?.name, customer?.phone, customer?.address]);

  const runCheck = async () => {
    if (!canRun) return;
    setLoading(true);
    setResult(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const nameQ = (customer.name || '').trim().toLowerCase();

      const matched = rentals.filter(r => (r.customerName || '').toLowerCase() === nameQ);
      const overdue = matched.filter(r => r.status === 'out' && r.endDate < today);
      const active  = matched.filter(r => ['out', 'contract', 'reservation'].includes(r.status));
      const longOverdue = matched.filter(r => r.status === 'out' && r.endDate < new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);

      // Address cross-reference (chop shop check)
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

      // Third-party contractor scheme: billing ≠ worksite + new customer
      const billingAddr = (customer.address || '').toLowerCase().trim();
      const worksiteAddr = (customer.worksiteAddress || '').toLowerCase().trim();
      const addressMismatch = billingAddr.length > 3 && worksiteAddr.length > 3 && billingAddr !== worksiteAddr;
      const isNewCustomer = matched.length === 0;
      const contractorSchemeRisk = addressMismatch && isNewCustomer;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a risk assessment AI for an equipment rental counter in South Texas. 
A customer is at the counter right now. Give a quick risk assessment so the counter rep knows how to proceed.

CUSTOMER: ${customer.name}
Phone: ${customer.phone || 'not provided'}
Address: ${[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ') || 'not provided'}
Worksite/Delivery Address: ${customer.worksiteAddress ? [customer.worksiteAddress, customer.worksiteCity, customer.worksiteState].filter(Boolean).join(', ') : 'same as billing'}
ID Verified via DL Scan: ${customer._dlVerified ? `YES — DL last 4: ${customer._dlLast4}, exp: ${customer._dlExpiry}` : 'NO — manual entry'}
ID Expired: ${customer._dlVerified && customer._dlExpiry ? (new Date(customer._dlExpiry) < new Date() ? 'YES - EXPIRED' : 'No') : 'Unknown'}

ACCOUNT FLAGS:
- Blacklisted: ${customer._blacklisted ? 'YES' : 'No'}
- Credit Hold: ${customer._creditHold ? `YES — ${customer._creditHoldReason || 'no reason given'}` : 'No'}
- Tax Exempt: ${customer._taxExempt ? 'Yes' : 'No'}

RENTAL HISTORY (${matched.length} total rentals):
- Currently overdue (past due date): ${overdue.length}
- Active rentals right now: ${active.length}
- Long overdue (7+ days late): ${longOverdue.length}
- Recent rentals: ${matched.slice(0, 5).map(r => `${r.invoiceNumber || '—'} ${r.equipmentName} (${r.status})`).join(', ') || 'None'}

ADDRESS CROSS-REFERENCE:
- Other customers who used same address: ${addressOtherCustomers.length > 0 ? addressOtherCustomers.join(', ') : 'None found'}
- Total rentals to this address: ${addressMatchCount}

SCHEME DETECTION:
- Billing/worksite address mismatch on new customer: ${contractorSchemeRisk ? 'YES — POTENTIAL THIRD-PARTY CONTRACTOR SCHEME. Equipment delivered to worksite but billed to different address. Verify the person receiving equipment is authorized.' : 'No'}

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

      const fullResult = {
        ...res,
        matchedCount: matched.length,
        overdueCount: overdue.length,
        activeCount: active.length,
        addressMatchCount,
        addressOtherCustomers,
        contractorSchemeRisk,
      };

      setResult(fullResult);

      // Auto-expand on high/reject risk
      if (['high', 'reject'].includes(res.riskLevel) || res.callManager) {
        setOpen(true);
      }
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

  return (
    <div className={`rounded-lg border transition-all ${hasCriticalFlag ? 'border-red-400 bg-red-50' : hasWarningFlag ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
      {/* Header — always visible, shows status */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-black/5 rounded-lg transition"
      >
        <ShieldAlert className={`w-4 h-4 flex-shrink-0 ${hasCriticalFlag ? 'text-red-600' : hasWarningFlag ? 'text-amber-600' : loading ? 'text-indigo-400' : 'text-gray-400'}`} />
        <span className="flex-1 text-left flex items-center gap-2 flex-wrap">
          Risk Check
          {loading && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
          {!loading && result && !result.error && <RiskBadge level={result.riskLevel} />}
          {!loading && result?.callManager && (
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full animate-pulse">📞 CALL MANAGER</span>
          )}
          {!loading && !result && hasCriticalFlag && (
            <span className="text-xs font-bold text-red-700">🚫 BLACKLISTED</span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Contractor scheme banner — always visible when flagged, no click required */}
      {result?.contractorSchemeRisk && (
        <div className="mx-3 mb-2 flex items-start gap-2 bg-red-100 border border-red-300 text-red-800 text-xs font-semibold rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ⚠️ Billing & delivery address differ on a new customer — verify who receives the equipment. Possible third-party contractor scheme.
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
          {!canRun && <p className="text-xs text-gray-400">Enter customer name to run a risk check.</p>}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-indigo-700">
              <Loader2 className="w-4 h-4 animate-spin" /> Analyzing customer history…
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

              {result.summary && <p className="text-xs text-gray-700">{result.summary}</p>}

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

          {/* Re-run + External checks */}
          <div className="flex items-center gap-2 flex-wrap">
            {result && !loading && (
              <button
                onClick={runCheck}
                className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-3 py-1.5 rounded-lg transition"
              >
                ↻ Re-run
              </button>
            )}
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

          {externalCheck?.twilioLookup && (
            <div className={`rounded-lg border p-2.5 text-xs space-y-1 ${externalCheck.twilioLookup.isFraudRisk ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">📱 Phone Intelligence:</span>
                <span className={`font-bold uppercase px-1.5 py-0.5 rounded ${externalCheck.twilioLookup.phoneType === 'voip' ? 'bg-red-100 text-red-700' : externalCheck.twilioLookup.phoneType === 'prepaid' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {externalCheck.twilioLookup.phoneType || 'unknown'}
                </span>
                {externalCheck.twilioLookup.isFraudRisk
                  ? <span className="font-bold text-red-700">⚠️ Possible burner phone</span>
                  : <span className="font-semibold text-green-700">✓ Not a burner phone</span>
                }
              </div>
              {externalCheck.twilioLookup.carrier && (
                <div className="text-gray-600"><span className="font-semibold">Carrier:</span> {externalCheck.twilioLookup.carrier}</div>
              )}
              {externalCheck.twilioLookup.isFraudRisk && (
                <div className="text-red-700 font-medium">VOIP/prepaid numbers are commonly used in rental fraud schemes.</div>
              )}
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