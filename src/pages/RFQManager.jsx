import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, CheckCircle2, XCircle, Trophy, Loader2, Search, Filter, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  received:    { label: 'Received',    color: 'bg-blue-100 text-blue-800' },
  analyzing:   { label: 'Analyzing',   color: 'bg-yellow-100 text-yellow-800' },
  draft:       { label: 'Draft',       color: 'bg-gray-100 text-gray-800' },
  review:      { label: 'In Review',   color: 'bg-purple-100 text-purple-800' },
  submitted:   { label: 'Submitted',   color: 'bg-indigo-100 text-indigo-800' },
  won:         { label: 'Won',         color: 'bg-green-100 text-green-800' },
  lost:        { label: 'Lost',        color: 'bg-red-100 text-red-800' },
  no_bid:      { label: 'No Bid',      color: 'bg-slate-100 text-slate-600' },
};

function daysUntilDue(dueDate) {
  if (!dueDate) return null;
  const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function RFQManager() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    base44.entities.RFQRecord.list('-created_date', 200).then(data => {
      setRfqs(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return rfqs.filter(r => {
      const matchesSearch = !search ||
        r.issuingOrg?.toLowerCase().includes(search.toLowerCase()) ||
        r.rfqNumber?.toLowerCase().includes(search.toLowerCase()) ||
        r.title?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rfqs, search, statusFilter]);

  const stats = useMemo(() => ({
    total: rfqs.length,
    open: rfqs.filter(r => ['received','analyzing','draft','review'].includes(r.status)).length,
    submitted: rfqs.filter(r => r.status === 'submitted').length,
    won: rfqs.filter(r => r.status === 'won').length,
    winRate: rfqs.filter(r => ['won','lost'].includes(r.status)).length > 0
      ? Math.round(rfqs.filter(r => r.status === 'won').length / rfqs.filter(r => ['won','lost'].includes(r.status)).length * 100)
      : 0,
  }), [rfqs]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-900 text-white px-4 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-bold">AIRfq — RFQ Manager</div>
            <div className="text-green-300 text-sm">Bid intelligence & response workspace</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/rfq/templates')} variant="outline" className="border-green-600 text-white hover:bg-green-800 gap-1">
              <Star className="w-4 h-4" /> Templates
            </Button>
            <Button onClick={() => navigate('/rfq/new')} className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> New RFQ
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'bg-white' },
            { label: 'Open', value: stats.open, color: 'bg-blue-50 border-blue-200' },
            { label: 'Submitted', value: stats.submitted, color: 'bg-indigo-50 border-indigo-200' },
            { label: 'Won', value: stats.won, color: 'bg-green-50 border-green-200' },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: 'bg-amber-50 border-amber-200' },
          ].map(s => (
            <div key={s.label} className={`border rounded-lg p-3 ${s.color}`}>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search org, RFQ number, title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 border rounded-md px-3 text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* RFQ List */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <div className="font-medium">No RFQs found</div>
              <div className="text-sm mt-1">Click "New RFQ" to get started</div>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(rfq => {
                const days = daysUntilDue(rfq.dueDate);
                const cfg = STATUS_CONFIG[rfq.status] || STATUS_CONFIG.received;
                const urgent = days !== null && days <= 3 && !['submitted','won','lost','no_bid'].includes(rfq.status);

                return (
                  <div
                    key={rfq.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${urgent ? 'border-l-4 border-red-500' : ''}`}
                    onClick={() => navigate(`/rfq/${rfq.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 truncate">
                            {rfq.issuingOrg}
                          </span>
                          {rfq.rfqNumber && (
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                              {rfq.rfqNumber}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {rfq.title && (
                          <div className="text-sm text-gray-600 mt-0.5 truncate">{rfq.title}</div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                          {rfq.receivedDate && <span>Received: {rfq.receivedDate}</span>}
                          {rfq.dueDate && (
                            <span className={urgent ? 'text-red-600 font-semibold' : ''}>
                              Due: {rfq.dueDate}
                              {days !== null && !['submitted','won','lost','no_bid'].includes(rfq.status) && (
                                <span className={`ml-1 ${days < 0 ? 'text-red-700' : urgent ? 'text-red-600' : ''}`}>
                                  ({days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'TODAY' : `${days}d left`})
                                </span>
                              )}
                            </span>
                          )}
                          {rfq.estimatedTotalValue > 0 && (
                            <span className="text-green-700 font-medium">
                              Est. ${rfq.estimatedTotalValue.toLocaleString()}
                            </span>
                          )}
                          {rfq.branch && <span>Branch: {rfq.branch}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {rfq.complianceMatrix?.length > 0 && (
                          <div className="text-xs text-gray-500">{rfq.complianceMatrix.length} requirements</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}