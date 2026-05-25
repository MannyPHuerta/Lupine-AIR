import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Upload, Download, Loader2, CheckCircle } from 'lucide-react';

export default function DemoManager() {
  const [branch, setBranch] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [wipingBranch, setWipingBranch] = useState(false);

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