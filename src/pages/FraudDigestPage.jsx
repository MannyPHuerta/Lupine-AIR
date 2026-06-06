import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Mail, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';

export default function FraudDigestPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const runDigest = async () => {
    setRunning(true);
    setResult(null);
    const res = await base44.functions.invoke('fraudDigest', {});
    setResult(res.data);
    setRunning(false);
  };

  const riskColor = {
    CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/30',
    HIGH: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    LOW: 'text-green-400 bg-green-500/10 border-green-500/30',
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <AppPageHeader title="AI Fraud Digest" icon={Mail} />

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">

        {/* Info card */}
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6 space-y-3">
          <div className="text-white font-semibold">Weekly Fraud Digest</div>
          <p className="text-white/50 text-sm leading-relaxed">
            The fraud digest runs automatically every Monday at 8am CT and emails all admin users a full fraud intelligence report — 
            Benford's Law analysis, threshold clustering, cash invoice suppression, hour meter anomalies, and an AI narrative summary.
          </p>
          <p className="text-white/40 text-sm">
            Use the button below to manually trigger a digest right now and send it to all admin users.
          </p>

          <button
            onClick={runDigest}
            disabled={running}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg transition text-sm mt-2"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {running ? 'Running digest…' : 'Run Digest Now'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 space-y-4">
            {result.error ? (
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Error: {result.error}</span>
              </div>
            ) : result.skipped ? (
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Skipped: {result.reason}</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-semibold">Digest sent successfully to {result.sentTo} admin{result.sentTo !== 1 ? 's' : ''}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xl font-black text-cyan-400">{result.txCount}</div>
                    <div className="text-white/40 text-xs mt-1">Transactions</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xl font-black text-amber-400">{result.flaggedEmployees}</div>
                    <div className="text-white/40 text-xs mt-1">Flagged Employees</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-xl font-black text-violet-400">{result.sentTo}</div>
                    <div className="text-white/40 text-xs mt-1">Emails Sent</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center border ${riskColor[result.risk] || riskColor.LOW}`}>
                    <div className="text-xl font-black">{result.risk}</div>
                    <div className="text-xs mt-1 opacity-70">Overall Risk</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Schedule info */}
        <div className="bg-slate-900/50 border border-white/5 rounded-xl p-5">
          <div className="text-white/30 text-xs font-semibold uppercase tracking-widest mb-3">Automated Schedule</div>
          <div className="text-white/60 text-sm space-y-1">
            <div>🕗 Every <strong className="text-white/80">Monday at 8:00am CT</strong></div>
            <div>📧 Delivered to all users with <strong className="text-white/80">admin role</strong></div>
            <div>📊 Covers the <strong className="text-white/80">past 7 days</strong> of transactions</div>
          </div>
        </div>
      </div>
    </div>
  );
}