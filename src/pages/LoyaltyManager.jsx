import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Send, Settings, Download, Heart, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoyaltyManager() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Settings for the outreach function
  const [daysSinceLastRental, setDaysSinceLastRental] = useState(60);
  const [minRentals, setMinRentals] = useState(5);
  const [daysBack, setDaysBack] = useState(365);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('loyaltyOutreach', {
        daysSinceLastRental: parseInt(daysSinceLastRental),
        minRentals: parseInt(minRentals),
        daysBack: parseInt(daysBack),
      });
      setResults(res.data);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const filtered = useMemo(() => {
    if (!results?.candidates) return [];
    let list = [...results.candidates];

    // Filter by inactivity duration
    if (filter !== 'all') {
      const days = parseInt(filter);
      list = list.filter(c => c.daysInactive >= days);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.customerName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }

    return list;
  }, [results, filter, search]);

  const exportCSV = () => {
    if (!results?.candidates) return;
    const headers = ['Customer Name', 'Email', 'Total Rentals', 'Days Inactive', 'Top Equipment', 'Top Categories'];
    const rows = results.candidates.map(c => [
      c.customerName,
      c.email,
      c.totalRentals,
      c.daysInactive,
      (c.topEquipment || []).join('; '),
      (c.topCategories || []).join('; '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loyalty-outreach-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white sticky top-0 z-10 shadow-lg" style={{ backgroundColor: '#0d1b3e' }}>
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:opacity-80" style={{ backgroundColor: 'rgba(245, 166, 35, 0.1)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Loyalty Manager</div>
            <div className="text-xs" style={{ color: '#F5A623' }}>AI-powered customer re-engagement & retention</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Settings Card */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex items-center gap-2 font-bold text-lg text-gray-900 mb-4">
            <Settings className="w-5 h-5 text-indigo-600" /> Outreach Criteria
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Inactive Since (days)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={daysSinceLastRental}
                onChange={e => setDaysSinceLastRental(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Target customers who haven't rented in N days</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Minimum Rental History
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={minRentals}
                onChange={e => setMinRentals(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Must have at least N rentals</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                History Window (days)
              </label>
              <Input
                type="number"
                min="30"
                max="1095"
                value={daysBack}
                onChange={e => setDaysBack(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Analyze preferences from last N days</p>
            </div>
          </div>
          <Button
            onClick={handleRun}
            disabled={running}
            className="w-full gap-2 h-10 text-white hover:opacity-90"
            style={{ backgroundColor: '#F5A623' }}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Run Outreach Analysis
          </Button>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-lg text-gray-900">
                  {results.outreachCount} Candidates Found
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Loyal customers inactive {daysSinceLastRental}+ days with personalized equipment preferences
                </p>
              </div>
              {results.outreachCount > 0 && (
                <Button
                  onClick={exportCSV}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
              )}
            </div>

            {/* Filter & Search */}
            {results.outreachCount > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="all">All Candidates</option>
                  <option value="60">60+ days inactive</option>
                  <option value="90">90+ days inactive</option>
                  <option value="180">180+ days inactive</option>
                </select>
              </div>
            )}

            {/* Candidates List */}
            {results.outreachCount === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No candidates match these criteria. Adjust settings and try again.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filtered.map((candidate, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 hover:bg-indigo-50 transition grid grid-cols-1 sm:grid-cols-5 gap-3 items-center"
                  >
                    <div className="sm:col-span-2 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{candidate.customerName}</div>
                      <div className="text-xs text-gray-500 truncate">{candidate.email}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Rentals</div>
                      <div className="font-bold text-gray-900">{candidate.totalRentals}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> Inactive
                      </div>
                      <div className="font-bold text-amber-600">{candidate.daysInactive}d</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 mb-1">
                        {candidate.topEquipment?.length > 0 && <div>{candidate.topEquipment[0]}</div>}
                      </div>
                      <Button size="sm" variant="outline" className="w-full text-xs gap-1">
                        <Send className="w-3 h-3" /> Outreach
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info card */}
        {!results && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <h3 className="font-semibold text-indigo-900 mb-2">How it works</h3>
            <ul className="text-sm text-indigo-800 space-y-2">
              <li className="flex gap-2">
                <span className="text-indigo-600 font-bold">1.</span>
                <span>Identify loyal customers who haven't rented recently</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-600 font-bold">2.</span>
                <span>Analyze their equipment preferences based on rental history</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-600 font-bold">3.</span>
                <span>Export and send personalized re-engagement offers (email, SMS, or manual outreach)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-600 font-bold">4.</span>
                <span>Track campaign performance and adjust over time</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}