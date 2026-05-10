import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, User, Zap, Plus, Loader2, Check, Send, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_COLORS = {
  scheduled: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  awaiting_parts: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-700',
};

export default function ShopFloor() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [parts, setParts] = useState([]);
  const [branchSettings, setBranchSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState(null);
  const [assigningWO, setAssigningWO] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [buyerEmail, setBuyerEmail] = useState('');

  const load = async () => {
    setLoading(true);
    const [wo, mech, pt, bs] = await Promise.all([
      base44.entities.WorkOrder.list('-createdAt', 500),
      base44.entities.MechanicProfile.filter({ isActive: true }),
      base44.entities.PartRequirement.list('-created_date', 500),
      base44.entities.BranchSettings.filter({ branch: '01 McAllen' }),
    ]);
    setWorkOrders(wo);
    setMechanics(mech);
    setParts(pt);
    setBranchSettings(bs[0] || null);
    // Auto-populate buyer email from branch settings if available
    if (bs[0]?.partsBuyerEmail) {
      setBuyerEmail(bs[0].partsBuyerEmail);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Group work orders by mechanic
  const byMechanic = useMemo(() => {
    const grouped = {};
    mechanics.forEach(m => {
      grouped[m.email] = workOrders.filter(wo =>
        wo.assignedTo === m.email &&
        ['scheduled', 'in_progress', 'awaiting_parts'].includes(wo.status)
      );
    });
    return grouped;
  }, [workOrders, mechanics]);

  // Unassigned work orders
  const unassigned = useMemo(() =>
    workOrders.filter(wo =>
      !wo.assignedTo &&
      ['scheduled', 'in_progress'].includes(wo.status)
    ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [workOrders]
  );

  // Get parts for a work order
  const getPartsForWO = (woId) => parts.filter(p => p.workOrderId === woId);

  // Check if parts are blocking
  const hasBlockingParts = (woId) => {
    const woParts = getPartsForWO(woId);
    return woParts.some(p => p.isCritical && p.status !== 'in_stock' && p.status !== 'received');
  };

  const handleAssign = async (woId, mechanicEmail) => {
    setAssignmentLoading(true);
    try {
      const result = await base44.functions.invoke('assignWorkOrder', {
        workOrderId: woId,
        mechanicEmail,
        overridePartCheck: false,
      });

      if (result.data.error && result.data.canOverride) {
        // Parts missing but can override
        const override = confirm(`Critical parts missing:\n${result.data.missingParts.map(p => `- ${p.name} (${p.status})`).join('\n')}\n\nStart job anyway?`);
        if (override) {
          await base44.functions.invoke('assignWorkOrder', {
            workOrderId: woId,
            mechanicEmail,
            overridePartCheck: true,
          });
        }
      }

      load();
      setAssigningWO(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAssignmentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto flex-wrap">
          <button onClick={() => navigate('/airepair')} className="p-2 rounded-lg hover:bg-orange-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-48">
            <div className="text-lg font-bold">Shop Floor</div>
            <div className="text-orange-300 text-xs">{workOrders.filter(w => ['scheduled', 'in_progress', 'awaiting_parts'].includes(w.status)).length} active jobs</div>
          </div>
          <button onClick={() => navigate('/inspection-queue')} className="px-3 py-2 bg-orange-800 hover:bg-orange-700 rounded text-xs font-medium flex items-center gap-1 transition">
            📋 Inspection Queue
          </button>
          <button onClick={() => navigate('/parts-procurement')} className="px-3 py-2 bg-orange-800 hover:bg-orange-700 rounded text-xs font-medium flex items-center gap-1 transition">
            <Package className="w-4 h-4" /> Procurement Report
          </button>
          <button onClick={load} className="p-2 rounded-lg hover:bg-orange-800">
            ↻
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Unassigned queue */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-bold text-red-900">Unassigned — Waiting for Assignment ({unassigned.length})</h2>
          </div>

          {unassigned.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">
              All jobs assigned!
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {unassigned.map(wo => {
                const woParts = getPartsForWO(wo.id);
                const blockingParts = woParts.filter(p => p.isCritical && p.status !== 'in_stock' && p.status !== 'received');
                const hasBlocking = blockingParts.length > 0;

                return (
                  <div key={wo.id} className={`p-4 hover:bg-gray-50 transition ${hasBlocking ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {hasBlocking && (
                            <div className="animate-pulse">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                          )}
                          <span className="font-semibold text-gray-900">{wo.equipmentName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[wo.status]}`}>
                            {wo.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{wo.description}</p>
                        
                        {hasBlocking && (
                          <div className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mb-2 inline-block">
                            🚨 Blocking parts: {blockingParts.map(p => `${p.partName} (${p.status})`).join(', ')}
                          </div>
                        )}

                        {!hasBlocking && woParts.length > 0 && (
                          <div className="text-xs text-gray-600 mb-2">
                            Parts: {woParts.filter(p => p.status === 'in_stock' || p.status === 'received').length}/{woParts.length} ready
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {getPartsForWO(wo.id).length > 0 && !assigningWO && (
                          <button
                            onClick={() => setSendingRequest(wo.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition"
                          >
                            <Send className="w-3 h-3" /> Request Parts
                          </button>
                        )}
                        {sendingRequest === wo.id ? (
                          <div className="flex gap-1 items-center">
                            <input
                              type="email"
                              autoFocus
                              placeholder={branchSettings?.partsBuyerEmail || 'buyer@email.com'}
                              value={buyerEmail}
                              onChange={e => setBuyerEmail(e.target.value)}
                              className="h-9 border border-purple-300 rounded px-2 text-xs"
                            />
                            <button
                              onClick={async () => {
                                const email = buyerEmail.trim() || branchSettings?.partsBuyerEmail;
                                if (!email) { alert('No buyer email configured'); return; }
                                setSendingRequest(null);
                                try {
                                  await base44.functions.invoke('sendPartsRequest', {
                                    workOrderId: wo.id,
                                    buyerEmail: email,
                                  });
                                  alert('✓ Parts request sent');
                                  load();
                                } catch (err) {
                                  alert(`Error: ${err.message}`);
                                }
                              }}
                              className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition"
                            >
                              Send
                            </button>
                            <button
                              onClick={() => { setSendingRequest(null); setBuyerEmail(branchSettings?.partsBuyerEmail || ''); }}
                              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                            >
                              ✕
                            </button>
                          </div>
                        ) : null}
                        {assigningWO === wo.id ? (
                          <div className="relative">
                            <select
                              autoFocus
                              onChange={e => {
                                if (e.target.value) handleAssign(wo.id, e.target.value);
                              }}
                              className="h-9 border border-orange-300 rounded px-2 text-sm bg-white cursor-pointer"
                            >
                              <option value="">Select mechanic...</option>
                              {mechanics
                                .filter(m => (byMechanic[m.email] || []).length < m.maxConcurrentJobs)
                                .map(m => (
                                  <option key={m.id} value={m.email}>
                                    {m.fullName} ({(byMechanic[m.email] || []).length}/{m.maxConcurrentJobs})
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={() => setAssigningWO(null)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigningWO(wo.id)}
                            className="flex items-center gap-1 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded transition"
                          >
                            <User className="w-3 h-3" /> Assign
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By Mechanic */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-orange-600" />
            Shop Floor Status
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mechanics.map(mechanic => {
              const assigned = byMechanic[mechanic.email] || [];
              const currentJob = assigned.find(w => w.status === 'in_progress');
              const scheduled = assigned.filter(w => w.status === 'scheduled');
              const blockedByParts = assigned.filter(w => w.status === 'awaiting_parts');

              return (
                <div key={mechanic.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-bold text-gray-900">{mechanic.fullName}</div>
                      <div className="text-xs text-gray-500">{assigned.length}/{mechanic.maxConcurrentJobs} jobs</div>
                    </div>
                    <div className="text-right">
                      {currentJob && (
                        <div className="text-xs">
                          <div className="text-gray-500">Current</div>
                          <div className="font-mono text-sm text-blue-700">{new Date().toLocaleTimeString()}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current job */}
                  {currentJob && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-semibold text-blue-900">NOW</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{currentJob.equipmentName}</div>
                      <div className="text-xs text-gray-600">{currentJob.description}</div>
                    </div>
                  )}

                  {/* Blocked by parts */}
                  {blockedByParts.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                      {blockedByParts.map(job => (
                        <div key={job.id}>
                          <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle className="w-3 h-3 text-red-600 animate-pulse" />
                            <span className="text-xs font-semibold text-red-700">BLOCKED</span>
                          </div>
                          <div className="text-xs text-gray-900">{job.equipmentName}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Scheduled jobs (queue) */}
                  {scheduled.length > 0 && (
                    <div className="space-y-1 text-xs">
                      <div className="text-gray-600 font-medium">Queue ({scheduled.length})</div>
                      {scheduled.map((job, idx) => (
                        <div key={job.id} className="flex items-center gap-2 text-gray-700">
                          <span className="text-gray-400">#{idx + 1}</span>
                          <span className="truncate">{job.equipmentName}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {assigned.length === 0 && (
                    <div className="text-center text-gray-400 py-3 text-xs">
                      No active jobs
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}