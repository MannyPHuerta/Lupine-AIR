import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Truck, Scale, Loader2, Plus, Printer, Save } from 'lucide-react';
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
import TruckFloorPlan from '@/components/airoads/TruckFloorPlan';
import TruckLoadingChecklist from '@/components/airoads/TruckLoadingChecklist';
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
    if (rentals[0]) { onLink(rentals[0]); }
    else { setNotFound(true); }
    setSearching(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input type="text" placeholder="e.g. MCL-9901" value={value}
          onChange={e => { setValue(e.target.value); setNotFound(false); }}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          className="flex-1 h-9 border border-amber-300 rounded-md px-3 text-sm bg-white" />
        <button onClick={handleSearch} disabled={searching || !value.trim()}
          className="px-4 h-9 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-md disabled:opacity-50 flex items-center gap-1">
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Link'}
        </button>
      </div>
      {notFound && <div className="text-xs text-red-600">Invoice not found.</div>}
    </div>
  );
}

function estimateWeight(item) {
  const cat = (item.category || '').toLowerCase();
  const name = (item.equipmentName || item.name || '').toLowerCase();
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
  const name = (item.equipmentName || item.name || '').toLowerCase();
  if (cat === 'tent') return (item.widthFt || 20) * (item.lengthFt || 20) * 0.5;
  if (cat === 'staging') return (item.widthFt || 4) * (item.lengthFt || 8) * 0.5;
  if (cat === 'table') return 12;
  if (cat === 'chair') return 1.5;
  if (cat === 'generator' || name.includes('generator')) return 40;
  if (cat === 'light tower' || name.includes('light tower')) return 30;
  return 5;
}

const PRIMARY_TABS = [
  { key: 'planner', label: '📦 Load Split' },
  { key: 'floorplan', label: '🗺️ Floor Plan' },
];

const SECONDARY_TABS = [
  { key: 'manifest', label: '📋 Manifest' },
  { key: 'labels', label: '🏷️ Labels' },
  { key: 'scanner', label: '📷 Scanner' },
  { key: 'pl', label: '💰 P&L' },
];

function FloorPlanTab({ loads }) {
  const [tripMode, setTripMode] = useState('load');
  const trucksWithItems = loads.filter(t => t.items?.length > 0);

  if (trucksWithItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
        No items assigned to trucks yet. Use Auto Pack first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Trip mode toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Trip mode:</span>
        <div className="flex gap-1 bg-white border rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setTripMode('load')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${tripMode === 'load' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📦 Outbound Load
          </button>
          <button
            onClick={() => setTripMode('return')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${tripMode === 'return' ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔁 Return Trip
          </button>
        </div>
        <span className="text-xs text-gray-400 italic">
          {tripMode === 'return' ? 'Reload at venue — same manifest, reload for home' : 'Loading at warehouse — follow checklist order'}
        </span>
      </div>

      {/* Per-truck: floor plan + checklist side by side */}
      {trucksWithItems.map(truck => (
        <div key={truck.id} className="space-y-3">
          <div className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b pb-1">
            {truck.name}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TruckFloorPlan truck={truck} truckType={truck.type} />
            <TruckLoadingChecklist truck={truck} mode={tripMode} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AIRoads() {
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
            setEventEquipment(items.map(item => ({
              ...item,
              id: `${item.id}-plan`,
              quantity: item.quantity || 1,
              weight: item.weight || estimateWeight(item),
              volume: item.volume || estimateVolume(item),
            })));
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

  const importPlan = async (plan) => {
    setEventPlan(plan);
    const items = plan.canvasItems || plan.equipment || [];
    setEventEquipment(items.map(item => ({
      ...item,
      id: `${item.id}-plan`,
      quantity: item.quantity || 1,
      weight: item.weight || estimateWeight(item),
      volume: item.volume || estimateVolume(item),
    })));
    setLoads([]);
    if (plan.linkedRentalInvoice) {
      const rentals = await base44.entities.Rental.filter({ invoiceNumber: plan.linkedRentalInvoice });
      if (rentals[0]) setLinkedRental(rentals[0]);
      else setLinkedRental(null);
    } else {
      setLinkedRental(null);
    }
    toast({ title: '✅ Plan loaded', description: `${items.length} equipment line(s) added to Unassigned.` });
  };

  const handleAutoBalance = async () => {
    const allItems = [...eventEquipment, ...loads.flatMap(t => t.items || [])];
    if (allItems.length === 0) {
      toast({ title: 'No equipment', description: 'Add equipment first.', variant: 'destructive' });
      return;
    }
    setAutoBalancing(true);
    try {
      const seen = {};
      const summarized = [];
      for (const item of allItems) {
        const key = item.equipmentName || item.name;
        if (seen[key]) { seen[key].quantity = (seen[key].quantity || 1) + (item.quantity || 1); }
        else { const copy = { ...item, quantity: item.quantity || 1 }; seen[key] = copy; summarized.push(copy); }
      }
      const truckConfigs = loads.map(t => ({ id: t.id, type: t.type, name: t.name }));
      const res = await base44.functions.invoke('optimizeLoadDistribution', {
        equipment: summarized,
        numTrucks: loads.length,
        truckConfigs,
        truckType: loads[0]?.type || '18wheeler',
      });
      if (res.data?.loads) {
        setLoads(res.data.loads);
        setEventEquipment([]);
        toast({ title: '✅ Load optimized', description: `Distributed across ${res.data.loads.length} trucks.` });
      }
    } catch (err) {
      toast({ title: 'Optimize failed', description: err.message, variant: 'destructive' });
    } finally {
      setAutoBalancing(false);
    }
  };

  const handleAutoPack = async () => {
    // Gather ALL equipment — unassigned + already-assigned — so adding a truck then repacking works
    const allItems = [...eventEquipment, ...loads.flatMap(t => t.items || [])];
    if (allItems.length === 0) {
      toast({ title: 'No equipment', description: 'Add equipment first before packing.', variant: 'destructive' });
      return;
    }
    // Merge same-named items
    const seen = {};
    const summarized = [];
    for (const item of allItems) {
      const key = item.equipmentName || item.name;
      if (seen[key]) { seen[key].quantity = (seen[key].quantity || 1) + (item.quantity || 1); }
      else { const copy = { ...item, quantity: item.quantity || 1 }; seen[key] = copy; summarized.push(copy); }
    }
    setAutoPacking(true);
    try {
      const truckConfigs = loads.length > 0
        ? loads.map(t => ({ id: t.id, type: t.type, name: t.name }))
        : [{ id: 'truck-1', type: '18wheeler', name: 'Truck 1' }];
      const res = await base44.functions.invoke('autoPackEquipment', {
        summarized,
        numTrucks: truckConfigs.length,
        truckConfigs,
        truckType: truckConfigs[0]?.type || '18wheeler',
      });
      if (res.data?.loads) {
        setLoads(res.data.loads);
        setEventEquipment([]);
        toast({ title: '✅ Auto Pack complete', description: `Equipment packed across ${res.data.loads.length} trucks.` });
      }
    } catch (err) {
      toast({ title: 'Auto Pack failed', description: err.message, variant: 'destructive' });
    } finally {
      setAutoPacking(false);
    }
  };

  const handleAddTruck = () => {
    setLoads(prev => [...prev, {
      id: `truck-${Date.now()}`,
      name: `Truck ${prev.length + 1}`,
      type: '18wheeler',
      items: [],
    }]);
  };

  const handleRemoveTruck = (id) => {
    const removed = loads.find(t => t.id === id);
    if (removed?.items?.length) setEventEquipment(prev => [...prev, ...removed.items]);
    setLoads(loads.filter(t => t.id !== id));
  };

  const handleTruckTypeChange = (truckId, newType) => {
    setLoads(loads.map(t => t.id === truckId ? { ...t, type: newType } : t));
  };

  const stats = useMemo(() => {
    const totalWeight = eventEquipment.reduce((s, e) => s + (e.weight || 0) * (e.quantity || 1), 0);
    const totalVolume = eventEquipment.reduce((s, e) => s + (e.volume || 0) * (e.quantity || 1), 0);
    const totalCost = loads.reduce((s, t) => {
      const spec = TRUCK_SPECS[t.type] || TRUCK_SPECS['18wheeler'];
      return s + (distance * 2) * spec.costPerMile;
    }, 0);
    return { totalWeight, totalVolume, totalCost };
  }, [eventEquipment, loads, distance]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const totalUnits = eventEquipment.reduce((s, e) => s + (e.quantity || 1), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppPageHeader
        title="AIRoads – Load Planner"
        subtitle={eventPlan
          ? `${eventPlan.eventName || eventPlan.title} · ${totalUnits} units unassigned`
          : 'Load optimization & logistics'}
        icon={Truck}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* ── STEP 1: Import from Event Plan ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-1">
            Step 1 — Import from Event Plan
          </div>
          <p className="text-xs text-blue-600 mb-3">
            {eventPlans.length === 0
              ? 'No saved plans found — skip to Step 2 to add equipment manually.'
              : 'Select a customer or planner-created plan to auto-populate Unassigned Equipment.'}
          </p>
          {eventPlans.length > 0 && (
            <select
              onChange={async e => {
                if (!e.target.value) return;
                const plan = eventPlans.find(p => p.id === e.target.value);
                if (plan) await importPlan(plan);
              }}
              className="w-full h-9 border border-blue-300 rounded-md px-3 bg-white text-sm"
              value={eventPlan?.id || ''}
            >
              <option value="">— Select a plan to import —</option>
              {eventPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.title || plan.eventName} · {(plan.canvasItems || plan.equipment || []).length} items
                  {plan.linkedRentalInvoice ? ` · ${plan.linkedRentalInvoice}` : ''}
                </option>
              ))}
            </select>
          )}
          {eventPlan && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 font-semibold">
              ✓ Loaded: {eventPlan.title || eventPlan.eventName}
              <button
                onClick={() => { setEventPlan(null); setEventEquipment([]); }}
                className="ml-2 text-blue-400 hover:text-blue-600 underline font-normal"
              >Clear</button>
            </div>
          )}
        </div>

        {/* ── STEP 2: Add Equipment ── */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Step 2 — Add Equipment
            {totalUnits > 0 && (
              <span className="ml-2 text-indigo-600 normal-case font-semibold">
                ({totalUnits} units queued)
              </span>
            )}
          </div>
          <EquipmentPicker
            equipment={eventEquipment}
            allEquipment={allEquipment}
            onAdd={(items) => setEventEquipment(prev => [...prev, ...items])}
          />
        </div>

        {/* ── STEP 3: Trucks / Distance / Pack ── */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Step 3 — Configure Trucks &amp; Pack
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {/* Truck count */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Trucks</label>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    if (loads.length > 1) {
                      const last = loads[loads.length - 1];
                      if (last.items?.length) setEventEquipment(prev => [...prev, ...last.items]);
                      setLoads(loads.slice(0, -1));
                    }
                  }}
                  disabled={loads.length <= 1}
                  className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 text-lg font-bold"
                >−</button>
                <span className="w-10 text-center text-xl font-bold text-gray-900">{loads.length}</span>
                <button
                  onClick={handleAddTruck}
                  className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 text-lg font-bold"
                >+</button>
              </div>
            </div>

            {/* Distance */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Distance (mi one-way)</label>
              <Input
                type="number"
                min="0"
                value={distance}
                onChange={e => setDistance(parseInt(e.target.value) || 0)}
                className="h-8 text-sm w-28"
              />
            </div>

            {/* Pack / Optimize buttons */}
            <div className="flex gap-2 flex-1 min-w-48">
              <Button
                onClick={handleAutoPack}
                disabled={autoPacking || eventEquipment.length === 0}
                className="flex-1 bg-amber-600 hover:bg-amber-700 gap-1.5 h-8 text-sm"
              >
                {autoPacking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
                Auto Pack
              </Button>
              <Button
                onClick={handleAutoBalance}
                disabled={autoBalancing || (eventEquipment.length === 0 && loads.flatMap(t => t.items || []).length === 0)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-1.5 h-8 text-sm"
              >
                {autoBalancing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />}
                Optimize
              </Button>
            </div>

            {/* Inline stats */}
            <div className="flex gap-3 text-xs text-gray-500 ml-auto">
              <span><b className="text-gray-800">{(stats.totalWeight / 1000).toFixed(1)}k</b> lbs</span>
              <span><b className="text-gray-800">{stats.totalVolume.toLocaleString()}</b> cu ft</span>
              <span><b className="text-indigo-700">${stats.totalCost.toFixed(0)}</b> est.</span>
            </div>
          </div>

          {loads.length === 0 && (
            <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
              <span className="text-sm text-amber-800">No trucks yet — add at least one before packing.</span>
              <button
                onClick={handleAddTruck}
                className="ml-4 flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" /> Add Truck
              </button>
            </div>
          )}
        </div>

        <FleetCostNudge loads={loads} eventEquipment={eventEquipment} distance={distance} />

        {/* ── STEP 4: View ── */}
        {(loads.length > 0 || eventEquipment.length > 0) && (
          <div className="space-y-3">

            {/* Primary tabs: Load Split + Floor Plan */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-sm">
                {PRIMARY_TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Secondary tabs */}
              <div className="flex gap-1 bg-white border rounded-xl p-1 shadow-sm">
                {SECONDARY_TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === t.key ? 'bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Print + Save buttons */}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
                <Button variant="outline" size="sm"
                  onClick={() => {
                    const data = JSON.stringify({ eventPlan: eventPlan?.id, loads, eventEquipment, distance }, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `load-plan-${Date.now()}.json`; a.click();
                    URL.revokeObjectURL(url);
                    toast({ title: 'Saved', description: 'Load plan downloaded as JSON.' });
                  }}
                  className="gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save
                </Button>
              </div>
            </div>

            {/* Tab panels */}
            {activeTab === 'planner' && (
              <>
                {loads.some(t => !t.items?.length) && loads.some(t => t.items?.length) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-amber-800">Some trucks are empty. Run <b>Auto Pack</b> again to redistribute across all trucks.</span>
                    <Button size="sm" onClick={handleAutoPack} disabled={autoPacking} className="ml-3 bg-amber-600 hover:bg-amber-700 gap-1">
                      {autoPacking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scale className="w-3.5 h-3.5" />} Repack
                    </Button>
                  </div>
                )}
                <LoadPlanner
                  eventEquipment={eventEquipment}
                  loads={loads}
                  truckSpecs={TRUCK_SPECS}
                  onLoadsChange={setLoads}
                  onEquipmentChange={setEventEquipment}
                  onRemoveTruck={handleRemoveTruck}
                  onTruckTypeChange={handleTruckTypeChange}
                />
              </>
            )}

            {activeTab === 'floorplan' && (
              <FloorPlanTab loads={loads} />
            )}

            {activeTab === 'manifest' && (
              <LoadManifest loads={loads} truckSpecs={TRUCK_SPECS} distance={distance} />
            )}

            {activeTab === 'labels' && (
              <div className="space-y-4">
                {loads.length === 0 ? (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-400">No trucks loaded yet.</div>
                ) : (
                  <>
                    {showStockSelector && (
                      <LabelStockSelector
                        onSelect={stock => { setLabelStock(stock); setShowStockSelector(false); }}
                        onCancel={() => setShowStockSelector(false)}
                      />
                    )}
                    {!labelStock ? (
                      <Button onClick={() => setShowStockSelector(true)} className="w-full">Choose Label Stock Format</Button>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">Select truck:</span>
                          <Button onClick={() => setShowStockSelector(true)} variant="outline" size="sm">Change Stock</Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {loads.map(truck => (
                            <Button key={truck.id} onClick={() => setSelectedTruckForLabels(truck)}
                              variant={selectedTruckForLabels?.id === truck.id ? 'default' : 'outline'}
                              className="justify-start">
                              {truck.name} ({truck.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0} units)
                            </Button>
                          ))}
                        </div>
                        {selectedTruckForLabels && <ShippingLabels truck={selectedTruckForLabels} labelStock={labelStock} />}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'scanner' && (
              <div className="space-y-4">
                {loads.length === 0 ? (
                  <div className="bg-white rounded-xl border p-8 text-center text-gray-400">No trucks loaded yet.</div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {loads.map(truck => (
                        <Button key={truck.id} onClick={() => setSelectedTruckForScanner(truck)}
                          variant={selectedTruckForScanner?.id === truck.id ? 'default' : 'outline'}
                          className="justify-start">
                          {truck.name} ({truck.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0} units)
                        </Button>
                      ))}
                    </div>
                    {selectedTruckForScanner && <TransitScanner truck={selectedTruckForScanner} />}
                  </>
                )}
              </div>
            )}

            {activeTab === 'pl' && (
              <PremiumGate requiredTier="pro" featureName="Job P&L Tracking">
                <div className="space-y-4">
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
          </div>
        )}
      </div>
    </div>
  );
}