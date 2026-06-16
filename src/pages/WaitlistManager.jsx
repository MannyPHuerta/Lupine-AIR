import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Clock, Users, Building2, Phone, Mail,
  GitBranch, Calendar, RefreshCw, Plus, Search, ExternalLink
} from 'lucide-react';

const API_BASE = 'https://theprojectair.com/api/waitlist-manager';

const callApi = async (body) => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const trialStatusColors = {
  invited: 'bg-blue-100 text-blue-800 border-blue-200',
  trial: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  core: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  active: 'bg-green-100 text-green-800 border-green-200',
  suspended: 'bg-orange-100 text-orange-800 border-orange-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

function WaitlistCard({ entry, onApprove, onReject, processing }) {
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{entry.name || '—'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[entry.status] || statusColors.pending}`}>
              {entry.status}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
            <Mail className="w-3.5 h-3.5" />
            <span>{entry.email}</span>
          </div>
        </div>
        <div className="text-xs text-slate-400 whitespace-nowrap">
          {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
        {entry.company && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{entry.company}</span>
          </div>
        )}
        {entry.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{entry.phone}</span>
          </div>
        )}
        {entry.branches && (
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
            <span>{entry.branches} branch{entry.branches !== '1' ? 'es' : ''}</span>
          </div>
        )}
      </div>

      {entry.notes && (
        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          {entry.notes}
        </div>
      )}

      {entry.status === 'pending' && (
        <div className="space-y-2 pt-1">
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-slate-400 hover:text-slate-600 transition">
            {expanded ? '▲ Hide notes' : '▼ Add internal notes (optional)'}
          </button>
          {expanded && (
            <Textarea
              placeholder="Internal notes for this applicant..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm h-20 resize-none"
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onApprove(entry.id, notes)}
              disabled={processing === entry.id}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {processing === entry.id ? 'Approving…' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(entry.id)}
              disabled={processing === entry.id}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </Button>
          </div>
        </div>
      )}

      {entry.status === 'approved' && entry.approved_at && (
        <div className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" />
          Approved {new Date(entry.approved_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function TrialCard({ trial }) {
  const daysLeft = trial.trial_ends_at
    ? Math.ceil((new Date(trial.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{trial.contact_name || trial.company_name || '—'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${trialStatusColors[trial.status] || 'bg-slate-100 text-slate-600'}`}>
              {trial.status}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 font-medium">
              {trial.plan_tier}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-sm mt-0.5">
            <Mail className="w-3.5 h-3.5" />
            <span>{trial.email}</span>
          </div>
        </div>
        {daysLeft !== null && (
          <div className={`text-xs font-bold px-2 py-1 rounded-lg ${daysLeft > 3 ? 'bg-green-50 text-green-700' : daysLeft > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
        {trial.company_name && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{trial.company_name}</span>
          </div>
        )}
        {trial.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{trial.phone}</span>
          </div>
        )}
        {trial.trial_start_date && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Started {new Date(trial.trial_start_date).toLocaleDateString()}</span>
          </div>
        )}
        {trial.trial_ends_at && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Ends {new Date(trial.trial_ends_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {trial.notes && (
        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          {trial.notes}
        </div>
      )}
    </div>
  );
}

function AddLeadModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', branches: '1' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onAdd(form);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Add Manual Lead</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input type="email" required placeholder="Email *" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
          <Input placeholder="Branches (e.g. 1, 2-3)" value={form.branches} onChange={e => setForm(f => ({ ...f, branches: e.target.value }))} />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={loading} className="flex-1">{loading ? 'Adding…' : 'Add Lead'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WaitlistManager() {
  const [waitlist, setWaitlist] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [tab, setTab] = useState('waitlist');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddLead, setShowAddLead] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [debugData, setDebugData] = useState(null);

  // Debug: log state on render
  useEffect(() => {
    console.log('[WaitlistManager] State:', { waitlist: waitlist.length, trials: trials.length, statusFilter, tab });
  }, [waitlist, trials, statusFilter, tab]);

  const loadData = async () => {
    setLoading(true);
    console.log('[WaitlistManager] Calling API...');
    try {
      const data = await callApi({ action: 'list' });
      console.log('[WaitlistManager] Raw API response:', data);
      setDebugData(data);
      if (data.waitlist) {
        console.log('[WaitlistManager] Setting waitlist with', data.waitlist.length, 'entries');
        setWaitlist(data.waitlist);
      }
      if (data.trials) {
        console.log('[WaitlistManager] Setting trials with', data.trials.length, 'entries');
        setTrials(data.trials);
      }
    } catch (e) {
      console.error('[WaitlistManager] Load error:', e);
      setDebugData({ error: e.message });
    }
    setLoading(false);
  };

  useEffect(() => { 
    console.log('[WaitlistManager] Component mounted, loading data...');
    loadData(); 
  }, []);

  const handleApprove = async (entryId, notes) => {
    setProcessing(entryId);
    const result = await callApi({ action: 'approve', entryId, notes });
    setLastResult(result);
    await loadData();
    setProcessing(null);
  };

  const handleReject = async (entryId) => {
    setProcessing(entryId);
    await callApi({ action: 'reject', entryId });
    await loadData();
    setProcessing(null);
  };

  const handleAddLead = async (lead) => {
    await callApi({ action: 'addLead', lead });
    await loadData();
  };

  const filteredWaitlist = waitlist.filter(e => {
    const matchSearch = !search ||
      e.email?.toLowerCase().includes(search.toLowerCase()) ||
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredTrials = trials.filter(t =>
    !search ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = waitlist.filter(e => e.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Waitlist Manager</h1>
            <p className="text-slate-500 text-sm mt-0.5">Review and approve early access requests</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1">
              <Plus className="w-4 h-4" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Last result banner */}
        {lastResult && (
          <div className={`rounded-xl p-4 text-sm border ${lastResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {lastResult.success ? (
              <div className="space-y-1">
                <div className="font-semibold">Approved successfully</div>
                <div>Email sent: {lastResult.emailSent ? 'Yes' : 'No (check RESEND_API_KEY)'}</div>
                {lastResult.signInLink && (
                  <a href={lastResult.signInLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-green-700 hover:underline mt-1">
                    <ExternalLink className="w-3.5 h-3.5" /> View magic link
                  </a>
                )}
              </div>
            ) : (
              <div><span className="font-semibold">Error:</span> {lastResult.error}</div>
            )}
            <button onClick={() => setLastResult(null)} className="mt-2 text-xs underline opacity-60 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending Review', val: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Total Waitlist', val: waitlist.length, color: 'text-slate-700', bg: 'bg-white border-slate-200' },
            { label: 'Active Trials', val: trials.filter(t => ['invited', 'trial', 'active'].includes(t.status)).length, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
              <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {[
            { id: 'waitlist', label: 'Waitlist', icon: <Users className="w-4 h-4" />, count: waitlist.length },
            { id: 'trials', label: 'Trials', icon: <Clock className="w-4 h-4" />, count: trials.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {t.icon} {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-slate-100'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          {tab === 'waitlist' && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            Loading…
          </div>
        ) : tab === 'waitlist' ? (
          filteredWaitlist.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No entries found.</div>
          ) : (
            <div className="grid gap-3">
              {filteredWaitlist.map(entry => (
                <WaitlistCard
                  key={entry.id}
                  entry={entry}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  processing={processing}
                />
              ))}
            </div>
          )
        ) : (
          filteredTrials.length === 0 ? (
            <div className="text-center py-16 text-slate-400">No trials found.</div>
          ) : (
            <div className="grid gap-3">
              {filteredTrials.map(trial => (
                <TrialCard key={trial.id} trial={trial} />
              ))}
            </div>
          )
        )}
      </div>

      {showAddLead && (
        <AddLeadModal onClose={() => setShowAddLead(false)} onAdd={handleAddLead} />
      )}

      {/* Debug panel */}
      {debugData && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white p-4 rounded-lg text-xs max-w-md max-h-64 overflow-auto shadow-lg z-50">
          <div className="font-bold mb-2">Debug: API Response</div>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(debugData, null, 2)}
          </pre>
          <button onClick={() => setDebugData(null)} className="mt-2 text-slate-400 hover:text-white underline">Close</button>
        </div>
      )}
    </div>
  );
}
