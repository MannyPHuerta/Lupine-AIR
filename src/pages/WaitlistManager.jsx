import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  CheckCircle, XCircle, Clock, Users, Building2, Phone, Mail,
  GitBranch, Calendar, RefreshCw, Plus, Search, ExternalLink
} from 'lucide-react';

// Supabase client not needed here — all data comes from the API endpoint

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
