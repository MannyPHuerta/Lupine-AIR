import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Droplets, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';

const BRANCHES = ['all', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'];

export default function LaundryReport() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedBranch, setBranch] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    base44.entities.MaintenanceLog.filter({ type: 'cleaning' }, '-completedDate', 1000)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const allStaff = useMemo(() => [...new Set(logs.map(l => l.performedBy).filter(Boolean))], [logs]);

  const filtered = useMemo(() => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59);
    return logs.filter(l => {
      const d = new Date(l.completedDate || l.scheduledDate);
      return d >= start && d <= end
        && (selectedBranch === 'all' || l.branch === selectedBranch)
        && (selectedStaff === 'all' || l.performedBy === selectedStaff);
    });
  }, [logs, dateFrom, dateTo, selectedBranch, selectedStaff]);

  const metrics = useMemo(() => {
    const completed = filtered.filter(l => l.completedDate);
    const avgHours = completed.length > 0
      ? completed.reduce((sum, l) => {
          const h = (new Date(l.completedDate) - new Date(l.scheduledDate)) / (1000 * 60 * 60);
          return sum + Math.max(0, h);
        }, 0) / completed.length
      : 0;

    const byStaff = {};
    filtered.forEach(l => {
      if (!l.performedBy) return;
      if (!byStaff[l.performedBy]) byStaff[l.performedBy] = { count: 0, hours: 0 };
      byStaff[l.performedBy].count += 1;
      if (l.completedDate) {
        byStaff[l.performedBy].hours += Math.max(0, (new Date(l.completedDate) - new Date(l.scheduledDate)) / (1000 * 60 * 60));
      }
    });

    const staffList = Object.entries(byStaff)
      .map(([name, d]) => ({ name, count: d.count, avgHours: d.count > 0 ? (d.hours / d.count).toFixed(1) : '—' }))
      .sort((a, b) => b.count - a.count);

    return { total: filtered.length, completed: completed.length, avgHours: avgHours.toFixed(1), staffList };
  }, [filtered]);

  const generatePDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    let y = 15;
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.text('Laundry Operations Report', margin, y); y += 10;
    doc.setFontSize(10);
    doc.text(`Period: ${dateFrom} to ${dateTo}`, margin, y); y += 5;
    if (selectedBranch !== 'all') { doc.text(`Branch: ${selectedBranch}`, margin, y); y += 5; }
    if (selectedStaff !== 'all') { doc.text(`Staff: ${selectedStaff}`, margin, y); y += 5; }

    y += 5;
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Key Metrics', margin, y); y += 8;

    doc.setFontSize(9); doc.setFont(undefined, 'normal');
    [
      ['Total Items Processed', metrics.total],
      ['Items Completed', metrics.completed],
      ['Avg Turnaround Time', `${metrics.avgHours}h`],
    ].forEach(([label, val]) => {
      doc.text(label, margin, y);
      doc.text(String(val), margin + 90, y);
      y += 6;
    });

    y += 5;
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Staff Performance', margin, y); y += 8;

    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text('Staff Member', margin, y);
    doc.text('Items', margin + 80, y);
    doc.text('Avg Time', margin + 110, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    metrics.staffList.forEach(s => {
      if (y > 260) { doc.addPage(); y = 15; }
      doc.text(s.name.length > 30 ? s.name.slice(0, 27) + '...' : s.name, margin, y);
      doc.text(String(s.count), margin + 80, y);
      doc.text(`${s.avgHours}h`, margin + 110, y);
      y += 6;
    });

    y += 5;
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text('Recent Completions', margin, y); y += 8;

    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text('Equipment', margin, y);
    doc.text('Completed', margin + 80, y);
    doc.text('By', margin + 115, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    filtered.filter(l => l.completedDate).slice(0, 20).forEach(l => {
      if (y > 260) { doc.addPage(); y = 15; }
      const name = (l.equipmentName || '—').slice(0, 30);
      doc.text(name, margin, y);
      doc.text(l.completedDate || '—', margin + 80, y);
      doc.text((l.performedBy || '—').slice(0, 20), margin + 115, y);
      y += 6;
    });

    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, footerY);

    doc.save(`laundry-report-${dateFrom}-to-${dateTo}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-cyan-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-cyan-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-5xl mx-auto">
          <button onClick={() => navigate('/laundry')} className="p-2 rounded-lg hover:bg-cyan-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <Droplets className="w-5 h-5 text-cyan-300" />
            <div>
              <div className="text-lg font-bold">Laundry Performance Report</div>
              <div className="text-cyan-300 text-xs">Showcase your team's cleaning excellence</div>
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
              <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
              <select value={selectedBranch} onChange={e => setBranch(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white">
                {BRANCHES.map(b => <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Staff Member</label>
              <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white">
                <option value="all">All Staff</option>
                {allStaff.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={generatePDF} className="bg-cyan-700 hover:bg-cyan-800 gap-2">
              <Download className="w-4 h-4" /> Download PDF Report
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Items Processed', value: metrics.total, icon: Droplets, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
            { label: 'Completed', value: metrics.completed, icon: CheckCircle, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Avg Turnaround', value: `${metrics.avgHours}h`, icon: Clock, color: 'text-purple-700 bg-purple-50 border-purple-200' },
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

        {/* Staff Leaderboard */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-purple-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" /> Staff Performance
          </div>
          {metrics.staffList.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No data for this period</div>
          ) : (
            <div className="divide-y">
              {metrics.staffList.map((s, idx) => (
                <div key={s.name} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500">Avg {s.avgHours}h per item</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-700">{s.count}</div>
                    <div className="text-xs text-gray-500">items</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completions */}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-green-50 border-b px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" /> Completed Items ({filtered.filter(l => l.completedDate).length})
          </div>
          {filtered.filter(l => l.completedDate).length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No completions in this period</div>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto">
              {filtered.filter(l => l.completedDate).slice(0, 50).map(l => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">{l.equipmentName || '—'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{l.branch || '—'} · {l.performedBy || '—'}</div>
                  </div>
                  <div className="text-xs text-gray-500">{l.completedDate}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}