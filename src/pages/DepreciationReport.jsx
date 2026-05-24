import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Download, Loader2 } from 'lucide-react';
import AppPageHeader from '@/components/AppPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calculateDepreciation } from '@/lib/depreciation';

export default function DepreciationReport() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('all');

  const load = () => {
    setLoading(true);
    base44.entities.Equipment.list('-updated_date', 500)
      .then(eq => setEquipment(eq.filter(e => e.purchaseCost && e.usefulLifeYears)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const depreciated = useMemo(() => {
    const asOf = new Date(asOfDate);
    return equipment
      .map(eq => ({
        ...eq,
        depreciation: calculateDepreciation(eq, asOf),
      }))
      .filter(eq => {
        const matchSearch = !search || 
          eq.name.toLowerCase().includes(search.toLowerCase()) ||
          eq.assetNumber?.toLowerCase().includes(search.toLowerCase());
        const matchCategory = filterCategory === 'all' || eq.category === filterCategory;
        return matchSearch && matchCategory;
      })
      .sort((a, b) => (b.depreciation?.totalDepreciation || 0) - (a.depreciation?.totalDepreciation || 0));
  }, [equipment, search, asOfDate, filterCategory]);

  const categories = useMemo(() => {
    return [...new Set(equipment.map(e => e.category).filter(Boolean))].sort();
  }, [equipment]);

  const totals = useMemo(() => {
    return depreciated.reduce((sum, eq) => ({
      costBasis: sum.costBasis + (eq.purchaseCost || 0),
      totalDepreciation: sum.totalDepreciation + (eq.depreciation?.totalDepreciation || 0),
      bookValue: sum.bookValue + (eq.depreciation?.bookValue || 0),
    }), { costBasis: 0, totalDepreciation: 0, bookValue: 0 });
  }, [depreciated]);

  const handleExport = () => {
    const csv = [
      ['Asset', 'Category', 'Asset Number', 'Purchase Date', 'Cost Basis', 'Method', 'Useful Life', 'Years Elapsed', 'Annual Depreciation', 'Total Depreciation', 'Book Value', 'Depreciation %'],
      ...depreciated.map(eq => [
        eq.name,
        eq.category,
        eq.assetNumber || '-',
        eq.purchaseDate || '-',
        `$${eq.purchaseCost.toFixed(2)}`,
        eq.depreciation?.depreciationMethod === 'declining_balance' ? 'DDB' : 'SL',
        eq.usefulLifeYears,
        eq.depreciation?.yearsElapsed || 0,
        `$${((eq.purchaseCost - (eq.salvageValue || 0)) / eq.usefulLifeYears).toFixed(2)}`,
        `$${eq.depreciation?.totalDepreciation.toFixed(2)}`,
        `$${eq.depreciation?.bookValue.toFixed(2)}`,
        `${eq.depreciation?.depreciationPercentage}%`,
      ]),
      [],
      ['TOTALS', '', '', '', `$${totals.costBasis.toFixed(2)}`, '', '', '', '', `$${totals.totalDepreciation.toFixed(2)}`, `$${totals.bookValue.toFixed(2)}`],
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depreciation-report-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="Depreciation Report"
        subtitle={`${equipment.length} assets in catalog`}
        icon={Download}
        backTo="/lupine"
        action={<button onClick={load} disabled={loading} className="p-1.5 rounded-lg hover:bg-white/10 text-white"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-gray-600 block mb-1">As Of Date</label>
            <Input 
              type="date" 
              value={asOfDate} 
              onChange={e => setAsOfDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-gray-600 block mb-1">Search</label>
            <Input
              placeholder="Name, category, asset #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full h-9 border border-input rounded-md px-3 text-sm bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <Button onClick={handleExport} className="gap-2 text-white hover:opacity-90" style={{ backgroundColor: '#F5A623' }}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Cost Basis</div>
            <div className="text-2xl font-bold text-gray-900">${totals.costBasis.toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">{depreciated.length} assets</div>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Depreciation</div>
            <div className="text-2xl font-bold text-red-600">${totals.totalDepreciation.toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">{((totals.totalDepreciation / totals.costBasis) * 100).toFixed(1)}% of cost</div>
          </div>
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">Total Book Value</div>
            <div className="text-2xl font-bold text-green-600">${totals.bookValue.toFixed(2)}</div>
            <div className="text-xs text-gray-400 mt-1">as of {asOfDate}</div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : depreciated.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm bg-white rounded-lg border">
            No equipment with depreciation configured
          </div>
        ) : (
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Asset</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Asset #</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Cost</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Method</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Years</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Depreciation</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Book Value</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {depreciated.map(eq => (
                  <tr key={eq.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 text-gray-900 font-medium">{eq.name}</td>
                    <td className="px-4 py-2 text-gray-600 text-xs">{eq.category}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{eq.assetNumber || '-'}</td>
                    <td className="px-4 py-2 text-right text-gray-900 font-medium">${eq.purchaseCost.toFixed(2)}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {eq.depreciation?.depreciationMethod === 'declining_balance' ? 'DDB' : 'SL'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {eq.depreciation?.yearsElapsed.toFixed(1)} / {eq.usefulLifeYears}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-medium">
                      ${eq.depreciation?.totalDepreciation.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600 font-medium">
                      ${eq.depreciation?.bookValue.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600 text-xs">
                      {eq.depreciation?.depreciationPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}