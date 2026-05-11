import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const BRANCHES = ['All Branches', '01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus', '98 Shop', '99 Warehouse'];

function exportToCSV(rows) {
  const headers = [
    'Name', 'Category', 'Location / Branch', 'Asset #', 'Serial #', 'Model #',
    'Status', 'Condition', 'Daily Rate', 'Weekly Rate', 'Monthly Rate', 'Deposit',
    'Bulk Qty', 'Serialized', 'Purchase Date', 'Purchase Cost',
    'Width (ft)', 'Length (ft)', 'Notes',
  ];

  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    headers.join(','),
    ...rows.map(eq => [
      eq.name,
      eq.category,
      eq.location,
      eq.assetNumber,
      eq.serialNumber,
      eq.modelNumber,
      eq.unitStatus || eq.status,
      eq.condition,
      eq.dailyRate,
      eq.weeklyRate,
      eq.monthlyRate,
      eq.depositRequired,
      eq.bulkQuantity,
      eq.serialized ? 'Yes' : 'No',
      eq.purchaseDate,
      eq.purchaseCost,
      eq.footprintWidth,
      eq.footprintLength,
      eq.notes,
    ].map(escape).join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryExport() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branch, setBranch] = useState('All Branches');
  const [category, setCategory] = useState('All Categories');

  const load = () => {
    setLoading(true);
    base44.entities.Equipment.list('name', 2000)
      .then(eq => { setEquipment(eq); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(equipment.map(e => e.category).filter(Boolean))].sort();
    return ['All Categories', ...cats];
  }, [equipment]);

  const filtered = useMemo(() => equipment.filter(eq => {
    const matchBranch = branch === 'All Branches' || eq.location === branch;
    const matchCat = category === 'All Categories' || eq.category === category;
    const matchSearch = !search ||
      eq.name?.toLowerCase().includes(search.toLowerCase()) ||
      eq.assetNumber?.toLowerCase().includes(search.toLowerCase()) ||
      eq.serialNumber?.toLowerCase().includes(search.toLowerCase());
    return matchBranch && matchCat && matchSearch;
  }), [equipment, branch, category, search]);

  // Summary by branch
  const branchCounts = useMemo(() => {
    const counts = {};
    equipment.forEach(eq => {
      const loc = eq.location || 'Unassigned';
      counts[loc] = (counts[loc] || 0) + (eq.bulkQuantity || 1);
    });
    return counts;
  }, [equipment]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/equipment-status')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Inventory Export</div>
            <div className="text-indigo-300 text-xs">{filtered.length} of {equipment.length} items</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={load} className="p-2 rounded-lg hover:bg-indigo-800 text-indigo-200">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Button
              onClick={() => exportToCSV(filtered)}
              disabled={filtered.length === 0}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV ({filtered.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* Branch summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(branchCounts).sort().map(([loc, count]) => (
            <button
              key={loc}
              onClick={() => setBranch(loc === branch ? 'All Branches' : loc)}
              className={`rounded-xl border p-3 text-center transition ${branch === loc ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
            >
              <div className={`text-2xl font-black ${branch === loc ? 'text-white' : 'text-indigo-600'}`}>{count}</div>
              <div className={`text-xs mt-1 ${branch === loc ? 'text-indigo-200' : 'text-gray-500'}`}>{loc}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, asset #, serial #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            className="h-9 border border-input rounded-md px-3 text-sm bg-white"
          >
            {BRANCHES.map(b => <option key={b}>{b}</option>)}
          </select>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-9 border border-input rounded-md px-3 text-sm bg-white"
          >
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Asset #</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Serial #</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Daily</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Weekly</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-gray-400">No items match your filters</td></tr>
                ) : filtered.map(eq => (
                  <tr key={eq.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{eq.name}</td>
                    <td className="px-4 py-3 text-gray-600">{eq.category}</td>
                    <td className="px-4 py-3 text-gray-600">{eq.location || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{eq.assetNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{eq.serialNumber || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-full">
                        {eq.bulkQuantity || 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        (eq.unitStatus || eq.status) === 'available' ? 'bg-green-100 text-green-700' :
                        (eq.unitStatus || eq.status) === 'out_on_rental' ? 'bg-blue-100 text-blue-700' :
                        (eq.unitStatus || eq.status) === 'in_shop' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {eq.unitStatus || eq.status || 'available'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{eq.dailyRate ? `$${eq.dailyRate}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{eq.weeklyRate ? `$${eq.weeklyRate}` : '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{eq.monthlyRate ? `$${eq.monthlyRate}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          CSV export includes all visible columns plus dimensions, condition, purchase cost, and notes.
        </p>
      </div>
    </div>
  );
}