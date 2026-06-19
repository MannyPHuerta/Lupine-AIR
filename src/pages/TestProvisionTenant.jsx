import { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

export default function TestProvisionTenant() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [email, setEmail] = useState('manny@rentalworld.com');
  const [tenantName, setTenantName] = useState('Rental World');
  const [branchName, setBranchName] = useState('McAllen');

  const handleProvision = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in first at /ops');
      
      const response = await fetch('/api/provisionTenant', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          companyName: tenantName,
          industry: 'both',
          phone: '(956) 555-0100',
          branchName,
          invoicePrefix: 'RNT',
          branchAddress: '123 Main St',
          branchPhone: '(956) 555-0100',
          branchEmail: email,
          planTier: 'pro',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to provision');
      setResult({ success: true, data, message: 'Tenant created! Try signing in again at /ops' });
    } catch (err) {
      setResult({ success: false, error: err.message });
    }
    setLoading(false);
  };

  const handleCheckTenant = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/resolveTenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setResult({ success: true, data, message: data.tenant ? `Found tenant: ${data.tenant.slug}` : 'No tenant found' });
    } catch (err) {
      setResult({ success: false, error: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Tenant Provision Test</h1>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Admin Email</label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Tenant Name</label>
            <Input
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Branch Name</label>
            <Input
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleCheckTenant}
              disabled={loading}
              variant="outline"
              className="flex-1 border-slate-700"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : 'Check Tenant'}
            </Button>
            <Button
              onClick={handleProvision}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning…</> : 'Provision'}
            </Button>
          </div>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'} border`}>
            <p className="font-semibold mb-2">{result.message || (result.success ? '✅ Success' : '❌ Error')}</p>
            <pre className="text-xs whitespace-pre-wrap">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
        
        <p className="text-xs text-slate-400 text-center">
          1. Sign in at <a href="/ops" className="text-blue-400 underline">/ops</a> first<br/>
          2. Check if tenant exists<br/>
          3. If not, provision a new tenant<br/>
          4. Sign in again to be redirected to your workspace
        </p>
      </div>
    </div>
  );
}