import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Truck, CheckCircle, Clock, RotateCcw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

const BRANCHES = ['all', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];

export default function DriverReport() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [recoveries, setRecoveries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedBranch, setBranch] = useState('all');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    Promise.all([
      base44.entities.Delivery.list('-scheduledDate', 1000),
      base44.entities.Recovery.list('-scheduledDate', 1000),
      base44.entities.User.list(),
    ]).then(([dels, recs, u]) => {
      setDeliveries(dels);
      setRecoveries(recs);
      setUsers(u.filter(u => u.role === 'driver' || u.role === 'user' || u.role === 'admin'));
      setLoading(false);
    });
  }, []);

  const allDrivers = useMemo(() => {
    const driverEmails = [...new Set([
      ...deliveries.map(d => d.driverId),
      ...recoveries.map(r => r.driverId),
    ].filter(Boolean))];
    return driverEmails.map(email => {
      const u = users.find(u => u.email === email);
      return { email, name: u?.full_name || email };
    });
  }, [deliveries, recoveries, users]);

  const filtered = useMemo(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59);

    const filterFn = (item) => {
      const d = new Date(item.scheduledDate);
      return d >= start && d <= end
        && (selectedDriver === 'all' || item.driverId === selectedDriver)
        && (selectedBranch === 'all' || item.branch === selectedBranch);
    };

    return {
      deliveries: deliveries.filter(filterFn),
      recoveries: recoveries.filter(filterFn),
    };
  }, [deliveries, recoveries, dateFrom, dateTo, selectedDriver, selectedBranch]);

  const metrics = useMemo(() => {
    const { deliveries: dels, recoveries: recs } = filtered;
    const completedDels = dels.filter(d => d.status === 'completed');
    const completedRecs = recs.filter(r => r.status === 'completed');

    // Per-driver stats
    const byDriver = {};
    [...dels.map(d => ({ ...d, _type: 'delivery' })), ...recs.map(r => ({ ...r, _type: 'recovery' }))].forEach(item => {
      const key = item.driverId || 'unassigned';
      if (!byDriver[key]) byDriver[key] = { deliveries: 0, recoveries: 0, completed: 0 };
      if (item._type === 'delivery') byDriver[key].deliveries += 1;
      if (item._type === 'recovery') byDriver[key].recoveries += 1;
      if (item.status === 'completed') byDriver[key].completed += 1;
    });

    const driverList = Object.entries(byDriver)
      .map(([email, d]) => {
        const u = allDrivers.find(dr => dr.email === email);
        const total = d.deliveries + d.recoveries;
        return {
          email,
          name: u?.name || email,
          deliveries: d.deliveries,
          recoveries: d.recoveries,
          completed: d.completed,
          total,
          completionRate: total > 0 ? Math.round((d.completed / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      totalDeliveries: dels.length,
      completedDeliveries: completedDels.length,
      totalRecoveries: recs.length,
      completedRecoveries: completedRecs.length,
      completionRate: (dels.length + recs.length) > 0
        ? Math.round(((completedDels.length + completedRecs.length) / (dels.length + recs.length)) * 100)
        : 0,
      driverList,
    };
  }, [filtered, allDrivers]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    let y = 15;

    doc.setFontSize(20);
    doc.text('Driver Performance Report', margin, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Period: ${dateFrom} to ${dateTo}`, margin, y); y += 5;
    if (selectedDriver !== 'all') {
      const drv = allDrivers.find(d => d.email === selectedDriver);
      doc.text(`Driver: ${drv?.name || selectedDriver}`, margin, y); y += 5;
    }
    if (selectedBranch !== 'all') { doc.text(`Branch: ${selectedBranch}`, margin, y); y += 5; }

    y += 5;
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Key Metrics', margin, y); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, 'normal');
    [
      ['Total Deliveries', metrics.totalDeliveries],
      ['Completed Deliveries', metrics.completedDeliveries],
      ['Total Recoveries', metrics.totalRecoveries],
      ['Completed Recoveries', metrics.completedRecoveries],
      ['Overall Completion Rate', `${metrics.completionRate}%`],
    ].forEach(([label, val]) => {
      doc.text(label, margin, y);
      doc.text(String(val), margin + 90, y);
      y += 6;
    });

    y += 5;
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Driver Leaderboard', margin, y); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text('Driver', margin, y);
    doc.text('Deliveries', margin + 70, y);
    doc.text('Recoveries', margin + 100, y);
    doc.text('Rate', margin + 135, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    metrics.driverList.forEach(d => {
      if (y > 260) { doc.addPage(); y = 15; }
      doc.text(d.name.slice(0, 25), margin, y);
      doc.text(String(d.deliveries), margin + 70, y);
      doc.text(String(d.recoveries), margin + 100, y);
      doc.text(`${d.completionRate}%`, margin + 135, y);
      y += 6;
    });

    y += 5;
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Recent Deliveries', margin, y); y += 8;
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text('Customer', margin, y);
    doc.text('Date', margin + 70, y);
    doc.text('Status', margin + 105, y);
    doc.text('Driver', margin + 135, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    filtered.deliveries.slice(0, 15).forEach(d => {
      if (y > 260) { doc.addPage(); y = 15; }
      doc.text((d.customerName || '—').slice(0, 20), margin, y);
      doc.text(d.scheduledDate || '—', margin + 70, y);
      doc.text(d.status || '—', margin + 105, y);
      doc.text((d.driverName || '—').slice(0, 15), margin + 135, y);
      y += 6;
    });

    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, footerY);

    doc.save(`driver-report-${dateFrom}-to-${dateTo}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/dispatch')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <Truck className="w-5 h-5 text-indigo-300" />
            <div>
              <div className="text-lg font-bold">Driver Performance Report</div>
              <div className="text-indigo-300 text-xs">Deliveries & recoveries by driver</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-900">Filters</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Date From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Date To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Driver</label>
              <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white">
                <option value="all">All Drivers</option>
                {allDrivers.map(d => <option key={d.email} value={d.email}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
              <select value={selectedBranch} onChange={e => setBranch(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white">
                {BRANCHES.map(b => <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={generatePDF} className="bg-indigo-700 hover:bg-indigo-800 gap-2">
              <Download className="w-4 h-4" /> Download PDF Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Deliveries', value: metrics.totalDeliveries, icon: Truck, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
            { label: 'Recoveries', value: metrics.totalRecoveries, icon: RotateCcw, color: 'text-rose-700 bg-rose-50 border-rose-200' },
            { label: 'Completed', value: metrics.completedDeliveries + metrics.completedRecoveries, icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Completion Rate', value: `${metrics.completionRate}%`, icon: TrendingUp, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`rounded-lg border p-4 ${card.color}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium opacity-75">{card.label}</div>
                    <div className="text-2xl font-bold mt-2">{card.value}</div>
                  </div>
                  <Icon className="w-5 h-5 opacity-40" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Driver Leaderboard */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Driver Leaderboard
          </div>
          {metrics.driverList.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No driver data for this period</div>
          ) : (
            <div className="divide-y">
              {metrics.driverList.map((d, idx) => (
                <div key={d.email} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{d.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {d.deliveries} deliveries · {d.recoveries} recoveries
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-indigo-700">{d.completionRate}%</div>
                    <div className="text-xs text-gray-500">completion</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-blue-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" /> Recent Deliveries
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {filtered.deliveries.slice(0, 20).map(d => (
                <div key={d.id} className="px-4 py-3 text-sm hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900 truncate flex-1">{d.customerName}</div>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${d.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {d.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{d.scheduledDate} · {d.driverName || '—'}</div>
                </div>
              ))}
              {filtered.deliveries.length === 0 && <div className="p-4 text-center text-sm text-gray-400">No deliveries</div>}
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="bg-rose-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-rose-600" /> Recent Recoveries
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {filtered.recoveries.slice(0, 20).map(r => (
                <div key={r.id} className="px-4 py-3 text-sm hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="font-medium text-gray-900 truncate flex-1">{r.customerName}</div>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{r.scheduledDate} · {r.driverName || '—'}</div>
                </div>
              ))}
              {filtered.recoveries.length === 0 && <div className="p-4 text-center text-sm text-gray-400">No recoveries</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}