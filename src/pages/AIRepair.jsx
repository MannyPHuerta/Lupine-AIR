import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, Wrench, Clock, CheckCircle2, AlertTriangle, Package, Zap, TrendingUp, Download } from 'lucide-react';
import WorkOrderCard from '@/components/shop/WorkOrderCard';
import PredictiveAlertsPanel from '@/components/repair/PredictiveAlertsPanel';
import SmartSchedulePanel from '@/components/repair/SmartSchedulePanel';
import RepairAnomaliesPanel from '@/components/repair/RepairAnomaliesPanel';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

const STATUS_ORDER = ['in_progress', 'awaiting_parts', 'scheduled', 'completed', 'cancelled'];

const STATUS_META = {
  scheduled:       { label: 'Scheduled',       color: 'bg-gray-100 text-gray-700',    icon: Clock },
  in_progress:     { label: 'In Progress',      color: 'bg-blue-100 text-blue-700',    icon: Wrench },
  awaiting_parts:  { label: 'Awaiting Parts',   color: 'bg-amber-100 text-amber-700',  icon: Package },
  completed:       { label: 'Completed',         color: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  cancelled:       { label: 'Cancelled',         color: 'bg-red-100 text-red-700',      icon: AlertTriangle },
};

export default function AIRepair() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('All Branches');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'completed' | 'all'
  const [editingId, setEditingId] = useState(null);
  const [expandedAI, setExpandedAI] = useState(null); // which maintenance log has AI expanded
  const [aiResults, setAiResults] = useState({}); // map of maintenance log id to AI analysis

  const load = async () => {
    setLoading(true);
    const [wo, eq, logs] = await Promise.all([
      base44.entities.WorkOrder.list('-createdAt', 500),
      base44.entities.Equipment.list('name', 2000),
      base44.entities.MaintenanceLog.list('-completedDate', 200),
    ]);
    setWorkOrders(wo);
    setEquipment(eq);
    setMaintenanceLogs(logs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return workOrders.filter(wo => {
      const branchMatch = branch === 'All Branches' || wo.branch === branch;
      const statusMatch =
        statusFilter === 'all' ? true :
        statusFilter === 'open' ? ['scheduled', 'in_progress', 'awaiting_parts'].includes(wo.status) :
        wo.status === 'completed';
      return branchMatch && statusMatch;
    }).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  }, [workOrders, branch, statusFilter]);

  const counts = useMemo(() => ({
    in_progress:    workOrders.filter(w => w.status === 'in_progress').length,
    awaiting_parts: workOrders.filter(w => w.status === 'awaiting_parts').length,
    scheduled:      workOrders.filter(w => w.status === 'scheduled').length,
    completed:      workOrders.filter(w => w.status === 'completed').length,
  }), [workOrders]);

  const handleExportCSV = () => {
    const headers = ['Equipment', 'Type', 'Status', 'Branch', 'Assigned To', 'Scheduled Date', 'Description', 'Cost'];
    const rows = filtered.map(wo => [
      wo.equipmentName || '',
      wo.type || '',
      wo.status || '',
      wo.branch || '',
      wo.assignedTo || '',
      wo.scheduledDate || '',
      wo.description || '',
      wo.cost || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpdate = async (id, updates) => {
    await base44.entities.WorkOrder.update(id, updates);
    setWorkOrders(prev => prev.map(wo => wo.id === id ? { ...wo, ...updates } : wo));
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/manager')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold">AIRepair Intelligence</div>
            <div className="text-indigo-300 text-xs">{filtered.length} work order{filtered.length !== 1 ? 's' : ''} shown</div>
          </div>
          <select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            className="h-9 border-0 rounded px-2 bg-indigo-800 text-white text-sm"
          >
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {!loading && filtered.length > 0 && (
            <button onClick={handleExportCSV} title="Export CSV" className="flex items-center gap-1.5 text-indigo-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-indigo-800 transition text-xs font-medium border border-indigo-700">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
          <button onClick={load} disabled={loading} className="p-2 rounded-lg hover:bg-indigo-800 text-indigo-200">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status filter tabs */}
         <div className="px-4 max-w-5xl mx-auto flex gap-1 flex-wrap items-center">
           {[
             { key: 'open', label: 'Open' },
             { key: 'completed', label: 'Completed' },
             { key: 'all', label: 'All' },
           ].map(tab => (
             <button
               key={tab.key}
               onClick={() => setStatusFilter(tab.key)}
               className={`px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                 statusFilter === tab.key
                   ? 'border-white text-white'
                   : 'border-transparent text-indigo-300 hover:text-white'
               }`}
             >
               {tab.label}
             </button>
           ))}
           <button onClick={() => navigate('/shop-floor')} className="ml-4 px-3 py-1.5 text-sm font-medium bg-orange-600 hover:bg-orange-700 rounded transition">
             🔧 Shop Floor
           </button>
           <button onClick={() => navigate('/repair-manager-report')} className="px-3 py-1.5 text-sm font-medium bg-indigo-700 hover:bg-indigo-600 rounded transition">
             📊 Performance Report
           </button>
           {maintenanceLogs.filter(m => m.status === 'completed').length > 0 && (
             <span className="ml-auto text-sm text-indigo-300 flex items-center gap-1 py-2.5 px-4 whitespace-nowrap">
               <Zap className="w-4 h-4" /> {maintenanceLogs.filter(m => m.status === 'completed').length} repairs analyzed
             </span>
           )}
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* AI Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Predictive Alerts
            </h2>
            <PredictiveAlertsPanel />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Smart Schedule
            </h2>
            <SmartSchedulePanel />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Anomalies
            </h2>
            <RepairAnomaliesPanel />
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'In Progress',     count: counts.in_progress,    color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Awaiting Parts',  count: counts.awaiting_parts, color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'Scheduled',       count: counts.scheduled,      color: 'text-gray-700 bg-gray-50 border-gray-200' },
            { label: 'Completed',       count: counts.completed,      color: 'text-green-700 bg-green-50 border-green-200' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`rounded-lg border px-4 py-3 ${color}`}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Work orders */}
         {loading ? (
           <div className="flex justify-center py-16">
             <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
           </div>
         ) : filtered.length === 0 ? (
           <div className="text-center text-gray-400 py-16 bg-white rounded-lg border text-sm">
             No work orders found
           </div>
         ) : (
           <div className="space-y-4">
             {filtered.map(wo => (
               <WorkOrderCard
                 key={wo.id}
                 workOrder={wo}
                 statusMeta={STATUS_META}
                 isEditing={editingId === wo.id}
                 onEdit={() => setEditingId(wo.id)}
                 onCancelEdit={() => setEditingId(null)}
                 onUpdate={(updates) => handleUpdate(wo.id, updates)}
               />
             ))}
           </div>
         )}

        {/* Completed repairs with AI insights */}
        {statusFilter !== 'open' && maintenanceLogs.filter(m => m.status === 'completed' && (branch === 'All Branches' || m.branch === branch)).length > 0 && (
          <div className="mt-8 pt-8 border-t-2 border-orange-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Recently Completed Repairs
            </h2>
            <div className="space-y-3">
              {maintenanceLogs.filter(m => m.status === 'completed' && (branch === 'All Branches' || m.branch === branch))
                .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate))
                .slice(0, 10)
                .map(log => {
                  const eq = equipment.find(e => e.id === log.equipmentId);
                  const isExpanded = expandedAI === log.id;
                  const hasAI = aiResults[log.id];

                  return (
                    <div key={log.id} className="bg-white rounded-lg border p-4 hover:border-orange-300 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900">{eq?.name || log.equipmentName || 'Unknown'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="inline-block mr-2">{log.type}</span>
                            {log.completedDate && <span>{new Date(log.completedDate).toLocaleDateString()}</span>}
                            {log.cost && <span className="inline-block ml-2 font-medium text-gray-700">${log.cost.toFixed(0)}</span>}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (isExpanded) {
                              setExpandedAI(null);
                            } else {
                              // Trigger AI analysis
                              if (!hasAI) {
                                const rentals = [];
                                try {
                                  const result = await base44.functions.invoke('analyzeRepairIntel', {
                                    equipmentId: log.equipmentId,
                                    equipmentName: log.equipmentName || eq?.name || 'Unknown',
                                    equipmentCategory: eq?.category || '',
                                    purchaseCost: eq?.purchaseCost || 0,
                                    dailyRate: eq?.dailyRate || 0,
                                    currentCondition: log.conditionAfter || 'Good',
                                    maintenanceType: log.type,
                                    rentalHistory: rentals,
                                  });
                                  setAiResults(prev => ({ ...prev, [log.id]: result }));
                                } catch (err) {
                                  setAiResults(prev => ({ ...prev, [log.id]: { error: err.message } }));
                                }
                              }
                              setExpandedAI(log.id);
                            }
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition flex-shrink-0 ${
                            isExpanded
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {isExpanded ? '− Hide' : '+ AI Insight'}
                        </button>
                      </div>

                      {isExpanded && hasAI && !hasAI.error && (
                        <div className="mt-4 pt-4 border-t space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 p-2 rounded">
                              <span className="font-semibold text-blue-900">Success Rate</span>
                              <div className="text-lg font-bold text-blue-700 mt-1">{hasAI.successProbability}%</div>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <span className="font-semibold text-green-900">Annual Recovery</span>
                              <div className="text-lg font-bold text-green-700 mt-1">${hasAI.estimatedRecovery}</div>
                            </div>
                          </div>
                          <div className="bg-amber-50 p-2 rounded">
                            <span className="font-semibold text-amber-900">Impact</span>
                            <p className="text-amber-800 mt-1">{hasAI.businessImpact}</p>
                          </div>
                          <div className="bg-purple-50 p-2 rounded">
                            <span className="font-semibold text-purple-900">Recommendation</span>
                            <p className="text-purple-800 mt-1">{hasAI.recommendation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}