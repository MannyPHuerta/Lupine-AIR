import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Loader2, Clock, CheckCircle2, AlertTriangle, Zap, TrendingUp, Droplets, FileBarChart, RefreshCw } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];

export default function LaundryDashboard() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('All Branches');
  const [selectedItem, setSelectedItem] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const [eq, logs] = await Promise.all([
      base44.entities.Equipment.list('-updated_date', 500),
      base44.entities.MaintenanceLog.filter({ type: 'cleaning' }),
    ]);
    setEquipment(eq);
    setMaintenanceLogs(logs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const laundryQueue = useMemo(() => {
    return equipment
      .filter(e => e.unitStatus === 'in_laundry' && (branch === 'All Branches' || e.location === branch))
      .sort((a, b) => new Date(a.statusUpdatedAt) - new Date(b.statusUpdatedAt));
  }, [equipment, branch]);

  const completedToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return maintenanceLogs.filter(m =>
      m.type === 'cleaning' &&
      m.completedDate === today &&
      (branch === 'All Branches' || m.branch === branch)
    );
  }, [maintenanceLogs, branch]);

  const metrics = useMemo(() => {
    const completed = maintenanceLogs.filter(m => m.type === 'cleaning' && m.completedDate);
    const avgTime = completed.length > 0
      ? completed.reduce((sum, m) => {
          const start = new Date(m.scheduledDate);
          const end = new Date(m.completedDate);
          return sum + (end - start) / (1000 * 60 * 60);
        }, 0) / completed.length
      : 0;

    return {
      inQueue: laundryQueue.length,
      completedToday: completedToday.length,
      avgTurnaroundHours: avgTime.toFixed(1),
      totalCompleted: completed.length,
    };
  }, [laundryQueue, completedToday, maintenanceLogs]);

  const staffPerformance = useMemo(() => {
    const staff = {};
    maintenanceLogs
      .filter(m => m.type === 'cleaning' && m.performedBy)
      .forEach(m => {
        if (!staff[m.performedBy]) {
          staff[m.performedBy] = { count: 0, totalHours: 0 };
        }
        staff[m.performedBy].count += 1;
        if (m.completedDate) {
          const hours = (new Date(m.completedDate) - new Date(m.scheduledDate)) / (1000 * 60 * 60);
          staff[m.performedBy].totalHours += hours;
        }
      });

    return Object.entries(staff)
      .map(([name, data]) => ({
        name,
        itemsCompleted: data.count,
        avgTimePerItem: (data.totalHours / data.count).toFixed(1),
      }))
      .sort((a, b) => b.itemsCompleted - a.itemsCompleted);
  }, [maintenanceLogs]);

  const handleUpdateStatus = async (equipmentId, newStatus) => {
    setUpdatingId(equipmentId);
    try {
      const updates = { unitStatus: newStatus };
      if (newStatus === 'available') {
        updates.statusUpdatedAt = new Date().toISOString();
        updates.statusUpdatedBy = 'laundry';
        updates.statusNote = 'Returned from laundry';
      }
      await base44.entities.Equipment.update(equipmentId, updates);
      load();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Laundry Operations"
        subtitle={`${metrics.inQueue} items in queue`}
        icon={Droplets}
        backTo="/laundry"
        action={
          <div className="flex items-center gap-2">
            <select value={branch} onChange={e => setBranch(e.target.value)} className="h-8 border-0 rounded px-2 bg-white/10 text-white text-xs">
              {BRANCHES.map(b => <option key={b} value={b} className="text-black">{b}</option>)}
            </select>
            <button onClick={() => navigate('/laundry-report')} className="p-1.5 rounded-lg hover:bg-white/10 text-white" title="Monthly Report">
              <FileBarChart className="w-4 h-4" />
            </button>
            <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/10 text-white">↻</button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard label="In Queue" value={metrics.inQueue} color="bg-blue-50 border-blue-200" />
          <KPICard label="Completed Today" value={metrics.completedToday} color="bg-green-50 border-green-200" />
          <KPICard label="Avg Turnaround" value={`${metrics.avgTurnaroundHours}h`} color="bg-purple-50 border-purple-200" />
          <KPICard label="Total Completed" value={metrics.totalCompleted} color="bg-indigo-50 border-indigo-200" />
        </div>

        {/* Queue */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-blue-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            Waiting for Cleaning ({laundryQueue.length})
          </div>

          {laundryQueue.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>All items cleaned! 🧼</div>
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {laundryQueue.map(item => {
                const queueTime = new Date() - new Date(item.statusUpdatedAt);
                const queueHours = (queueTime / (1000 * 60 * 60)).toFixed(1);

                return (
                  <div key={item.id} className="p-4 hover:bg-gray-50 transition flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Waiting: <strong>{queueHours}h</strong> · {item.location}
                      </div>
                      {item.statusNote && (
                        <div className="text-xs text-gray-600 mt-1">{item.statusNote}</div>
                      )}
                    </div>
                    <Button
                      onClick={() => handleUpdateStatus(item.id, 'available')}
                      disabled={updatingId === item.id}
                      className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium flex-shrink-0"
                    >
                      {updatingId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        '✓ Done'
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-purple-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            Staff Performance
          </div>

          {staffPerformance.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No staff data yet</div>
          ) : (
            <div className="divide-y">
              {staffPerformance.map((staff, idx) => (
                <div key={staff.name} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{staff.name}</div>
                      <div className="text-xs text-gray-500">Avg: {staff.avgTimePerItem}h per item</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-lg text-purple-600">{staff.itemsCompleted}</div>
                    <div className="text-xs text-gray-500">completed</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completions */}
        {completedToday.length > 0 && (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-green-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Completed Today ({completedToday.length})
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {completedToday.map(log => (
                <div key={log.id} className="p-3 text-xs hover:bg-gray-50 transition">
                  <div className="font-medium text-gray-900">{log.equipmentName}</div>
                  <div className="text-gray-500 mt-0.5">By: {log.performedBy}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, color }) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}