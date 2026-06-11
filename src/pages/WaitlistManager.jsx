import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

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

export default function WaitlistManager() {
  const [activeTab, setActiveTab] = useState('waitlist');
  const [approveEntry, setApproveEntry] = useState(null);
  const [notes, setNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ['waitlist-entries'],
    queryFn: () => base44.entities.WaitlistEntry.list('-created_date', 200),
  });

  const { data: trials = [], isLoading: loadingTrials } = useQuery({
    queryKey: ['subscriber-trials'],
    queryFn: () => base44.entities.SubscriberTrial.list('-created_date', 200),
  });

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const activeTrialCount = trials.filter(t => ['invited', 'trial'].includes(t.status)).length;
  const totalApproved = entries.filter(e => e.status === 'approved').length;

  const handleApprove = async () => {
    if (!approveEntry) return;
    setApproving(true);
    try {
      const res = await base44.functions.invoke('approveWaitlistEntry', {
        entryId: approveEntry.id,
        name: approveEntry.name,
        email: approveEntry.email,
        company: approveEntry.company,
        phone: approveEntry.phone,
        branches: approveEntry.branches,
        notes,
      });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['waitlist-entries'] });
      queryClient.invalidateQueries({ queryKey: ['subscriber-trials'] });
      setApproveEntry(null);
      setNotes('');
    } catch (err) {
      alert(err.message);
    }
    setApproving(false);
  };

  const handleReject = async (entry) => {
    if (!confirm(`Reject ${entry.name || entry.email}? This cannot be undone.`)) return;
    await base44.entities.WaitlistEntry.update(entry.id, {
      status: 'rejected',
      approvedBy: 'admin',
      approvedAt: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ['waitlist-entries'] });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Waitlist & Trial Manager</h1>
        <p className="text-slate-500 text-sm mt-1">Review early access requests and monitor subscriber trial status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">{pendingCount}</div>
            <div className="text-amber-600 text-sm font-medium">Pending Review</div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-green-700">{activeTrialCount}</div>
            <div className="text-green-600 text-sm font-medium">Active Trials</div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-700">{totalApproved}</div>
            <div className="text-blue-600 text-sm font-medium">Total Approved</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200">
        {[
          { id: 'waitlist', label: 'Waitlist Entries', count: entries.length },
          { id: 'trials', label: 'Subscriber Trials', count: trials.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Waitlist Table */}
      {activeTab === 'waitlist' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loadingEntries ? (
            <div className="p-10 text-center text-slate-400">Loading entries…</div>
          ) : entries.length === 0 ? (
            <div className="p-10 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No waitlist entries yet. They'll appear here when the form is submitted.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Contact</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Company</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Branches</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Submitted</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
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
                      {entry.created_date ? format(new Date(entry.created_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_STYLE[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.status === 'pending' ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50 gap-1"
                            onClick={() => { setApproveEntry(entry); setNotes(''); }}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-300 hover:bg-red-50 gap-1"
                            onClick={() => handleReject(entry)}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {entry.status === 'approved' && entry.approvedAt
                            ? `Approved ${format(new Date(entry.approvedAt), 'MMM d')}`
                            : entry.status === 'rejected' ? 'Rejected' : '—'}
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

      {/* Subscriber Trials Table */}
      {activeTab === 'trials' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loadingTrials ? (
            <div className="p-10 text-center text-slate-400">Loading trials…</div>
          ) : trials.length === 0 ? (
            <div className="p-10 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">No subscriber trials yet. Approve a waitlist entry to create one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Subscriber</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Pro Expires</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Lockout</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trials.map(trial => {
                  const trialEndsAt = new Date(trial.trialEndsAt);
                  const daysLeft = Math.ceil((trialEndsAt - new Date()) / (1000 * 60 * 60 * 24));
                  const isUrgent = daysLeft <= 2 && daysLeft > 0;
                  return (
                    <tr key={trial.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{trial.contactName || '—'}</div>
                        <div className="text-slate-500 text-xs">{trial.email}</div>
                        <div className="text-slate-400 text-xs">{trial.companyName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                          {(trial.planTier || 'pro').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{trial.trialEndsAt}</div>
                        {daysLeft > 0 && (
                          <div className={`text-xs font-medium ${isUrgent ? 'text-red-500' : daysLeft <= 5 ? 'text-amber-500' : 'text-slate-400'}`}>
                            {isUrgent && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                            {daysLeft}d left
                          </div>
                        )}
                        {daysLeft <= 0 && <div className="text-xs text-red-500 font-medium">Expired</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{trial.lockoutDate}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${TRIAL_STATUS_STYLE[trial.status] || 'bg-gray-100 text-gray-600'}`}>
                          {trial.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{trial.approvedBy || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Approve Confirmation Modal */}
      <Dialog open={!!approveEntry} onOpenChange={() => setApproveEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Early Access</DialogTitle>
          </DialogHeader>
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
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Referred by Rental World, strong Pro candidate…"
                  className="h-20 text-sm"
                />
              </div>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-xs text-cyan-800 leading-relaxed">
                <strong>What happens:</strong> We'll invite <strong>{approveEntry.email}</strong> to the platform and send them a welcome email explaining their 14-day Pro trial → Core → 30-day lockout timeline.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveEntry(null)} disabled={approving}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={handleApprove}
              disabled={approving}
            >
              <CheckCircle className="w-4 h-4" />
              {approving ? 'Approving…' : 'Approve & Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}