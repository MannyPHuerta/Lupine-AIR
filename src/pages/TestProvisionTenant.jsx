import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

export default function TestProvisionTenant() {
  const [status, setStatus] = useState('idle');
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    setStatus('testing');
    setError(null);
    setResponse(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session:', session);
      
      if (!session) {
        throw new Error('No active session - please sign in first');
      }

      const startTime = Date.now();
      const res = await fetch('/api/provisionTenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          companyName: 'Test Company',
          industry: 'both',
          phone: '(555) 123-4567',
          branchName: 'Test Branch',
          invoicePrefix: 'TST',
          branchAddress: '123 Test St',
          branchPhone: '(555) 123-4567',
          branchEmail: 'test@example.com',
          planTier: 'starter',
        }),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);
      
      const contentType = res.headers.get('content-type');
      console.log('Content-Type:', contentType);

      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
        console.log('JSON response:', data);
        setResponse({ status: res.status, duration: `${duration}ms`, data });
      } else {
        const text = await res.text();
        console.log('Non-JSON response:', text);
        throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 500)}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setStatus('success');
    } catch (err) {
      console.error('Test failed:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">ProvisionTenant API Test</h1>
        
        <button
          onClick={testAPI}
          disabled={status === 'testing'}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {status === 'testing' ? 'Testing...' : 'Test API'}
        </button>

        {status === 'success' && response && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="font-bold text-green-800">✓ Success</h2>
            <p className="text-sm text-green-700">Duration: {response.duration}</p>
            <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        )}

        {status === 'error' && error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <h2 className="font-bold text-red-800">✗ Error</h2>
            <pre className="mt-2 text-xs text-red-700 bg-white p-2 rounded overflow-auto">
              {error}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}