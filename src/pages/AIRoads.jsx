import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Truck, Package, Scale, Printer, Download, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadPlanner from '@/components/airoads/LoadPlanner';
import LoadManifest from '@/components/airoads/LoadManifest';
import EquipmentPicker from '@/components/airoads/EquipmentPicker';
import ShippingLabels from '@/components/airoads/ShippingLabels';
import TransitScanner from '@/components/airoads/TransitScanner';
import LabelStockSelector from '@/components/airoads/LabelStockSelector';
import JobPLPanel from '@/components/airoads/JobPLPanel';
import PremiumGate from '@/components/premium/PremiumGate';

const TRUCK_SPECS = {
  '18wheeler': { name: '18-Wheeler', weightCapacity: 80000, volumeCapacity: 3000, costPerMile: 3.5 },
  '26ft': { name: '26ft Box Truck', weightCapacity: 26000, volumeCapacity: 1400, costPerMile: 2.5 },
  '24ft': { name: '24ft Box Truck', weightCapacity: 24000, volumeCapacity: 1200, costPerMile: 2.2 },
  'sprinter': { name: 'Sprinter Van', weightCapacity: 5000, volumeCapacity: 300, costPerMile: 1.5 },
};

function InvoiceLinker({ onLink }) {
  const [value, setValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    const inv = value.trim().toUpperCase();
    if (!inv) return;
    setSearching(true);
    setNotFound(false);
    const rentals = await base44.entities.Rental.filter({ invoiceNumber: inv });
    if (rentals[0]) {
      onLink(rentals[0]);
    } else {
      setNotFound(true);
    }
    setSearching(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="e.g. MCL-9901"
          value={value}
          onChange={e => { setValue(e.target.value); setNotFound(false); }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1 h-9 border border-amber-300 rounded-md px-3 text-sm bg-white"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !value.trim()}
          className="px-4 h-9 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-md disabled:opacity-50 flex items-center gap-1"
        >
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Link'}
        </button>
      </div>
      {notFound && <div className="text-xs text-red-600">Invoice not found. Try MCL-9901.</div>}
    </div>
  );
}

function estimateWeight(item) {
  const cat = (item.category || '').toLowerCase();
  const name = (item.equipmentName || '').toLowerCase();
  if (cat === 'tent') return (item.widthFt || 20) * (item.lengthFt || 20) * 2.5;
  if (cat === 'staging') return (item.widthFt || 4) * (item.lengthFt || 8) * 8;
  if (cat === 'table') return 35;
  if (cat === 'chair') return 8;
  if (cat === 'generator' || name.includes('generator')) return 2200;
  if (cat === 'light tower' || name.includes('light tower')) return 1800;
  return 100;
}

function estimateVolume(item) {
  const cat = (item.category || '').toLowerCase();
  const name = (item.equipmentName || '').toLowerCase();
  if (cat === 'tent') return (item.widthFt || 20) * (item.lengthFt || 20) * 0.5;
  if (cat === 'staging') return (item.widthFt || 4) * (item.lengthFt || 8) * 0.5;
  if (cat === 'table') return 12;
  if (cat === 'chair') return 1.5;
  if (cat === 'generator' || name.includes('generator')) return 40;
  if (cat === 'light tower' || name.includes('light tower')) return 30;
  return 5;
}

export default function AIRoads() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan');

  const [eventPlan, setEventPlan] = useState(null);
  const [eventEquipment, setEventEquipment] = useState([]);
  const [loads, setLoads] = useState([]);
  const [activeTab, setActiveTab] = useState('planner');
  const [selectedTruckForLabels, setSelectedTruckForLabels] = useState(null);
  const [selectedTruckForScanner, setSelectedTruckForScanner] = useState(null);
  const [labelStock, setLabelStock] = useState(null);
  const [showStockSelector, setShowStockSelector] = useState(false);
  const [autoBalancing, setAutoBalancing] = useState(false);
  const [autoPacking, setAutoPacking] = useState(false);
  const [distance, setDistance] = useState(350);
  const [loading, setLoading] = useState(true);
  const [numTrucks, setNumTrucks] = useState(2);
  const [truckType, setTruckType] = useState('18wheeler');
  const [allEquipment, setAllEquipment] = useState([]);
  const [eventPlans, setEventPlans] = useState([]);
  const [linkedRental, setLinkedRental] = useState(null);

  // Load event plan, equipment catalog, and event plans on mount
  useEffect(() => {
    (async () => {
      const [eq, plans] = await Promise.all([
        base44.entities.Equipment.list('name', 2000),
        base44.entities.EventPlan.list('-created_date', 100),
      ]);
      setAllEquipment(eq);
      setEventPlans(plans);

      if (planId) {
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        setEventPlan(plan);
        const items = plan.canvasItems || plan.equipment || [];
        if (items.length > 0) {
          // Expand canvas items by quantity and attach weight/volume defaults
          const expanded = items.flatMap(item => {
            const qty = item.quantity || 1;
            return Array.from({ length: qty }).map((_, i) => ({
              ...item,
              id: `${item.id}-${i}`,
              quantity: 1,
              weight: item.weight || estimateWeight(item),
              volume: item.volume || estimateVolume(item),
            }));
          });
          setEventEquipment(expanded);
        }
        if (plan.linkedRentalInvoice) {
          const rentals = await base44.entities.Rental.filter({ invoiceNumber: plan.linkedRentalInvoice });
          if (rentals[0]) setLinkedRental(rentals[0]);
        }
      }
      }
      setLoading(false);
    })();
  }, [planId]);

  // Sync loads with numTrucks input
  useEffect(() => {
    if (numTrucks > loads.length) {
      // Add trucks
      const toAdd = numTrucks - loads.length;
      const newTrucks = Array.from({ length: toAdd }).map((_, i) => ({
        id: `truck-${Date.now()}-${i}`,
        name: `Truck ${loads.length + i + 1}`,
        type: truckType,
        items: [],
      }));
      setLoads([...loads, ...newTrucks]);
    } else if (numTrucks < loads.length) {
      // Remove trucks (move items back to unassigned)
      const removed = loads.slice(numTrucks);
      removed.forEach(t => {
        if (t.items) setEventEquipment(prev => [...prev, ...t.items]);
      });
      setLoads(loads.slice(0, numTrucks));
    }
  }, [numTrucks]);

  const handleAutoBalance = async () => {
    if (eventEquipment.length === 0) {
      alert('Add equipment first before balancing.');
      return;
    }
    setAutoBalancing(true);
    try {
      const res = await base44.functions.invoke('optimizeLoadDistribution', {
        equipment: eventEquipment,
        numTrucks,
        truckType,
      });
      if (res.data?.loads) {
        setLoads(res.data.loads);
        setEventEquipment([]); // Clear unassigned after balance
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAutoBalancing(false);
    }
  };

  const handleAutoPack = async () => {
    if (eventEquipment.length === 0) {
      alert('Add equipment first before packing.');
      return;
    }
    setAutoPacking(true);
    try {
      const res = await base44.functions.invoke('autoPackEquipment', {
        equipment: eventEquipment,
        numTrucks,
        truckType,
      });
      if (res.data?.loads) {
        setLoads(res.data.loads);
        setEventEquipment([]); // Clear unassigned after pack
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setAutoPacking(false);
    }
  };

  const handleAddTruck = () => {
    const newTruck = {
      id: `truck-${Date.now()}`,
      name: `Truck ${loads.length + 1}`,
      type: truckType,
      items: [],
    };
    setLoads([...loads, newTruck]);
  };

  const handleRemoveTruck = (id) => {
    if (loads.length > 1) {
      const removed = loads.find(t => t.id === id);
      // Move items back to unassigned
      if (removed?.items) {
        setEventEquipment([...eventEquipment, ...removed.items]);
      }
      setLoads(loads.filter(t => t.id !== id));
    }
  };

  const stats = useMemo(() => {
    const totalWeight = eventEquipment.reduce((sum, e) => sum + (e.weight || 0), 0);
    const totalVolume = eventEquipment.reduce((sum, e) => sum + (e.volume || 0), 0);
    const assignedWeight = loads.reduce((sum, t) => sum + (t.items?.reduce((s, e) => s + (e.weight || 0), 0) || 0), 0);
    const assignedVolume = loads.reduce((sum, t) => sum + (t.items?.reduce((s, e) => s + (e.volume || 0), 0) || 0), 0);
    const spec = TRUCK_SPECS[truckType];
    const costPerTruck = (distance * 2) * (spec?.costPerMile || 2);
    const totalCost = costPerTruck * loads.length;

    return { totalWeight, totalVolume, assignedWeight, assignedVolume, costPerTruck, totalCost };
  }, [eventEquipment, loads, truckType, distance]);

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
        <div className="px-4 py-3 flex items-center gap-3 max-w-7xl mx-auto">
          <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-indigo-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">AIRoads – Load Planner</div>
            <div className="text-indigo-300 text-xs">
              {eventPlan ? `${eventPlan.eventName} • ${eventEquipment.length} items` : 'Load optimization & logistics'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition ${
                activeTab === 'planner'
                  ? 'bg-white text-indigo-900'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              Planner
            </button>
            <button
              onClick={() => setActiveTab('manifest')}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition ${
                activeTab === 'manifest'
                  ? 'bg-white text-indigo-900'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              Manifest
            </button>
            <button
              onClick={() => setActiveTab('labels')}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition ${
                activeTab === 'labels'
                  ? 'bg-white text-indigo-900'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              Labels
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition ${
                activeTab === 'scanner'
                  ? 'bg-white text-indigo-900'
                  : 'text-indigo-200 hover:bg-indigo-800'
              }`}
            >
              Scanner
            </button>
            <button
              onClick={() => setActiveTab('pl')}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition ${
                activeTab === 'pl'
                  ? 'bg-emerald-400 text-indigo-900'
                  : 'text-emerald-300 hover:bg-indigo-800'
              }`}
            >
              💰 P&amp;L
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* EventPlan Selector */}
        {eventPlans.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-blue-900 mb-2">Load from EventPlan</label>
            <select
              onChange={async e => {
                if (e.target.value) {
                  const plan = eventPlans.find(p => p.id === e.target.value);
                  if (plan) {
                    setEventPlan(plan);
                    const items = plan.canvasItems || plan.equipment || [];
                    const expanded = items.flatMap(item => {
                      const qty = item.quantity || 1;
                      return Array.from({ length: qty }).map((_, i) => ({
                        ...item,
                        id: `${item.id}-${i}`,
                        quantity: 1,
                        weight: item.weight || estimateWeight(item),
                        volume: item.volume || estimateVolume(item),
                      }));
                    });
                    setEventEquipment(expanded);
                    // Auto-link rental if the plan has one
                    if (plan.linkedRentalInvoice) {
                      const rentals = await base44.entities.Rental.filter({ invoiceNumber: plan.linkedRentalInvoice });
                      if (rentals[0]) setLinkedRental(rentals[0]);
                    } else {
                      setLinkedRental(null);
                    }
                  }
                }
              }}
              className="w-full h-9 border border-blue-300 rounded-md px-3 bg-white text-sm"
              defaultValue=""
            >
              <option value="">— Select a plan —</option>
              {eventPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.title || plan.eventName} ({plan.canvasItems?.length || plan.equipment?.length || 0} items)
                  {plan.linkedRentalInvoice ? ` · ${plan.linkedRentalInvoice}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Settings & Stats */}
        <div className="bg-white rounded-xl border shadow-sm p-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Truck config */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Truck Type</label>
            <select
              value={truckType}
              onChange={e => setTruckType(e.target.value)}
              className="w-full h-9 border border-input rounded-md px-2 bg-white text-sm"
            >
              {Object.entries(TRUCK_SPECS).map(([key, spec]) => (
                <option key={key} value={key}>{spec.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Number of Trucks</label>
            <div className="flex gap-1">
              <Input
                type="number"
                min="1"
                max="10"
                value={numTrucks}
                onChange={e => setNumTrucks(parseInt(e.target.value) || 1)}
                className="flex-1 h-9 text-sm"
              />
              <Button size="sm" variant="outline" onClick={handleAddTruck} className="px-2">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Distance (miles)</label>
            <Input
              type="number"
              min="0"
              value={distance}
              onChange={e => setDistance(parseInt(e.target.value) || 0)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={handleAutoPack}
              disabled={autoPacking || eventEquipment.length === 0}
              className="flex-1 bg-amber-600 hover:bg-amber-700 gap-2 h-9 text-sm"
              title="Balance weight distribution across trucks"
            >
              {autoPacking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
              Auto Pack
            </Button>
            <Button
              onClick={handleAutoBalance}
              disabled={autoBalancing || eventEquipment.length === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2 h-9 text-sm"
              title="Minimize trucks while respecting limits"
            >
              {autoBalancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
              Optimize
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">Total Weight</div>
            <div className="font-bold text-gray-900">{(stats.totalWeight / 1000).toFixed(1)}k lbs</div>
            <div className="text-xs text-gray-400 mt-1">{(stats.assignedWeight / 1000).toFixed(1)}k assigned</div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">Total Volume</div>
            <div className="font-bold text-gray-900">{stats.totalVolume.toLocaleString()} cu ft</div>
            <div className="text-xs text-gray-400 mt-1">{stats.assignedVolume.toLocaleString()} assigned</div>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="text-xs text-gray-500">Per Truck Cost</div>
            <div className="font-bold text-gray-900">${stats.costPerTruck.toFixed(0)}</div>
            <div className="text-xs text-gray-400 mt-1">{distance * 2} mi round-trip</div>
          </div>
          <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-3">
            <div className="text-xs text-indigo-600">Total Transport Cost</div>
            <div className="font-bold text-indigo-900">${stats.totalCost.toFixed(0)}</div>
            <div className="text-xs text-indigo-500 mt-1">{loads.length} trucks</div>
          </div>
        </div>

        {/* Equipment Picker */}
        <EquipmentPicker
          equipment={eventEquipment}
          allEquipment={allEquipment}
          onAdd={(item) => setEventEquipment([...eventEquipment, item])}
        />

        {/* Main content */}
        {activeTab === 'planner' && (
          <LoadPlanner
            eventEquipment={eventEquipment}
            loads={loads}
            truckSpecs={TRUCK_SPECS}
            onLoadsChange={setLoads}
            onEquipmentChange={setEventEquipment}
            onRemoveTruck={handleRemoveTruck}
          />
        )}

        {activeTab === 'manifest' && (
          <LoadManifest loads={loads} truckSpecs={TRUCK_SPECS} distance={distance} />
        )}

        {activeTab === 'labels' && (
          <div className="space-y-6">
            {loads.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                No trucks loaded yet. Create and load a truck first.
              </div>
            ) : (
              <>
                {showStockSelector && (
                  <LabelStockSelector
                    onSelect={(stock) => {
                      setLabelStock(stock);
                      setShowStockSelector(false);
                    }}
                    onCancel={() => setShowStockSelector(false)}
                  />
                )}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Select Truck & Label Stock</h3>
                    {labelStock && (
                      <Button
                        onClick={() => setShowStockSelector(true)}
                        variant="outline"
                        size="sm"
                      >
                        Change Stock
                      </Button>
                    )}
                  </div>
                  {!labelStock ? (
                    <Button
                      onClick={() => setShowStockSelector(true)}
                      className="w-full"
                    >
                      Choose Label Stock Format
                    </Button>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {loads.map(truck => (
                          <Button
                            key={truck.id}
                            onClick={() => setSelectedTruckForLabels(truck)}
                            variant={selectedTruckForLabels?.id === truck.id ? 'default' : 'outline'}
                            className="justify-start"
                          >
                            {truck.name} ({truck.items?.length || 0} items)
                          </Button>
                        ))}
                      </div>
                      {selectedTruckForLabels && (
                        <ShippingLabels truck={selectedTruckForLabels} labelStock={labelStock} />
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'pl' && (
          <PremiumGate requiredTier="pro" featureName="Job P&L Tracking">
            <div className="space-y-4">
              {/* Link a rental manually if no eventPlan has one */}
              {!linkedRental && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="text-sm font-semibold text-amber-800 mb-2">Link a Rental Invoice</div>
                  <InvoiceLinker onLink={setLinkedRental} />
                </div>
              )}
              {linkedRental && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div>
                    <div className="font-semibold text-emerald-900 text-sm">{linkedRental.customerName}</div>
                    <div className="text-xs text-emerald-700">{linkedRental.invoiceNumber} · {linkedRental.equipmentName}</div>
                  </div>
                  <button onClick={() => setLinkedRental(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">Unlink</button>
                </div>
              )}
              <JobPLPanel rental={linkedRental} branch={linkedRental?.branch || ''} />
            </div>
          </PremiumGate>
        )}

        {activeTab === 'scanner' && (
          <div className="space-y-6">
            {loads.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                No trucks loaded yet. Create and load a truck first.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {loads.map(truck => (
                    <Button
                      key={truck.id}
                      onClick={() => setSelectedTruckForScanner(truck)}
                      variant={selectedTruckForScanner?.id === truck.id ? 'default' : 'outline'}
                      className="justify-start"
                    >
                      {truck.name} ({truck.items?.length || 0} items)
                    </Button>
                  ))}
                </div>
                {selectedTruckForScanner && (
                  <TransitScanner truck={selectedTruckForScanner} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}