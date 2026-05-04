import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Loader2, Wand2 } from 'lucide-react';
import EventCanvas from '@/components/canvas/EventCanvas';
import CanvasToolbar from '@/components/canvas/CanvasToolbar';
import CanvasItemDetail from '@/components/canvas/CanvasItemDetail';
import QuoteSummary from '@/components/canvas/QuoteSummary';
import EventSpecsPanel from '@/components/canvas/EventSpecsPanel';
import SmartChecklist from '@/components/canvas/SmartChecklist';
import CustomerWizard from '@/components/canvas/CustomerWizard';

const CATEGORY_COLORS = {
  Tent: '#6366f1', Chair: '#f59e0b', Table: '#10b981', Generator: '#ef4444',
  Inflatable: '#ec4899', Staging: '#8b5cf6', 'Dance Floor': '#06b6d4',
  'Light Tower': '#f97316', default: '#64748b',
};

const DEFAULT_FOOTPRINTS = {
  Tent: { w: 20, l: 40 }, Chair: { w: 2, l: 2 }, Table: { w: 8, l: 3 },
  Generator: { w: 4, l: 6 }, Inflatable: { w: 15, l: 15 }, Staging: { w: 16, l: 8 },
  'Dance Floor': { w: 12, l: 12 }, 'Light Tower': { w: 4, l: 4 },
};

export default function EventPlanner() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canvasItems, setCanvasItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scale, setScale] = useState(10);
  const [showGrid, setShowGrid] = useState(true);
  const [acknowledged, setAcknowledged] = useState([]);
  const [user, setUser] = useState(null);

  // Plan metadata
  const [title, setTitle] = useState('New Event Plan');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState('other');
  const [guestCount, setGuestCount] = useState(0);
  const [venueSurface, setVenueSurface] = useState('unknown');
  const [venueDimensions, setVenueDimensions] = useState({ width: 0, length: 0 });
  const [venuePhotoUrl, setVenuePhotoUrl] = useState('');
  const [venueRotation, setVenueRotation] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [eq, cats, me] = await Promise.all([
        base44.entities.Equipment.list('-created_date', 500),
        base44.entities.EquipmentCategory.list(),
        base44.auth.me().catch(() => null),
      ]);
      setEquipment(eq);
      setCategories(cats);
      setUser(me);

      if (planId) {
        const existing = await base44.entities.EventPlan.filter({ id: planId });
        const p = existing[0];
        if (p) {
          setPlan(p);
          setTitle(p.title || 'Event Plan');
          setEventDate(p.eventDate || '');
          setEventTime(p.eventTime || p.eventTime || '');
          setEventType(p.eventType || 'other');
          setGuestCount(p.guestCount || 0);
          setVenueSurface(p.venueSurface || 'unknown');
          setVenueDimensions({ width: p.venueWidthFt || 0, length: p.venueLengthFt || 0 });
          setVenuePhotoUrl(p.venuePhotoUrl || '');
          setCanvasItems(p.canvasItems || []);
          setAcknowledged(p.nudgesAcknowledged || []);
        }
      }
      setLoading(false);
    };
    init();
  }, [planId]);

  // Real-time sync for collaborative editing
  useEffect(() => {
    if (!plan?.id) return;
    const unsub = base44.entities.EventPlan.subscribe((event) => {
      if (event.id !== plan.id) return;
      if (event.data?.lastEditedBy === user?.email) return; // skip own edits
      if (event.type === 'update' && event.data) {
        setCanvasItems(event.data.canvasItems || []);
        setAcknowledged(event.data.nudgesAcknowledged || []);
      }
    });
    return unsub;
  }, [plan?.id, user?.email]);

  const getFootprint = useCallback((eq) => {
    const cat = eq.category || '';
    const catRecord = categories.find(c => c.name === cat);
    return {
      w: eq.footprintWidth || catRecord?.defaultFootprintWidth || DEFAULT_FOOTPRINTS[cat]?.w || 10,
      l: eq.footprintLength || catRecord?.defaultFootprintLength || DEFAULT_FOOTPRINTS[cat]?.l || 10,
    };
  }, [categories]);

  const handleDragStart = (e, eq) => {
    e.dataTransfer.setData('application/json', JSON.stringify(eq));
  };

  const handleDrop = (eq, x, y) => {
    const fp = getFootprint(eq);
    const newItem = {
      id: crypto.randomUUID(),
      equipmentId: eq.id,
      equipmentName: eq.name,
      category: eq.category,
      widthFt: fp.w,
      lengthFt: fp.l,
      x: x - (fp.w * scale) / 2,
      y: y - (fp.l * scale) / 2,
      rotation: 0,
      quantity: 1,
      color: CATEGORY_COLORS[eq.category] || CATEGORY_COLORS.default,
      label: eq.name,
      dailyRate: eq.dailyRate || 0,
      notes: '',
    };
    setCanvasItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  const handleMove = (id, x, y) => {
    setCanvasItems(prev => prev.map(item => item.id === id ? { ...item, x, y } : item));
  };

  const handleRotate = (id, deg) => {
    setCanvasItems(prev => prev.map(item =>
      item.id === id ? { ...item, rotation: ((item.rotation || 0) + deg) % 360 } : item
    ));
  };

  const handleDelete = (id) => {
    setCanvasItems(prev => prev.filter(item => item.id !== id));
    setSelectedId(null);
  };

  const handleDuplicate = (item) => {
    const copy = { ...item, id: crypto.randomUUID(), x: item.x + 20, y: item.y + 20 };
    setCanvasItems(prev => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const handleUpdateItem = (updated) => {
    setCanvasItems(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const selectedItem = canvasItems.find(i => i.id === selectedId);

  const buildPlanData = () => ({
    title,
    eventDate,
    eventTime,
    eventType,
    guestCount: parseInt(guestCount) || 0,
    venueSurface,
    venueWidthFt: venueDimensions.width,
    venueLengthFt: venueDimensions.length,
    venuePhotoUrl,
    venueType: venuePhotoUrl ? 'photo' : (venueDimensions.width ? 'dimensions' : 'dimensions'),
    canvasItems,
    quotedTotal: canvasItems.reduce((s, i) => s + (i.dailyRate || 0) * (i.quantity || 1), 0),
    nudgesAcknowledged: acknowledged,
    lastEditedBy: user?.email || '',
    lastEditedAt: new Date().toISOString(),
  });

  const handleSave = async () => {
    setSaving(true);
    const data = buildPlanData();
    if (plan?.id) {
      const updated = await base44.entities.EventPlan.update(plan.id, data);
      setPlan(updated);
    } else {
      const created = await base44.entities.EventPlan.create({ ...data, ownerEmail: user?.email, ownerRole: 'staff', status: 'draft' });
      setPlan(created);
      window.history.replaceState({}, '', `/event-planner/${created.id}`);
    }
    setSaving(false);
  };

  const handleRequestReview = async () => {
    await handleSave();
    const nextStatus = plan?.status === 'draft' ? 'customer_review'
      : plan?.status === 'customer_review' ? 'planner_review'
      : plan?.status === 'planner_review' ? 'finalized'
      : plan?.status;
    if (plan?.id) {
      await base44.entities.EventPlan.update(plan.id, { status: nextStatus });
    }
    alert(`Plan status updated to: ${nextStatus}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex items-center gap-3 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading canvas…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="h-12 bg-black border-b border-white/10 flex items-center gap-3 px-4 flex-shrink-0">
        <button onClick={() => navigate('/lupine')} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">AE</span>
        </div>
        <span className="text-white/60 font-semibold text-sm truncate max-w-48">{title || 'New Event Plan'}</span>
        {plan?.status && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50 capitalize">
            {plan.status.replace('_', ' ')}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition"
          >
            <Wand2 className="w-3.5 h-3.5" /> Customer Wizard
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <CanvasToolbar
        scale={scale}
        onScaleChange={setScale}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(p => !p)}
        onUploadPhoto={setVenuePhotoUrl}
        onClearCanvas={() => { setCanvasItems([]); setSelectedId(null); }}
        venueDimensions={venueDimensions}
        onDimensionsChange={setVenueDimensions}
        venueRotation={venueRotation}
        onVenueRotate={() => {
          const newRot = (venueRotation + 90) % 360;
          setVenueRotation(newRot);
          // Swap width/length on 90/270 degree rotations
          if (newRot % 180 !== 0) {
            setVenueDimensions(d => ({ width: d.length, length: d.width }));
          }
        }}
      />

      {/* Customer Wizard */}
      {showWizard && (
        <CustomerWizard
          equipment={equipment}
          onComplete={async (wizardData) => {
            const { canvasItems: wizItems, ...planData } = wizardData;
            setCanvasItems(wizItems);
            setTitle(planData.title || title);
            setEventDate(planData.eventDate || eventDate);
            setEventTime(planData.eventTime || eventTime);
            setEventType(planData.eventType || eventType);
            setGuestCount(planData.guestCount || guestCount);
            setVenueSurface(planData.venueSurface || venueSurface);
            if (planData.venueWidthFt || planData.venueLengthFt) {
              setVenueDimensions({ width: planData.venueWidthFt || 0, length: planData.venueLengthFt || 0 });
            }
            setShowWizard(false);
            setTimeout(handleSave, 200);
          }}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: event specs + quick-add */}
        <EventSpecsPanel
          equipment={equipment}
          onDragStart={handleDragStart}
          onAdd={(eq, x, y) => handleDrop(eq, x || 80, y || 80)}
          title={title} setTitle={setTitle}
          eventDate={eventDate} setEventDate={setEventDate}
          eventTime={eventTime} setEventTime={setEventTime}
          eventType={eventType} setEventType={setEventType}
          guestCount={guestCount} setGuestCount={setGuestCount}
          venueSurface={venueSurface} setVenueSurface={setVenueSurface}
          venueDimensions={venueDimensions} setVenueDimensions={setVenueDimensions}
          onSave={handleSave}
        />

        {/* Center: canvas */}
        <div className="flex-1 relative overflow-hidden">
          <EventCanvas
            items={canvasItems}
            scale={scale}
            showGrid={showGrid}
            venueWidth={venueDimensions.width}
            venueLength={venueDimensions.length}
            venuePhotoUrl={venuePhotoUrl}
            venueRotation={venueRotation}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={handleMove}
            onDrop={handleDrop}
            onRotate={handleRotate}
            onDelete={handleDelete}
          />

          {/* Selected item detail bar */}
          {selectedItem && (
            <CanvasItemDetail
              item={selectedItem}
              onUpdate={handleUpdateItem}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          )}

          {/* Keyboard hint */}
          {!selectedItem && canvasItems.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/20 text-xs pointer-events-none">
              Click item to select · Drag to move · R to rotate · Delete to remove
            </div>
          )}

          {canvasItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2">
                <div className="text-4xl">🎪</div>
                <div className="text-white/30 text-sm font-medium">Drag equipment onto the canvas</div>
                <div className="text-white/20 text-xs">Set venue dimensions in the toolbar to see the scaled floor plan</div>
              </div>
            </div>
          )}
        </div>

        {/* Right: smart checklist */}
        <SmartChecklist
          canvasItems={canvasItems}
          guestCount={parseInt(guestCount) || 0}
          venueSurface={venueSurface}
          eventType={eventType}
          acknowledged={acknowledged}
          onAcknowledge={(id) => setAcknowledged(prev => [...prev, id])}
        />
      </div>

      {/* Bottom: quote summary */}
      <QuoteSummary
        items={canvasItems}
        eventDate={eventDate}
        onSave={handleSave}
        onRequestReview={handleRequestReview}
        saving={saving}
        isCustomer={false}
        planStatus={plan?.status || 'draft'}
      />
    </div>
  );
}