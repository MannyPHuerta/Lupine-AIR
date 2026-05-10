import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, TrendingUp, DollarSign, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

export default function RepairManagerReport() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedManager, setSelectedManager] = useState('all');
  const [selectedBranch, setBranch] = useState('all');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([
      base44.entities.WorkOrder.list('-createdAt', 500),
      base44.entities.MaintenanceLog.list('-completedDate', 500),
      base44.entities.PredictiveAlert.list('-generatedAt', 200),
      base44.entities.Equipment.list('name', 2000),
      base44.entities.User.list(),
    ]).then(([wo, ml, alerts, eq, u]) => {
      setWorkOrders(wo);
      setMaintenanceLogs(ml);
      setAlerts(alerts);
      setEquipment(eq);
      setUsers(u.filter(u => u.role === 'mechanic' || u.role === 'manager'));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59);

    return {
      workOrders: workOrders.filter(wo => {
        const woDate = new Date(wo.createdAt || wo.updated_date);
        const branchMatch = selectedBranch === 'all' || wo.branch === selectedBranch;
        const managerMatch = selectedManager === 'all' || wo.assignedTo === selectedManager;
        const dateMatch = woDate >= startDate && woDate <= endDate;
        return branchMatch && managerMatch && dateMatch;
      }),
      maintenanceLogs: maintenanceLogs.filter(ml => {
        const logDate = new Date(ml.completedDate || ml.scheduledDate);
        const branchMatch = selectedBranch === 'all' || ml.branch === selectedBranch;
        const managerMatch = selectedManager === 'all' || ml.performedBy === selectedManager;
        const dateMatch = logDate >= startDate && logDate <= endDate;
        return branchMatch && managerMatch && dateMatch;
      }),
      alerts: alerts.filter(a => {
        const alertDate = new Date(a.generatedAt);
        const branchMatch = selectedBranch === 'all' || a.branch === selectedBranch;
        const dateMatch = alertDate >= startDate && alertDate <= endDate;
        return branchMatch && dateMatch;
      }),
    };
  }, [workOrders, maintenanceLogs, alerts, selectedManager, selectedBranch, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    const { workOrders: wos, maintenanceLogs: logs, alerts: alts } = filtered;

    const completed = wos.filter(w => w.status === 'completed').length;
    const avgTurnaround = completed > 0
      ? Math.round(wos.filter(w => w.status === 'completed')
        .reduce((sum, w) => {
          const days = (new Date(w.completedAt) - new Date(w.createdAt)) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0) / completed)
      : 0;

    const totalCost = logs.reduce((sum, l) => sum + (l.cost || 0), 0);
    const preventiveMaintenance = logs.filter(l => l.type === 'preventive').length;
    const repairMaintenance = logs.filter(l => l.type === 'repair').length;

    const activeAlerts = alts.filter(a => a.status === 'active').length;
    const resolvedAlerts = alts.filter(a => a.status === 'resolved').length;

    return {
      totalWorkOrders: wos.length,
      completedWorkOrders: completed,
      avgTurnaroundDays: avgTurnaround,
      totalMaintenanceCost: totalCost,
      preventiveCount: preventiveMaintenance,
      repairCount: repairMaintenance,
      activeAlerts,
      resolvedAlerts,
      alertAccuracy: activeAlerts + resolvedAlerts > 0
        ? Math.round((resolvedAlerts / (activeAlerts + resolvedAlerts)) * 100)
        : 0,
    };
  }, [filtered]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = 15;

    // Title
    doc.setFontSize(20);
    doc.text('Repair Manager Performance Report', margin, currentY);
    currentY += 12;

    // Date range and filters
    doc.setFontSize(10);
    doc.text(`Report Period: ${dateFrom} to ${dateTo}`, margin, currentY);
    currentY += 5;
    if (selectedManager !== 'all') {
      const mgr = users.find(u => u.email === selectedManager);
      doc.text(`Manager: ${mgr?.full_name || selectedManager}`, margin, currentY);
      currentY += 5;
    }
    if (selectedBranch !== 'all') {
      doc.text(`Branch: ${selectedBranch}`, margin, currentY);
      currentY += 5;
    }

    // KPI Section
    currentY += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Key Performance Indicators', margin, currentY);
    currentY += 8;

    // Draw KPI table manually
    doc.setFontSize(9);
    const colWidth = (pageWidth - 2 * margin) / 2;
    const metrics_list = [
      ['Total Work Orders', metrics.totalWorkOrders.toString()],
      ['Completed', metrics.completedWorkOrders.toString()],
      ['Avg Turnaround', `${metrics.avgTurnaroundDays} days`],
      ['Total Maintenance Cost', `$${metrics.totalMaintenanceCost.toFixed(0)}`],
      ['Preventive Services', metrics.preventiveCount.toString()],
      ['Repairs Completed', metrics.repairCount.toString()],
      ['Alerts Generated', metrics.activeAlerts.toString()],
      ['Alert Accuracy', `${metrics.alertAccuracy}%`],
    ];

    metrics_list.forEach(([label, value]) => {
      doc.setFont(undefined, 'normal');
      doc.text(label, margin, currentY);
      doc.text(value, margin + colWidth, currentY);
      currentY += 6;
    });

    // Work Orders Section
    currentY += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Recent Work Orders', margin, currentY);
    currentY += 8;

    doc.setFontSize(8);
    const headers = ['Order ID', 'Status', 'Equipment', 'Created', 'Days'];
    const col1 = margin;
    const col2 = col1 + 25;
    const col3 = col2 + 25;
    const col4 = col3 + 45;
    const col5 = col4 + 35;

    // Header row
    doc.setFont(undefined, 'bold');
    doc.setFillColor(95, 61, 20);
    doc.setTextColor(255);
    doc.text(headers[0], col1, currentY);
    doc.text(headers[1], col2, currentY);
    doc.text(headers[2], col3, currentY);
    doc.text(headers[3], col4, currentY);
    doc.text(headers[4], col5, currentY);
    currentY += 6;

    // Data rows
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
    filtered.workOrders.slice(0, 12).forEach(wo => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 15;
      }
      const id = wo.id?.slice(0, 8) || '-';
      const status = wo.status;
      const eq = wo.equipmentName || '-';
      const created = new Date(wo.createdAt).toLocaleDateString();
      const days = wo.status === 'completed' ? Math.round((new Date(wo.completedAt) - new Date(wo.createdAt)) / (1000 * 60 * 60 * 24)).toString() : '-';

      doc.text(id, col1, currentY);
      doc.text(status, col2, currentY);
      doc.text(eq.length > 15 ? eq.slice(0, 12) + '...' : eq, col3, currentY);
      doc.text(created, col4, currentY);
      doc.text(days, col5, currentY);
      currentY += 6;
    });

    // Summary
    currentY += 5;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Performance Summary', margin, currentY);
    currentY += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const summaryText = `This manager has completed ${metrics.completedWorkOrders} work orders with an average turnaround of ${metrics.avgTurnaroundDays} days. Total maintenance cost managed: $${metrics.totalMaintenanceCost.toFixed(0)}. Alert prediction accuracy: ${metrics.alertAccuracy}%, demonstrating strong preventive maintenance planning.`;
    doc.text(summaryText, margin, currentY, { maxWidth: pageWidth - 2 * margin });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, footerY);

    doc.save(`repair-manager-report-${selectedManager || 'all'}-${dateFrom}-to-${dateTo}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  const branches = ['all', ...new Set(workOrders.map(w => w.branch).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/airepair')} className="p-2 rounded-lg hover:bg-orange-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">AIRepair Manager Performance</div>
            <div className="text-orange-300 text-xs">Showcase your repair excellence</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Manager</label>
              <select
                value={selectedManager}
                onChange={e => setSelectedManager(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white"
              >
                <option value="all">All Managers</option>
                {users.map(u => <option key={u.id} value={u.email}>{u.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
              <select
                value={selectedBranch}
                onChange={e => setBranch(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white"
              >
                {branches.map(b => <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={generatePDF}
              className="bg-orange-600 hover:bg-orange-700 gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Work Orders Completed', value: metrics.completedWorkOrders, icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Avg Turnaround', value: `${metrics.avgTurnaroundDays}d`, icon: Clock, color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'Total Maintenance Cost', value: `$${(metrics.totalMaintenanceCost / 1000).toFixed(0)}k`, icon: DollarSign, color: 'text-purple-700 bg-purple-50 border-purple-200' },
            { label: 'Alert Accuracy', value: `${metrics.alertAccuracy}%`, icon: TrendingUp, color: 'text-orange-700 bg-orange-50 border-orange-200' },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-lg border p-4 ${card.color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium opacity-75">{card.label}</div>
                    <div className="text-2xl font-bold mt-2">{card.value}</div>
                  </div>
                  <Icon className="w-5 h-5 opacity-50" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Preventive vs Repair
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Preventive Maintenance</span>
                <span className="font-medium">{metrics.preventiveCount} services</span>
              </div>
              <div className="flex justify-between">
                <span>Repairs Completed</span>
                <span className="font-medium">{metrics.repairCount} repairs</span>
              </div>
              <div className="pt-2 border-t text-xs text-gray-600">
                Proactive maintenance reduces future failures by up to 45%
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              Predictive Alert Performance
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Active Alerts</span>
                <span className="font-medium">{metrics.activeAlerts}</span>
              </div>
              <div className="flex justify-between">
                <span>Resolved Alerts</span>
                <span className="font-medium">{metrics.resolvedAlerts}</span>
              </div>
              <div className="pt-2 border-t text-xs text-gray-600">
                {metrics.alertAccuracy}% accuracy in predicting maintenance needs
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}