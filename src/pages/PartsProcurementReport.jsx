import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Loader2, Package, DollarSign, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartsProcurementReport() {
  const navigate = useNavigate();
  const [procurements, setProcurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    base44.entities.PartsProcurement.list('-purchaseDate', 1000)
      .then(setProcurements)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59);

    return procurements.filter(p => {
      const pDate = new Date(p.purchaseDate);
      const branchMatch = branch === 'all' || p.branch === branch;
      const statusMatch = status === 'all' || p.status === status;
      const dateMatch = pDate >= startDate && pDate <= endDate;
      return branchMatch && statusMatch && dateMatch;
    });
  }, [procurements, branch, status, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    const totalSpent = filtered.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const pending = filtered.filter(p => p.status === 'ordered' || p.status === 'in_transit').length;
    const received = filtered.filter(p => p.status === 'received').length;
    const avgUnitCost = filtered.length > 0
      ? (filtered.reduce((sum, p) => sum + (p.unitCost || 0), 0) / filtered.length)
      : 0;

    return { totalSpent, pending, received, avgUnitCost, totalItems: filtered.length };
  }, [filtered]);

  const branches = ['all', ...new Set(procurements.map(p => p.branch).filter(Boolean))];

  const handleExportCSV = () => {
    const headers = ['Part Name', 'Vendor', 'Qty', 'Unit Cost', 'Total Cost', 'Status', 'Purchase Date', 'Received Date', 'Invoice #', 'Branch'];
    const rows = filtered.map(p => [
      p.partName,
      p.vendor,
      p.quantity,
      `$${(p.unitCost || 0).toFixed(2)}`,
      `$${(p.totalCost || 0).toFixed(2)}`,
      p.status,
      p.purchaseDate || '—',
      p.receivedDate || '—',
      p.invoiceNumber || '—',
      p.branch || '—',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `parts-procurement-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  const statusColors = {
    ordered: 'bg-yellow-100 text-yellow-700',
    in_transit: 'bg-blue-100 text-blue-700',
    received: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/shop-floor')} className="p-2 rounded-lg hover:bg-orange-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Parts Procurement Report</div>
            <div className="text-orange-300 text-xs">{filtered.length} parts tracked</div>
          </div>
          <Button
            onClick={handleExportCSV}
            className="bg-white text-orange-900 hover:bg-orange-50 gap-2"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
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
              <label className="text-xs font-medium text-gray-600 block mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white"
              >
                <option value="all">All Status</option>
                <option value="ordered">Ordered</option>
                <option value="in_transit">In Transit</option>
                <option value="received">Received</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Branch</label>
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full h-9 border border-gray-300 rounded px-3 text-sm bg-white"
              >
                {branches.map(b => <option key={b} value={b}>{b === 'all' ? 'All Branches' : b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-gray-600">Total Spent</div>
                <div className="text-2xl font-bold text-orange-700 mt-2">${metrics.totalSpent.toFixed(0)}</div>
              </div>
              <DollarSign className="w-5 h-5 text-orange-700 opacity-50" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-gray-600">Pending</div>
                <div className="text-2xl font-bold text-yellow-700 mt-2">{metrics.pending}</div>
              </div>
              <Package className="w-5 h-5 text-yellow-700 opacity-50" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-gray-600">Received</div>
                <div className="text-2xl font-bold text-green-700 mt-2">{metrics.received}</div>
              </div>
              <CheckCircle className="w-5 h-5 text-green-700 opacity-50" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium text-gray-600">Avg Unit Cost</div>
                <div className="text-2xl font-bold text-blue-700 mt-2">${metrics.avgUnitCost.toFixed(2)}</div>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-700 opacity-50" />
            </div>
          </div>
        </div>

        {/* Parts Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Part Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Vendor</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Unit Cost</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Purchase Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                      No parts found for selected filters
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-900">{p.partName}</td>
                      <td className="px-4 py-3 text-gray-600">{p.vendor}</td>
                      <td className="px-4 py-3 text-center text-gray-900 font-medium">{p.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-900">${(p.unitCost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-semibold">${(p.totalCost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.purchaseDate || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{p.receivedDate || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary stats */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-600" />
                Supply Chain Status
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Parts Ordered</span>
                  <span className="font-medium">{filtered.filter(p => p.status === 'ordered').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>In Transit</span>
                  <span className="font-medium">{filtered.filter(p => p.status === 'in_transit').length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Received</span>
                  <span className="font-medium">{filtered.filter(p => p.status === 'received').length}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span>Total Items Ordered</span>
                  <span className="font-bold">{filtered.reduce((sum, p) => sum + p.quantity, 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-orange-600" />
                Cost Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Ordered</span>
                  <span className="font-medium">${filtered.filter(p => p.status === 'ordered').reduce((s, p) => s + (p.totalCost || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>In Transit</span>
                  <span className="font-medium">${filtered.filter(p => p.status === 'in_transit').reduce((s, p) => s + (p.totalCost || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Received</span>
                  <span className="font-medium">${filtered.filter(p => p.status === 'received').reduce((s, p) => s + (p.totalCost || 0), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Total Cost</span>
                  <span>${metrics.totalSpent.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}