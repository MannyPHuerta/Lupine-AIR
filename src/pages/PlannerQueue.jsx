import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseData } from '@/lib/supabaseData';
import { Loader2, ArrowLeft, Calendar, Users, RefreshCw, ExternalLink } from 'lucide-react';

const STATUS_LABELS = {
  draft: { label: 'Draft', color: 'bg-slate-700 text-slate-300' },
  customer_review: { label: 'Customer Editing', color: 'bg-blue-900/50 text-blue-300' },
  planner_review: { label: 'Needs Review', color: 'bg-amber-900/50 text-amber-300' },
  finalized: { label: 'Finalized', color: 'bg-green-900/50 text-green-300' },
  converted: { label: 'Converted to Rental', color: 'bg-purple-900/50 text-purple-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-900/50 text-red-300' },
};

export default function PlannerQueue() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('planner_review');
  const [user, setUser] = useState(null);

  const load = async () => {
    setLoading(true);
    const all = await supabaseData.EventPlan.list('-updated_at', 200);
    setUser(null);
    setPlans(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all'
    ? plans
    : plans.filter(p => p.status === filter);

  const counts = {
    planner_review: plans.filter(p => p.status === 'planner_review').length,
    customer_review: plans.filter(p => p.status === 'customer_review').length,
    finalized: plans.filter(p => p.status === 'finalized').length,
    converted: plans.filter(p => p.status === 'converted').length,
    all: plans.length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-black border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/manager')} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AE</span>
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Event Planner Queue</div>
            <div className="text-white/40 text-xs">Review & finalize customer event plans</div>
          </div>
          <button onClick={load} className="p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/event-planner')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
          >
            + New Plan
          </button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto pb-0">
          {[
            { key: 'planner_review', label: 'Needs Review' },
            { key: 'customer_review', label: 'With Customer' },
            { key: 'finalized', label: 'Finalized' },
            { key: 'converted', label: 'Converted' },
            { key: 'all', label: 'All Plans' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                filter === tab.key
                  ? 'border-purple-400 text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filter === tab.key ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/40'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plan list */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm">No plans in this category</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(plan => {
              const statusMeta = STATUS_LABELS[plan.status] || STATUS_LABELS.draft;
              const total = (plan.canvasItems || []).reduce((s, i) => s + (i.dailyRate || 0) * (i.quantity || 1), 0);
              const itemCount = (plan.canvasItems || []).length;
              return (
                <div
                  key={plan.id}
                  className="bg-slate-900 border border-white/10 rounded-xl p-4 hover:border-purple-500/40 transition cursor-pointer group"
                  onClick={() => navigate(`/event-planner/${plan.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-white truncate">{plan.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                        {plan.status === 'planner_review' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold animate-pulse">
                            Action needed
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-white/40 flex-wrap">
                        {plan.customerName && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {plan.customerName}
                          </span>
                        )}
                        {plan.eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {plan.eventDate}
                          </span>
                        )}
                        {plan.eventType && (
                          <span className="capitalize">{plan.eventType.replace('_', ' ')}</span>
                        )}
                        {plan.guestCount > 0 && (
                          <span>{plan.guestCount} guests</span>
                        )}
                        {itemCount > 0 && (
                          <span>{itemCount} canvas item{itemCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      {plan.lastEditedBy && (
                        <div className="text-xs text-white/25 mt-1">
                          Last edited by {plan.lastEditedBy} · {plan.lastEditedAt ? new Date(plan.lastEditedAt).toLocaleString() : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {total > 0 && (
                        <div className="text-cyan-400 font-bold text-sm">${total.toFixed(0)}/day</div>
                      )}
                      <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}