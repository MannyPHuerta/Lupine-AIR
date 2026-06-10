import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Upload, Download, Loader2, CheckCircle, Zap, Copy, Mail } from 'lucide-react';

export default function DemoManager() {
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [wipingBranch, setWipingBranch] = useState(false);

  // Demo Sandbox state
  const [sandboxForm, setSandboxForm] = useState({ companyName: '', prospectEmail: '', sendEmail: false });
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResult, setSandboxResult] = useState(null);
  const [sandboxError, setSandboxError] = useState('');
  const [copied, setCopied] = useState('');

  const handleCreateSandbox = async () => {
    if (!sandboxForm.companyName.trim()) {
      setSandboxError('Company name is required');
      return;
    }
    setSandboxLoading(true);
    setSandboxError('');
    setSandboxResult(null);
    try {
      const res = await base44.functions.invoke('createDemoSandbox', sandboxForm);
      setSandboxResult(res.data);
    } catch (err) {
      setSandboxError(err.message);
    } finally {
      setSandboxLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleWipeBranch = async () => {
    if (!branch.trim()) {
      setMessage('Please enter a branch name');
      return;
    }
    setWipingBranch(true);
    setMessage('');
    try {
      const res = await base44.functions.invoke('wipeBranch', { branch });
      setMessage(`✓ ${res.data.message} (${res.data.recordsDeleted} records deleted)`);
      setBranch('');
    } catch (err) {
      setMessage(`✗ ${err.message}`);
    } finally {
      setWipingBranch(false);
    }
  };

  const handleExport = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const res = await base44.functions.invoke('exportAllData', {});
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `golden-master-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('✓ Golden master exported');
      setStatus('done');
    } catch (err) {
      setMessage(`✗ ${err.message}`);
      setStatus('error');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('loading');
    setMessage('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await base44.functions.invoke('importDataSnapshot', { entities: data.entities });
      setMessage(`✓ Import complete — ${JSON.stringify(res.data.results)}`);
      setStatus('done');
    } catch (err) {
      setMessage(`✗ ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <div>
      <AppPageHeader
        title="Demo Mode Manager"
        subtitle="Export golden master, wipe demo branches, restore from backups"
      />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">

        {/* Create Demo Sandbox */}
        <div className="bg-white rounded-xl border-2 border-indigo-300 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-indigo-900">Create Demo Sandbox</h2>
            <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">One-Click</span>
          </div>
          <p className="text-sm text-gray-600">
            Provision a fully-loaded tenant with demo data (equipment, customers, rentals) and generate instant login credentials.
          </p>

          {!sandboxResult ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Company name (e.g. Acme Rentals)"
                  value={sandboxForm.companyName}
                  onChange={e => setSandboxForm(f => ({ ...f, companyName: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="email"
                  placeholder="Prospect email (optional — to send credentials)"
                  value={sandboxForm.prospectEmail}
                  onChange={e => setSandboxForm(f => ({ ...f, prospectEmail: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {sandboxForm.prospectEmail && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sandboxForm.sendEmail}
                      onChange={e => setSandboxForm(f => ({ ...f, sendEmail: e.target.checked }))}
                      className="rounded"
                    />
                    <Mail className="w-4 h-4" /> Send email
                  </label>
                )}
              </div>
              {sandboxError && (
                <div className="text-sm bg-red-50 text-red-700 px-3 py-2 rounded-lg">{sandboxError}</div>
              )}
              <Button onClick={handleCreateSandbox} disabled={sandboxLoading} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                {sandboxLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Provisioning...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Create Demo Environment</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-800 font-semibold">
                  <CheckCircle className="w-5 h-5" /> Demo environment ready for <span className="text-indigo-700">{sandboxResult.companyName}</span>
                </div>
                {[
                  { label: 'Login URL', value: sandboxResult.loginUrl, key: 'url' },
                  { label: 'Email', value: sandboxResult.adminEmail, key: 'email' },
                  { label: 'Password', value: sandboxResult.adminPassword, key: 'pass' },
                ].map(({ label, value, key }) => (
                  <div key={key} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                    <div>
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="text-sm font-mono font-semibold text-gray-900">{value}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className="ml-3 text-gray-400 hover:text-indigo-600 transition"
                      title="Copy"
                    >
                      {copied === key ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(`Login: ${sandboxResult.loginUrl}\nEmail: ${sandboxResult.adminEmail}\nPassword: ${sandboxResult.adminPassword}`, 'all')}
                  className="gap-2 text-sm"
                >
                  <Copy className="w-4 h-4" /> {copied === 'all' ? 'Copied!' : 'Copy All Credentials'}
                </Button>
                <Button variant="outline" onClick={() => { setSandboxResult(null); setSandboxForm({ companyName: '', prospectEmail: '', sendEmail: false }); }} className="text-sm">
                  + New Sandbox
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Wipe Branch */}
        <div className="bg-white rounded-xl border-2 border-red-300 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-red-900">Wipe Demo Branch</h2>
          </div>
          <p className="text-sm text-gray-600">
            Delete all rentals, deliveries, work orders, and branch-scoped data for a specific branch.
            Use this after a prospect demo to reset the environment.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="e.g. 01 McAllen"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <Button
              onClick={handleWipeBranch}
              disabled={wipingBranch}
              variant="destructive"
              className="gap-2"
            >
              {wipingBranch ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Wiping...</>
              ) : (
                <><Trash2 className="w-4 h-4" /> Wipe</>
              )}
            </Button>
          </div>
          {message && (
            <div className={`text-sm px-3 py-2 rounded-lg ${message.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}
        </div>

        {/* Export Golden Master */}
        <div className="bg-white rounded-xl border-2 border-blue-300 p-6 space-y-4">
          <h2 className="font-bold text-blue-900 flex items-center gap-2">
            <Download className="w-5 h-5" /> Export Golden Master
          </h2>
          <p className="text-sm text-gray-600">
            Download a full JSON snapshot of all entities (equipment, customers, rentals, etc.).
            Save as <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">golden-master-v1.json</code> for use as a restoration template.
          </p>
          <Button onClick={handleExport} disabled={status === 'loading'} className="gap-2">
            {status === 'loading' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4" /> Export All Data</>
            )}
          </Button>
          {status === 'done' && message && (
            <div className="text-sm bg-green-50 text-green-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {message}
            </div>
          )}
        </div>

        {/* Import from Backup */}
        <div className="bg-white rounded-xl border-2 border-green-300 p-6 space-y-4">
          <h2 className="font-bold text-green-900 flex items-center gap-2">
            <Upload className="w-5 h-5" /> Import from Golden Master
          </h2>
          <p className="text-sm text-gray-600">
            Upload a <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">golden-master-*.json</code> file to restore data.
            Use this to populate a fresh subscriber instance with your standard catalog and demo data.
          </p>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={status === 'loading'}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
            />
          </div>
          {status === 'done' && message && (
            <div className="text-sm bg-green-50 text-green-700 px-3 py-2 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {message}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Admin access required. Wipe operations are permanent and cannot be undone.
        </p>
      </div>
    </div>
  );
}