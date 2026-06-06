import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Truck, Package, Scale, Printer, Download, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AppPageHeader from '@/components/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadPlanner from '@/components/airoads/LoadPlanner';
import LoadManifest from '@/components/airoads/LoadManifest';
import EquipmentPicker from '@/components/airoads/EquipmentPicker';
import ShippingLabels from '@/components/airoads/ShippingLabels';
import TransitScanner from '@/components/airoads/TransitScanner';
import LabelStockSelector from '@/components/airoads/LabelStockSelector';
import JobPLPanel from '@/components/airoads/JobPLPanel';
import FleetCostNudge from '@/components/airoads/FleetCostNudge';
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

  // Apply numTrucks only when the user explicitly changes it via the +/- controls
  // (handled directly in handleAddTruck / the number input's onBlur)

  const handleAutoBalance = async () => {
    const allItems = [...eventEquipment, ...loads.flatMap(t => t.items || [])];
    if (allItems.length === 0) {
      toast({ title: 'No equipment', description: 'Add equipment first before balancing.', variant: 'destructive' });
      return;
    }
    setAutoBalancing(true);
    try {
      const truckConfigs = loads.map(t => ({ id: t.id, type: t.type, name: t.name }));
      const res = await base44.functions.invoke('optimizeLoadDistribution', {
        equipment: allItems,
        numTrucks: loads.length,
        truckConfigs,
        truckType: loads[0]?.type || '18wheeler',
      });
      if (res.data?.loads) {
        setLoads(res.data.loads);
        setEventEquipment([]);
        toast({ title: '✅ Load optimized', description: `Distributed across ${res.data.loads.length} trucks.` });
      } else {
        toast({ title: 'No result', description: 'Optimize returned no result.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Optimize failed', description: err.message, variant: 'destructive' });
    } finally {
      setAutoBalancing(false);
    }
  };

  const handleAutoPack = async () => {
    if (eventEquipment.length === 0) {
      toast({ title: 'No equipment', description: 'Add equipment first before packing.', variant: 'destructive' });
      return;
    }
    setAutoPacking(true);
    try {
      // Summarize items by name to reduce payload size (avoid sending 355 individual chairs)
      const summarized = [];
      const seen = {};
      for (const item of eventEquipment) {
        const key = item.equipmentName || item.name;
        if (seen[key]) {
          seen[key].quantity = (seen[key].quantity || 1) + 1;
        } else {
          const copy = { ...item, quantity: 1, equipmentName: item.equipmentName || item.name };
          seen[key] = copy;
          summarized.push(copy);
        }
      }

      // Pass per-truck configs so packing respects individual vehicle capacities
      const truckConfigs = loads.length > 0
        ? loads.map(t => ({ id: t.id, type: t.type, name: t.name }))
        : [{ id: 'truck-1', type: '18wheeler', name: 'Truck 1' }];

      console.log('[AIRoads] Sending to autoPack:', { equipmentCount: eventEquipment.length, summarizedCount: summarized.length, truckConfigs });
      console.log('[AIRoads] Summarized items:', summarized);
      const res = await base44.functions.invoke('autoPackEquipment', {
        equipment: eventEquipment,
        summarized,
        numTrucks: truckConfigs.length,
        truckConfigs,
        truckType: truckConfigs[0]?.type || '18wheeler',
      });
      console.log('[AIRoads] Received from autoPack:', res.data);
      if (res.data?.loads) {
        setLoads(res.data.loads);
        setEventEquipment([]);
        toast({ title: '✅ Auto Pack complete', description: `Equipment packed across ${res.data.loads.length} trucks. Total items: ${res.data.loads.reduce((sum, t) => sum + (t.items?.length || 0), 0)}` });
      } else {
        toast({ title: 'No result', description: 'Auto Pack returned no result. Try again or adjust truck count.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Auto Pack failed', description: err.message, variant: 'destructive' });
    } finally {
      setAutoPacking(false);
    }
  };

  const handleAddTruck = () => {
    const newTruck = {
      id: `truck-${Date.now()}`,
      name: `Truck ${loads.length + 1}`,
      type: '18wheeler', // default — user can change per-truck in Load Split
      items: [],
    };
    setLoads([...loads, newTruck]);
  };

  const handleTruckTypeChange = (truckId, newType) => {
    setLoads(loads.map(t => t.id === truckId ? { ...t, type: newType } : t));
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
    // Total cost sums each truck's individual type cost
    const totalCost = loads.reduce((sum, t) => {
      const spec = TRUCK_SPECS[t.type] || TRUCK_SPECS['18wheeler'];
      return sum + (distance * 2) * spec.costPerMile;
    }, 0);

    return { totalWeight, totalVolume, assignedWeight, assignedVolume, totalCost };
  }, [eventEquipment, loads, distance]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="AIRoads – Load Planner"
        subtitle={eventPlan ? `${eventPlan.eventName || eventPlan.title} · ${eventEquipment.length} items` : 'Load optimization & logistics'}
        icon={Truck}
        action={
          <div className="flex items-center gap-1 flex-wrap">
            {['planner', 'manifest', 'labels', 'scanner'].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded text-sm font-semibold transition capitalize ${activeTab === t ? 'bg-white text-slate-900' : 'text-white/70 hover:bg-white/10'}`}>
                {t}
              </button>
            ))}
            <button onClick={() => setActiveTab('pl')}
              className={`px-3 py-1.5 rounded text-sm font-semibold transition ${activeTab === 'pl' ? 'bg-emerald-400 text-slate-900' : 'text-emerald-300 hover:bg-white/10'}`}>
              💰 P&amp;L
            </button>
          </div>
        }
      />

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
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Trucks */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Trucks <span className="font-normal text-gray-400">— set type per truck in Load Split</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (loads.length > 1) {
                      const last = loads[loads.length - 1];
                      if (last.items?.length) {
                        setEventEquipment(prev => [...prev, ...last.items]);
                      }
                      setLoads(loads.slice(0, -1));
                    }
                  }}
                  disabled={loads.length <= 1}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                >−</button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-bold text-gray-900">{loads.length}</span>
                  <div className="text-xs text-gray-400">truck{loads.length !== 1 ? 's' : ''}</div>
                </div>
                <button
                  onClick={handleAddTruck}
                  className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-lg font-bold"
                >+</button>
              </div>
            </div>
            {/* Distance */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Distance (miles one-way)</label>
              <Input
                type="number"
                min="0"
                value={distance}
                onChange={e => setDistance(parseInt(e.target.value) || 0)}
                className="h-9 text-sm"
              />
            </div>
            {/* Actions */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Pack &amp; Optimize <span className="font-normal text-gray-400">— uses each truck's type</span>
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={handleAutoPack}
                  disabled={autoPacking || eventEquipment.length === 0}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 gap-2 h-9 text-sm"
                  title="Distribute equipment across configured trucks"
                >
                  {autoPacking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
                  Auto Pack
                </Button>
                <Button
                  onClick={handleAutoBalance}
                  disabled={autoBalancing || (eventEquipment.length === 0 && loads.flatMap(t => t.items || []).length === 0)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2 h-9 text-sm"
                  title="Minimize trucks while respecting per-truck limits"
                >
                  {autoBalancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
                  Optimize
                </Button>
              </div>
            </div>
          </div>
          {loads.length === 0 && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <div className="text-sm text-amber-800">
                Start by adding your first truck, then assign equipment and pack.
              </div>
              <button
                onClick={handleAddTruck}
                className="ml-4 flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> Add First Truck
              </button>
            </div>
          )}
        </div>

        {/* Fleet cost nudge */}
        <FleetCostNudge loads={loads} eventEquipment={eventEquipment} distance={distance} />

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
            <div className="text-xs text-gray-500">Round-Trip Distance</div>
            <div className="font-bold text-gray-900">{(distance * 2).toLocaleString()} mi</div>
            <div className="text-xs text-gray-400 mt-1">{distance} mi each way</div>
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
          onAdd={(items) => setEventEquipment(prev => [...prev, ...items])}
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
            onTruckTypeChange={handleTruckTypeChange}
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