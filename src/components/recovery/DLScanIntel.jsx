/**
 * DLScanIntel — Scan a driver's license and cross-reference against
 * rental history, address patterns, and known risk indicators.
 * Used inside both TheftIntelPanel and ThreatWatchPanel.
 */
import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useDLScanner } from '@/hooks/useDLScanner';
import { Loader2, CreditCard, User, MapPin, AlertTriangle, CheckCircle2, Scan, RefreshCw, ShieldAlert } from 'lucide-react';

function Field({ label, value, highlight }) {
  if (!value) return null;
  return (
    <div className={`flex flex-col ${highlight ? 'bg-amber-50 border border-amber-200 rounded p-2' : ''}`}>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-amber-900' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

export default function DLScanIntel({ rentals }) {
  const [scannedDL, setScannedDL] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);

  const handleScan = useCallback((parsed) => {
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 800);
    setScannedDL(parsed);
    setAnalysisResult(null);
    // Auto-run analysis
    runAnalysis(parsed);
  }, [rentals]); // eslint-disable-line react-hooks/exhaustive-deps

  useDLScanner(handleScan);

  const runAnalysis = async (dl) => {
    if (!dl) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      // Cross-reference against rental history
      const nameVariants = [
        dl.fullName?.toLowerCase(),
        `${dl.firstName} ${dl.lastName}`.toLowerCase(),
        `${dl.lastName}, ${dl.firstName}`.toLowerCase(),
      ].filter(Boolean);

      const matchedRentals = rentals.filter(r => {
        const cn = (r.customerName || '').toLowerCase();
        return nameVariants.some(n => cn.includes(n.split(' ')[0]) && cn.includes(n.split(' ').slice(-1)[0]));
      });

      const addressMatches = rentals.filter(r => {
        if (!dl.address) return false;
        const addr = dl.address.toLowerCase();
        return (r.customerAddress || '').toLowerCase().includes(addr.split(' ')[1] || addr) ||
               (r.worksiteAddress || '').toLowerCase().includes(addr.split(' ')[1] || addr);
      });

      // Check for overdue rentals by this person
      const today = new Date().toISOString().split('T')[0];
      const overdueMatched = matchedRentals.filter(r => r.status === 'out' && r.endDate < today);
      const activeMatched = matchedRentals.filter(r => ['out', 'reservation', 'contract'].includes(r.status));

      // Phone cross-ref — check if same phone used by many different names
      const sharedPhones = {};
      rentals.forEach(r => {
        if (!r.customerPhone) return;
        const p = r.customerPhone.replace(/\D/g, '');
        if (!sharedPhones[p]) sharedPhones[p] = new Set();
        sharedPhones[p].add((r.customerName || '').toLowerCase());
      });

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a theft prevention AI for an equipment rental company in South Texas. 
A customer just presented this driver's license for a rental transaction. Assess their risk profile.

SCANNED ID:
- Name: ${dl.fullName}
- DOB: ${dl.dob}
- Address: ${dl.address}, ${dl.city}, ${dl.state} ${dl.zip}
- DL#: ***${dl.dlLast4} (${dl.state})
- ID Expired: ${dl.isExpired ? 'YES — EXPIRED ID' : 'No'}
- Sex: ${dl.sex} | Height: ${dl.height} | Eyes: ${dl.eyeColor}

RENTAL HISTORY MATCH (${matchedRentals.length} rentals found under this name):
${matchedRentals.slice(0, 10).map(r => `- ${r.invoiceNumber || 'No#'}: ${r.equipmentName} | ${r.status} | ${r.branch} | Due: ${r.endDate || 'N/A'}`).join('\n') || 'No prior rental history found'}

OVERDUE RENTALS: ${overdueMatched.length} currently overdue
ACTIVE RENTALS: ${activeMatched.length} currently active

ADDRESS CROSS-REFERENCE: ${addressMatches.length} other rentals linked to this address
${addressMatches.length > 0 ? addressMatches.slice(0, 5).map(r => `  - ${r.customerName}: ${r.equipmentName} (${r.status})`).join('\n') : ''}

Flags to evaluate:
1. Expired ID
2. Overdue rentals under same name
3. Multiple customers at same address (possible chop shop)
4. Name/address inconsistency with TX service area
5. No prior rental history (unknown risk)
6. High-value equipment targeting pattern

Provide a risk assessment for this customer at the counter right now.`,
        response_json_schema: {
          type: 'object',
          properties: {
            riskLevel: { type: 'string', enum: ['clear', 'low', 'medium', 'high', 'reject'] },
            riskScore: { type: 'number' },
            summary: { type: 'string' },
            flags: { type: 'array', items: { type: 'string' } },
            counterAction: { type: 'string' },
            requiresDeposit: { type: 'boolean' },
            suggestedDepositAmount: { type: 'number' },
            callManager: { type: 'boolean' },
          }
        }
      });

      setAnalysisResult({
        ...res,
        matchedRentals,
        overdueCount: overdueMatched.length,
        activeCount: activeMatched.length,
        addressMatchCount: addressMatches.length,
      });
    } catch (err) {
      setAnalysisResult({ error: err.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColors = {
    clear:  { bg: 'bg-green-50 border-green-400', badge: 'bg-green-600 text-white', text: 'text-green-800' },
    low:    { bg: 'bg-blue-50 border-blue-300',   badge: 'bg-blue-500 text-white',   text: 'text-blue-800' },
    medium: { bg: 'bg-amber-50 border-amber-400', badge: 'bg-amber-500 text-white', text: 'text-amber-800' },
    high:   { bg: 'bg-red-50 border-red-400',     badge: 'bg-red-600 text-white',   text: 'text-red-800' },
    reject: { bg: 'bg-red-100 border-red-600',    badge: 'bg-red-800 text-white',   text: 'text-red-900' },
  };

  const riskEmoji = { clear: '✅', low: '🟡', medium: '🟠', high: '🔴', reject: '🚫' };

  const cfg = riskColors[analysisResult?.riskLevel] || riskColors.low;

  return (
    <div className="space-y-4">
      {/* Scanner listener indicator */}
      <div className={`rounded-xl border-2 p-5 transition-all ${scanFlash ? 'border-green-400 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${scanFlash ? 'bg-green-500' : 'bg-gray-200'} transition-colors`}>
            <Scan className={`w-5 h-5 ${scanFlash ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="font-bold text-gray-900">
              {scanFlash ? '✅ ID Scanned!' : '🪪 Ready to Scan Driver\'s License'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {scannedDL
                ? `Last scan: ${scannedDL.fullName} — scan again to replace`
                : 'Point scanner at the PDF417 barcode on the back of any US driver\'s license'}
            </div>
          </div>
          {scannedDL && (
            <button
              onClick={() => { setScannedDL(null); setAnalysisResult(null); }}
              className="ml-auto p-2 text-gray-400 hover:text-gray-600 transition"
              title="Clear scan"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scanned ID details */}
      {scannedDL && (
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-gray-900">Scanned Identity</span>
            {scannedDL.isExpired && (
              <span className="ml-auto text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">⚠️ EXPIRED ID</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Full Name" value={scannedDL.fullName} />
            <Field label="Date of Birth" value={scannedDL.dob} />
            <Field label="DL # (last 4)" value={`***${scannedDL.dlLast4} (${scannedDL.state})`} />
            <Field label="Address" value={scannedDL.address} highlight={!!scannedDL.address} />
            <Field label="City / State / Zip" value={`${scannedDL.city}, ${scannedDL.state} ${scannedDL.zip}`} />
            <Field label="ID Expiry" value={scannedDL.expiry} highlight={scannedDL.isExpired} />
            {scannedDL.height && <Field label="Height / Eyes" value={`${scannedDL.height} / ${scannedDL.eyeColor}`} />}
          </div>

          {!analysisResult && !analyzing && (
            <button
              onClick={() => runAnalysis(scannedDL)}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition text-sm"
            >
              <ShieldAlert className="w-4 h-4" /> Run Risk Check
            </button>
          )}
        </div>
      )}

      {/* Analysis in progress */}
      {analyzing && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin flex-shrink-0" />
          <div className="text-sm text-indigo-800 font-medium">Cross-referencing identity against rental history…</div>
        </div>
      )}

      {/* Risk result */}
      {analysisResult && !analysisResult.error && (
        <div className={`rounded-xl border-2 p-5 ${cfg.bg}`}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{riskEmoji[analysisResult.riskLevel] || '⚠️'}</span>
              <div>
                <div className="font-bold text-gray-900 text-base">
                  {analysisResult.riskLevel === 'reject' ? 'DO NOT RENT' :
                   analysisResult.riskLevel === 'high' ? 'High Risk — Manager Approval' :
                   analysisResult.riskLevel === 'medium' ? 'Elevated Risk — Use Caution' :
                   analysisResult.riskLevel === 'low' ? 'Low Risk' : 'Customer Clear'}
                </div>
                <div className={`text-xs ${cfg.text}`}>{analysisResult.summary}</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className={`text-2xl font-black ${cfg.text}`}>{analysisResult.riskScore}</div>
              <div className="text-xs text-gray-400">Risk Score</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <div className={`text-lg font-bold ${analysisResult.matchedRentals?.length > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                {analysisResult.matchedRentals?.length || 0}
              </div>
              <div className="text-[10px] text-gray-500">Prior Rentals</div>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <div className={`text-lg font-bold ${analysisResult.overdueCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                {analysisResult.overdueCount || 0}
              </div>
              <div className="text-[10px] text-gray-500">Overdue</div>
            </div>
            <div className="bg-white/70 rounded-lg p-2 text-center">
              <div className={`text-lg font-bold ${analysisResult.addressMatchCount > 1 ? 'text-amber-700' : 'text-gray-400'}`}>
                {analysisResult.addressMatchCount || 0}
              </div>
              <div className="text-[10px] text-gray-500">Addr. Matches</div>
            </div>
          </div>

          {/* Flags */}
          {analysisResult.flags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {analysisResult.flags.map((f, i) => (
                <span key={i} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  ⚑ {f}
                </span>
              ))}
            </div>
          )}

          {/* Counter action */}
          {analysisResult.counterAction && (
            <div className={`rounded-lg p-3 border font-semibold text-sm ${analysisResult.callManager ? 'bg-red-100 border-red-300 text-red-900' : 'bg-white border-gray-200 text-gray-800'}`}>
              {analysisResult.callManager && <span className="text-red-700 font-bold">📞 CALL MANAGER — </span>}
              {analysisResult.counterAction}
            </div>
          )}

          {/* Deposit recommendation */}
          {analysisResult.requiresDeposit && analysisResult.suggestedDepositAmount > 0 && (
            <div className="mt-2 bg-amber-100 border border-amber-300 rounded-lg p-2 text-sm text-amber-900 font-semibold">
              💰 Collect additional deposit: <span className="text-lg">${analysisResult.suggestedDepositAmount.toLocaleString()}</span>
            </div>
          )}

          {/* Prior rental history */}
          {analysisResult.matchedRentals?.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Rental History</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {analysisResult.matchedRentals.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/70 rounded px-2 py-1 text-xs">
                    <span className="font-mono text-indigo-600">{r.invoiceNumber || '—'}</span>
                    <span className="text-gray-600 truncate mx-2">{r.equipmentName}</span>
                    <span className={`font-semibold ${r.status === 'out' ? 'text-amber-700' : r.status === 'completed' ? 'text-green-700' : 'text-gray-500'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {analysisResult?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">Error: {analysisResult.error}</div>
      )}

      {!scannedDL && !scanFlash && (
        <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div className="font-medium text-gray-500">Scan a driver's license to run a real-time risk check</div>
          <div className="text-xs mt-1">Works with any USB barcode scanner (PDF417 / AAMVA standard)</div>
        </div>
      )}
    </div>
  );
}