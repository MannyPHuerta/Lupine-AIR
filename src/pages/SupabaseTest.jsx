import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Database, RefreshCw } from 'lucide-react';

export default function SupabaseTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('testSupabaseConnection', {});
      setResult(res.data);
    } catch (err) {
      setResult({ success: false, connected: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ ok }) => ok
    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-20 px-4">
      <div className="bg-white rounded-2xl border shadow-sm w-full max-w-lg p-8 space-y-6">

        <div className="flex items-center gap-3">
          <Database className="w-7 h-7 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Supabase Connection Test</h1>
            <p className="text-sm text-gray-500">Verify your Supabase instance is reachable</p>
          </div>
        </div>

        <Button onClick={runTest} disabled={loading} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Testing...' : 'Run Connection Test'}
        </Button>

        {result && (
          <div className="space-y-4">
            {/* Overall status */}
            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${result.connected ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <StatusIcon ok={result.connected} />
              <div>
                <div className={`font-semibold text-sm ${result.connected ? 'text-emerald-800' : 'text-red-800'}`}>
                  {result.connected ? '✅ Connected successfully' : '❌ Connection failed'}
                </div>
                {result.supabaseUrl && (
                  <div className="text-xs text-gray-500 mt-0.5">{result.supabaseUrl}</div>
                )}
              </div>
            </div>

            {/* Error */}
            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-mono break-all">
                {result.error}
              </div>
            )}

            {/* Tables */}
            {result.connected && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StatusIcon ok={!result.tableError} />
                  <span className="text-sm font-semibold text-gray-700">
                    Public Tables ({result.tableCount ?? 0} found)
                  </span>
                </div>
                {result.tableError && (
                  <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                    Note: {result.tableError}
                  </div>
                )}
                {result.tables?.length > 0 && (
                  <div className="bg-gray-50 rounded-xl border px-4 py-3 flex flex-wrap gap-2">
                    {result.tables.map(t => (
                      <span key={t} className="bg-white border rounded-md px-2 py-0.5 text-xs font-mono text-gray-700">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {result.tables?.length === 0 && !result.tableError && (
                  <div className="text-xs text-gray-400 italic px-1">No public tables found — schema may not be deployed yet.</div>
                )}
              </div>
            )}

            {/* Ping */}
            {result.connected && (
              <div className="flex items-center gap-2">
                <StatusIcon ok={!result.pingError} />
                <span className="text-sm text-gray-700">
                  {result.pingError
                    ? `Ping: ${result.pingError}`
                    : `Ping OK${result.ping ? ` — ${String(result.ping).slice(0, 60)}` : ''}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}