import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, TrendingUp, DollarSign, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RepairIntelPanel from '@/components/repair/RepairIntelPanel';

export default function AIRepair() {
  const navigate = useNavigate();
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('scheduled');

  useEffect(() => {
    Promise.all([
      base44.entities.MaintenanceLog.list('-created_date', 500),
      base44.entities.Equipment.list('name', 500),
      base44.entities.Rental.list('-created_date', 1000),
    ]).then(([logs, eq, rent]) => {
      setMaintenanceLogs(logs);
      setEquipment(eq);
      setRentals(rent);
      setLoading(false);
    });
  }, []);

  const filtered = maintenanceLogs.filter(log => log.status === filterStatus);

  const stats = {
    scheduled: maintenanceLogs.filter(l => l.status === 'scheduled').length,
    inProgress: maintenanceLogs.filter(l => l.status === 'in_progress').length,
    completed: maintenanceLogs.filter(l => l.status === 'completed').length,
    totalCost: maintenanceLogs.filter(l => l.status === 'completed').reduce((s, l) => s + (l.cost || 0), 0),
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
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/lupine')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Zap className="w-6 h-6 text-yellow-400" />
          <div>
            <div className="text-lg font-bold">AIRepair Intelligence</div>
            <div className="text-indigo-300 text-xs">AI-powered repair decisions & ROI analysis</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.scheduled}</div>
            <div className="text-xs text-gray-600 mt-1">Scheduled</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
            <div className="text-xs text-gray-600 mt-1">In Progress</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-gray-600 mt-1">Completed</div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="text-2xl font-bold text-blue-600">${(stats.totalCost / 1000).toFixed(1)}k</div>
            <div className="text-xs text-gray-600 mt-1">Total Cost (Completed)</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b bg-white rounded-t-lg px-4">
          {['scheduled', 'in_progress', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                filterStatus === status
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-indigo-600'
              }`}
            >
              {status === 'scheduled' && `Scheduled (${stats.scheduled})`}
              {status === 'in_progress' && `In Progress (${stats.inProgress})`}
              {status === 'completed' && `Completed (${stats.completed})`}
            </button>
          ))}
        </div>

        {/* Maintenance Logs with AI Intel */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No {filterStatus} repairs</p>
            </div>
          ) : (
            filtered.map(log => {
              const eq = equipment.find(e => e.id === log.equipmentId);
              const eqRentals = rentals.filter(r => r.equipmentId === log.equipmentId);
              return (
                <RepairIntelPanel
                  key={log.id}
                  maintenanceLog={log}
                  equipment={eq}
                  rentals={eqRentals}
                  onStatusUpdate={async (newStatus) => {
                    await base44.entities.MaintenanceLog.update(log.id, { status: newStatus });
                    const updated = await base44.entities.MaintenanceLog.list('-created_date', 500);
                    setMaintenanceLogs(updated);
                  }}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}