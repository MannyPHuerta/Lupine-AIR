import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, AlertCircle, Loader2, Settings, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RentalForm from '@/components/RentalForm';

export default function AvailabilityManager() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [conflicts, setConflicts] = useState([]);
  const [migrating, setMigrating] = useState(false);
  const [showRentalForm, setShowRentalForm] = useState(false);
  const [searchStr, setSearchStr] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const fetchData = async () => {
    const [eq, rent] = await Promise.all([
      base44.entities.Equipment.list('-created_date', 500),
      base44.entities.Rental.list('-created_date', 1000)
    ]);
    setEquipment(eq);
    setRentals(rent);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const searchResults = searchStr
    ? equipment.filter(eq => eq.name.toUpperCase().startsWith(searchStr))
    : [];

  // Quick search by accumulated letters
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !showRentalForm) {
        e.preventDefault();
        setSearchStr(prev => (prev + e.key).toUpperCase());
        setShowSearch(true);
      }
      if (e.key === 'Backspace' && showSearch) {
        e.preventDefault();
        setSearchStr(prev => {
          const next = prev.slice(0, -1);
          if (!next) setSelectedEquipmentId(null);
          return next;
        });
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchStr('');
        setSelectedEquipmentId(null);
      }
      if (e.key === 'Enter' && showSearch && searchResults.length > 0) {
        e.preventDefault();
        setSelectedEquipmentId(searchResults[0].id);
        setShowSearch(false);
        setSearchStr('');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showSearch, showRentalForm, searchResults]);

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const result = await base44.functions.invoke('migrateItemsToEquipment', {});
      await fetchData();
      alert(`✓ Created ${result.created} equipment items`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  const checkConflicts = (equipId, startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const conflicting = rentals.filter(r => {
      if (r.equipmentId !== equipId) return false;
      if (['cancelled', 'completed'].includes(r.status)) return false;
      
      const rStart = new Date(r.startDate);
      const rEnd = new Date(r.endDate);
      
      return !(end < rStart || start > rEnd);
    });
    
    setConflicts(conflicting);
    return conflicting.length === 0;
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    const newRange = { ...dateRange, [name]: value };
    setDateRange(newRange);
    
    if (selectedEquipmentId && newRange.start && newRange.end) {
      checkConflicts(selectedEquipmentId, newRange.start, newRange.end);
    }
  };

  const isConflictFree = conflicts.length === 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/lupine')}
            className="text-white p-2 rounded-lg hover:bg-indigo-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-lg font-bold">Availability Manager</div>
            <div className="text-indigo-300 text-xs">Phase 1 — Equipment Calendars</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-indigo-200 text-sm">{equipment.length} items · {rentals.length} rentals</span>
            <button
              onClick={() => navigate('/pricing-editor')}
              className="text-indigo-200 hover:bg-indigo-800 p-2 rounded-lg transition"
              title="Edit pricing"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Migration Banner */}
        {equipment.length === 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-indigo-900">No equipment yet. Migrate approved catalog items to get started.</p>
            <Button
              onClick={handleMigrate}
              disabled={migrating}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {migrating ? 'Migrating...' : 'Migrate Catalog'}
            </Button>
          </div>
        )}

        {/* Quick Check Availability */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Check Availability
          </h2>
          
          <div className="space-y-4">
            {/* Equipment selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipment</label>
              <select
                value={selectedEquipmentId || ''}
                onChange={(e) => {
                  setSelectedEquipmentId(e.target.value);
                  setDateRange({ start: '', end: '' });
                  setConflicts([]);
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select equipment...</option>
                {equipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            {selectedEquipmentId && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <Input
                    type="date"
                    name="start"
                    value={dateRange.start}
                    onChange={handleDateChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <Input
                    type="date"
                    name="end"
                    value={dateRange.end}
                    onChange={handleDateChange}
                  />
                </div>
              </div>
            )}

            {/* Conflict status */}
            {dateRange.start && dateRange.end && (
              <div className={`p-4 rounded-lg flex items-start gap-3 ${
                isConflictFree
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  isConflictFree ? 'text-green-600' : 'text-red-600'
                }`} />
                <div>
                  <div className={`font-medium ${isConflictFree ? 'text-green-900' : 'text-red-900'}`}>
                    {isConflictFree ? '✓ Available' : `⚠ ${conflicts.length} Conflict(s)`}
                  </div>
                  {!isConflictFree && (
                    <div className="text-xs text-red-700 mt-2 space-y-1">
                      {conflicts.map(c => (
                        <div key={c.id}>
                          {c.customerName} ({c.startDate} → {c.endDate})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isConflictFree && dateRange.start && dateRange.end && (
              <Button
                onClick={() => setShowRentalForm(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <Plus className="w-4 h-4" /> Create Rental
              </Button>
            )}
          </div>
        </div>

        {/* Equipment Grid */}
        <div>
          <h2 className="text-lg font-bold mb-4">Equipment Catalog</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map(eq => {
              const activeRentals = rentals.filter(
                r => r.equipmentId === eq.id && !['cancelled', 'completed'].includes(r.status)
              );
              return (
                <div key={eq.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{eq.name}</h3>
                      <p className="text-xs text-gray-500">{eq.category}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      eq.status === 'available'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {eq.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Rate:</span>
                      <span className="font-medium">${eq.dailyRate}</span>
                    </div>
                    {activeRentals.length > 0 && (
                      <div className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mt-2">
                        {activeRentals.length} active rental(s)
                      </div>
                    )}
                  </div>
                  {eq.notes && (
                    <p className="text-xs text-gray-500 italic">{eq.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showRentalForm && selectedEquipmentId && (
          <RentalForm
            equipment={equipment.find(e => e.id === selectedEquipmentId)}
            startDate={dateRange.start}
            endDate={dateRange.end}
            onClose={() => setShowRentalForm(false)}
            onSuccess={() => {
              fetchData();
              setDateRange({ start: '', end: '' });
              setSelectedEquipmentId(null);
            }}
          />
        )}

        {/* Quick Search Modal */}
        {showSearch && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-4 border-b flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" />
                <span className="font-mono font-bold text-xl text-indigo-700">{searchStr}</span>
                <span className="text-sm text-gray-500 ml-auto">{searchResults.length} match(es)</span>
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchStr('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No matches for "{searchStr}"</div>
                ) : (
                  <div className="divide-y">
                    {searchResults.map((eq, idx) => (
                      <button
                        key={eq.id}
                        onClick={() => {
                          setSelectedEquipmentId(eq.id);
                          setShowSearch(false);
                          setSearchStr('');
                        }}
                        className={`w-full px-4 py-3 transition text-left ${
                          idx === 0 ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{eq.name}</div>
                        <div className="text-xs text-gray-500">{eq.category} • ${eq.dailyRate}/day</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-3 bg-gray-50 border-t text-xs text-gray-600">
                Type to narrow • Enter to select • Esc to close • Backspace to delete
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}