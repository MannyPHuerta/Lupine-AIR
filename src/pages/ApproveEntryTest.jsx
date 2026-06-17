import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function ApproveEntryTest() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const { supabase } = await import('@/api/supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();
        setToken(session?.access_token || null);
        console.log('[Test] Token:', session?.access_token ? '✅ Present' : '❌ Missing');
      } catch (e) {
        console.error('[Test] Token error:', e);
      }
    };
    getToken();
  }, []);

  const testApprove = async () => {
    setLoading(true);
    setResult(null);
    
    // Get first pending entry
    const { supabase } = await import('@/api/supabaseClient');
    const { data: entry } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!entry) {
      setResult({ error: 'No pending entries found' });
      setLoading(false);
      return;
    }

    console.log('[Test] Testing approve for:', entry.email);

    try {
      const startTime = Date.now();
      const response = await fetch('https://theprojectair.com/api/approve-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          entryId: entry.id,
          notes: `Test approval from diagnostic page at ${new Date().toLocaleTimeString()}`,
        }),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      const data = await response.json();
      setResult({
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });
      console.log('[Test] Response:', data);
    } catch (e) {
      setResult({ error: e.message, stack: e.stack });
      console.error('[Test] Error:', e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Approve Entry API Test</h1>
          <p className="text-slate-500 mb-4">Test the /api/approve-entry endpoint directly</p>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              {token ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
              <span>Auth Token: {token ? 'Present' : 'Missing'}</span>
            </div>
          </div>

          <Button onClick={testApprove} disabled={loading || !token} className="w-full">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Testing...</> : 'Test Approval (First Pending Entry)'}
          </Button>
        </div>

        {result && (
          <div className={`rounded-xl p-6 border ${result.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <h2 className="font-bold mb-3">Response</h2>
            <pre className="text-xs bg-white rounded-lg p-4 overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}