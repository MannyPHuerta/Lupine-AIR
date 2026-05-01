import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, TrendingUp, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [branch, setBranch] = useState('01 McAllen');
  const [rentals, setRentals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Rental.list('-created_date', 500),
      base44.entities.Equipment.list('-updated_date', 500),
    ]).then(([r, e]) => {
      setRentals(r);
      setEquipment(e);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const branchData = useMemo(() => {
    const br = rentals.filter(r => r.branch === branch && r.status !== 'cancelled');
    const eq = equipment.filter(e => e.location === branch);

    const today = new Date().toISOString().split('T')[0];
    const outs = br.filter(r => r.status === 'out' && r.endDate >= today);
    const overdue = br.filter(r => r.status === 'out' && r.endDate < today);
    const due = br.filter(r => r.status === 'out' && r.endDate === today);

    const revenue = br
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.baseAmount || 0), 0);

    const inMaintenance = eq.filter(e => 
      ['in_shop', 'awaiting_parts', 'under_inspection'].includes(e.unitStatus)
    );

    return {
      totalRentals: br.length,
      outCount: outs.length,
      dueToday: due.length,
      overdueCount: overdue.length,
      inMaintenance: inMaintenance.length,
      revenue,
      outs,
      overdue,
      inMaintenance: inMaintenance,
    };
  }, [rentals, equipment, branch]);

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
          <div className="flex-1">
            <div className="text-lg font-bold">Manager Dashboard</div>
            <div className="text-indigo-300 text-xs">Branch operations overview</div>
          </div>
          <select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            className="h-9 border-0 rounded px-2 bg-indigo-800 text-white text-sm"
          >
            {['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button onClick={load} className="p-2 rounded-lg hover:bg-indigo-800">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <KPICard
            label="Active Rentals"
            value={branchData.outCount}
            color="bg-blue-50 border-blue-200"
            icon={<Clock className="w-5 h-5 text-blue-600" />}
          />
          <KPICard
            label="Due Today"
            value={branchData.dueToday}
            color="bg-amber-50 border-amber-200"
            icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
            alert={branchData.dueToday > 0}
          />
          <KPICard
            label="Overdue"
            value={branchData.overdueCount}
            color={branchData.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}
            icon={<AlertCircle className={`w-5 h-5 ${branchData.overdueCount > 0 ? 'text-red-600' : 'text-gray-600'}`} />}
            alert={branchData.overdueCount > 0}
          />
          <KPICard
            label="In Maintenance"
            value={branchData.inMaintenance.length}
            color="bg-purple-50 border-purple-200"
            icon={<AlertCircle className="w-5 h-5 text-purple-600" />}
          />
          <KPICard
            label="Today's Revenue"
            value={`$${(branchData.revenue / 1000).toFixed(1)}k`}
            color="bg-green-50 border-green-200"
            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          />
        </div>

        {/* Alerts */}
        {(branchData.overdueCount > 0 || branchData.dueToday > 0) && (
          <div className="space-y-2">
            {branchData.overdueCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900">{branchData.overdueCount} overdue rental(s)</div>
                  <div className="text-sm text-red-700">Equipment not yet returned</div>
                </div>
              </div>
            )}
            {branchData.dueToday > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900">{branchData.dueToday} rental(s) due today</div>
                  <div className="text-sm text-amber-700">Contact customer for return scheduling</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Rentals */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-blue-50 border-b px-4 py-3 font-semibold text-gray-900">
              Currently Out ({branchData.outCount})
            </div>
            <div className="max-h-96 overflow-y-auto divide-y">
              {branchData.outs.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-8">No active rentals</div>
              ) : (
                branchData.outs.map(r => (
                  <div key={r.id} className="p-3 text-xs hover:bg-gray-50 transition">
                    <div className="font-medium text-gray-900">{r.customerName}</div>
                    <div className="text-gray-600 mt-1">{r.equipmentName}</div>
                    <div className="text-gray-500 mt-1">Due: {r.endDate}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Maintenance Queue */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-purple-50 border-b px-4 py-3 font-semibold text-gray-900">
              Maintenance Queue ({branchData.inMaintenance.length})
            </div>
            <div className="max-h-96 overflow-y-auto divide-y">
              {branchData.inMaintenance.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-8">All clear</div>
              ) : (
                branchData.inMaintenance.map(eq => (
                  <div key={eq.id} className="p-3 text-xs hover:bg-gray-50 transition">
                    <div className="font-medium text-gray-900">{eq.name}</div>
                    <div className="text-gray-600 mt-1">{eq.unitStatus}</div>
                    {eq.statusNote && (
                      <div className="text-gray-500 mt-1">Note: {eq.statusNote}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color, icon, alert }) {
  return (
    <div className={`border rounded-lg p-4 ${color} ${alert ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}