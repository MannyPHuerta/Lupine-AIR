import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/api/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Users, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Plus, Zap } from 'lucide-react';

const STATUS_STYLE = {
  pending:  'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const TRIAL_STATUS_STYLE = {
  invited:   'bg-blue-100 text-blue-800',
  trial:     'bg-green-100 text-green-800',
  core:      'bg-amber-100 text-amber-800',
  active:    'bg-emerald-100 text-emerald-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const EMPTY_LEAD = { name: '', email: '', phone: '', company: '', branches: '' };

export default function WaitlistManager() {
  const [activeTab, setActiveTab] = useState('waitlist');
  const [entries, setEntries] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [approveEntry, setApproveEntry] = useState(null);
  const [approveNotes, setApproveNotes] = useState('');
  const [approving, setApproving] = useState(false);

  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState(EMPTY_LEAD);
  const [savingLead, setSavingLead] = useState(false);

  const callApi = async (action, extra = {}) => {
    const res = await fetch('/api/waitlist-manager', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok || data?.error) throw new Error(data?.error || 'API call failed');
    return data;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callApi('list');
      setEntries(data?.waitlist || []);
      setTrials(data?.trials || []);
    } catch (err) {
      setError('Failed to load: ' + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Get current user
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
  }, []);

  const handleApprove = async () => {
    if (!approveEntry) return;
    setApproving(true);
    try {
      await callApi('approve', { entryId: approveEntry.id, notes: approveNotes });
      await loadData();
      setApproveEntry(null);
      setApproveNotes('');
    } catch (err) {
      alert('Approval failed: ' + err.message);
    }
    setApproving(false);
  };

  const handleReject = async (entry) => {
    if (!confirm(`Reject ${entry.name || entry.email}?`)) return;
    try {
      await callApi('reject', { entryId: entry.id });
      await loadData();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleGrantDemo = async (entry) => {
    if (!confirm(`Send demo access link to ${entry.name || entry.email}?`)) return;
    if (!supabase) {
      alert('Supabase not configured');
      return;
    }
    try {
      const res = await fetch('/api/grant-demo-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, adminEmail: user?.email }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || 'Failed');
      alert('✓ Demo access link sent!');
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleAddLead = async () => {
    if (!newLead.email) return alert('Email is required');
    setSavingLead(true);
    try {
      await callApi('addLead', { lead: newLead });
      setShowAddLead(false);
      setNewLead(EMPTY_LEAD);
      await loadData();
    } catch (err) {
      alert('Failed to add: ' + err.message);
    }
    setSavingLead(false);
  };

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const activeTrialCount = trials.filter(t => ['invited', 'trial'].includes(t.status)).length;
  const totalApproved = entries.filter(e => e.status === 'approved').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Waitlist & Trial Manager</h1>
          <p className="text-slate-500 text-sm mt-1">Review early access requests and monitor subscriber trial status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddLead(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Lead
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><div className="text-2xl font-black text-amber-700">{pendingCount}</div><div className="text-amber-600 text-sm font-medium">Pending Review</div></div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-green-600" /></div>
          <div><div className="text-2xl font-black text-green-700">{activeTrialCount}</div><div className="text-green-600 text-sm font-medium">Active Trials</div></div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-blue-600" /></div>
          <div><div className="text-2xl font-black text-blue-700">{totalApproved}</div><div className="text-blue-600 text-sm font-medium">Total Approved</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200">
        {[
          { id: 'waitlist', label: 'Waitlist Entries', count: entries.length },
          { id: 'trials', label: 'Subscriber Trials', count: trials.length },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {tab.label}
            <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {loading && <div className="p-10 text-center text-slate-400">Loading…</div>}

      {/* Waitlist Table */}
      {!loading && activeTab === 'waitlist' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {entries.length === 0 ? (
            <div className="p-10 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No waitlist entries yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowAddLead(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Add Lead Manually
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Contact', 'Company', 'Branches', 'Submitted', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(entry => (
                  <tr key={entry.id} className={`hover:bg-slate-50 transition ${entry.status === 'pending' ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{entry.name || '—'}</div>
                      <div className="text-slate-500 text-xs">{entry.email}</div>
                      {entry.phone && <div className="text-slate-400 text-xs">{entry.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">{entry.company || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.branches || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {entry.created_at ? format(new Date(entry.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_STYLE[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.status === 'pending' ? (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="text-cyan-700 border-cyan-300 hover:bg-cyan-50 gap-1"
                            onClick={() => handleGrantDemo(entry)}>
                            <Zap className="w-3.5 h-3.5" /> Demo
                          </Button>
                          <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 gap-1"
                            onClick={() => { setApproveEntry(entry); setApproveNotes(''); }}>
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50 gap-1"
                            onClick={() => handleReject(entry)}>
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {entry.approved_at ? format(new Date(entry.approved_at), 'MMM d') : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Trials Table */}
      {!loading && activeTab === 'trials' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {trials.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No trials yet. Approve a waitlist entry to create one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Subscriber', 'Plan', 'Pro Expires', 'Lockout', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trials.map(trial => {
                  const daysLeft = trial.trial_ends_at
                    ? Math.ceil((new Date(trial.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <tr key={trial.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{trial.contact_name || '—'}</div>
                        <div className="text-slate-500 text-xs">{trial.email}</div>
                        <div className="text-slate-400 text-xs">{trial.company_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                          {(trial.plan_tier || 'pro').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{trial.trial_ends_at || '—'}</div>
                        {daysLeft !== null && daysLeft > 0 ? (
                          <div className={`text-xs font-medium ${daysLeft <= 2 ? 'text-red-500' : daysLeft <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {daysLeft <= 2 && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                            {daysLeft}d left
                          </div>
                        ) : daysLeft !== null ? <div className="text-xs text-red-500 font-medium">Expired</div> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{trial.lockout_date || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${TRIAL_STATUS_STYLE[trial.status] || 'bg-gray-100 text-gray-600'}`}>
                          {trial.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Approve Modal */}
      <Dialog open={!!approveEntry} onOpenChange={() => setApproveEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Approve Early Access</DialogTitle></DialogHeader>
          {approveEntry && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1.5">
                <div><span className="text-slate-500">Name:</span> <strong>{approveEntry.name || '—'}</strong></div>
                <div><span className="text-slate-500">Email:</span> <strong>{approveEntry.email}</strong></div>
                <div><span className="text-slate-500">Company:</span> <strong>{approveEntry.company || '—'}</strong></div>
                <div><span className="text-slate-500">Branches:</span> <strong>{approveEntry.branches || '—'}</strong></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Internal Notes (optional)</label>
                <Textarea value={approveNotes} onChange={e => setApproveNotes(e.target.value)}
                  placeholder="e.g. Strong Pro candidate…" className="h-20 text-sm" />
              </div>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-xs text-cyan-800">
                <strong>What happens:</strong> A SubscriberTrial record is created and a welcome email with magic sign-in link is sent.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveEntry(null)} disabled={approving}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={handleApprove} disabled={approving}>
              <CheckCircle className="w-4 h-4" />
              {approving ? 'Approving…' : 'Approve & Send Welcome'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Lead Modal */}
      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Lead Manually</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { key: 'name', label: 'Full Name', placeholder: 'Jane Smith' },
              { key: 'email', label: 'Email *', placeholder: 'jane@acme.com' },
              { key: 'phone', label: 'Phone', placeholder: '(956) 555-1234' },
              { key: 'company', label: 'Company', placeholder: 'Acme Rentals' },
              { key: 'branches', label: 'Branches', placeholder: '3' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
                <Input value={newLead[f.key]} onChange={e => setNewLead(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button>
            <Button onClick={handleAddLead} disabled={savingLead}>
              {savingLead ? 'Saving…' : 'Add to Waitlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}