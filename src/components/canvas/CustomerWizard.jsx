import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, ArrowLeft, Sparkles, Loader2, CheckCircle2, Upload, Eye, Minus, Plus, Trash2 } from 'lucide-react';

const STEPS = [
  { id: 'event', label: 'Your Event' },
  { id: 'venue', label: 'Your Space' },
  { id: 'ai', label: 'AI Layout' },
  { id: 'review', label: 'Review' },
];

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

// Convert HH:MM (24h) to 12h AM/PM display
function to12h(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

// AM/PM time picker component
function TimePicker({ value, onChange }) {
  const [h, setH] = useState(() => {
    if (!value) return '12';
    const hh = parseInt(value.split(':')[0], 10);
    return String(hh % 12 || 12);
  });
  const [m, setM] = useState(() => value ? value.split(':')[1] : '00');
  const [ampm, setAmpm] = useState(() => {
    if (!value) return 'AM';
    return parseInt(value.split(':')[0], 10) >= 12 ? 'PM' : 'AM';
  });

  const emit = (hVal, mVal, apVal) => {
    let hh = parseInt(hVal, 10);
    if (apVal === 'PM' && hh !== 12) hh += 12;
    if (apVal === 'AM' && hh === 12) hh = 0;
    onChange(`${String(hh).padStart(2, '0')}:${mVal}`);
  };

  return (
    <div className="flex gap-1.5 items-center">
      <select
        value={h}
        onChange={e => { setH(e.target.value); emit(e.target.value, m, ampm); }}
        className="bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500 flex-1"
      >
        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
      <span className="text-white/40 font-bold">:</span>
      <select
        value={m}
        onChange={e => { setM(e.target.value); emit(h, e.target.value, ampm); }}
        className="bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500 flex-1"
      >
        {['00', '15', '30', '45'].map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <select
        value={ampm}
        onChange={e => { setAmpm(e.target.value); emit(h, m, e.target.value); }}
        className="bg-slate-800 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500 flex-1"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function StepIndicator({ current, onGoTo }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <button
            onClick={() => i < current && onGoTo(i)}
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
              i < current ? 'bg-cyan-500 text-black cursor-pointer hover:bg-cyan-400' :
              i === current ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-400' :
              'bg-white/10 text-white/30 cursor-default'
            }`}
          >
            {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </button>
          <span
            className={`text-xs font-medium ${i === current ? 'text-white' : i < current ? 'text-cyan-400 cursor-pointer' : 'text-white/30'}`}
            onClick={() => i < current && onGoTo(i)}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < current ? 'bg-cyan-500' : 'bg-white/10'}`} />}
        </div>
      ))}
    </div>
  );
}

function StepEvent({ data, onChange, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Tell us about your event</h2>
        <p className="text-white/50 text-sm">We'll use this to build your custom layout.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/50 block mb-1.5">Your name</label>
          <input
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Maria Rodriguez"
            value={data.customerName || ''}
            onChange={e => onChange({ customerName: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1.5">Event type</label>
            <select
              value={data.eventType || 'other'}
              onChange={e => onChange({ eventType: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {['birthday', 'quinceañera', 'wedding', 'corporate', 'municipal', 'festival', 'other'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1.5">Number of guests</label>
            <input
              type="number"
              placeholder="150"
              value={data.guestCount || ''}
              onChange={e => onChange({ guestCount: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1.5">Start date</label>
            <input
              type="date"
              value={data.eventDate || ''}
              onChange={e => onChange({ eventDate: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1.5">End date</label>
            <input
              type="date"
              value={data.eventEndDate || ''}
              min={data.eventDate || ''}
              onChange={e => onChange({ eventEndDate: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1.5">Start time</label>
          <TimePicker value={data.eventTime || ''} onChange={val => onChange({ eventTime: val })} />
        </div>
        <div>
          <label className="text-xs text-white/50 block mb-1.5">Venue name or address (optional)</label>
          <input
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder="Parque La Lomita, McAllen TX"
            value={data.venueName || ''}
            onChange={e => onChange({ venueName: e.target.value })}
          />
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={!data.guestCount || !data.eventDate}
        className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-xl py-3.5 transition"
      >
        Next: Your Space <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function StepVenue({ data, onChange, onNext, onBack }) {
  const [uploading, setUploading] = useState(false);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange({ venuePhotoUrl: file_url });
    setUploading(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Tell us about your space</h2>
        <p className="text-white/50 text-sm">This helps us fit everything perfectly.</p>
      </div>
      <div className="space-y-4">
        {/* Available Space FIRST */}
        <div>
          <label className="text-xs text-white/50 block mb-1.5">Available space (approximate)</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number" placeholder="100" value={data.venueWidthFt || ''}
                autoFocus
                onChange={e => onChange({ venueWidthFt: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">ft wide</span>
            </div>
            <div className="relative">
              <input
                type="number" placeholder="150" value={data.venueLengthFt || ''}
                onChange={e => onChange({ venueLengthFt: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">ft long</span>
            </div>
          </div>
          <p className="text-white/30 text-xs mt-1">Don't know exactly? Give your best estimate — we'll work with it.</p>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1.5">Ground surface</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'grass', label: '🌿 Grass' },
              { v: 'concrete', label: '🏗️ Concrete' },
              { v: 'asphalt', label: '🛣️ Asphalt' },
              { v: 'pavers', label: '🧱 Pavers' },
              { v: 'sand', label: '🏖️ Sand' },
              { v: 'unknown', label: '❓ Not sure' },
            ].map(s => (
              <button
                key={s.v}
                onClick={() => onChange({ venueSurface: s.v })}
                className={`py-2.5 px-2 rounded-xl text-xs font-medium border transition ${
                  data.venueSurface === s.v
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1.5">Setting</label>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: false, label: '☀️ Outdoor' }, { v: true, label: '🏠 Indoor' }].map(opt => (
              <button
                key={String(opt.v)}
                onClick={() => onChange({ isIndoor: opt.v })}
                className={`py-3 rounded-xl text-sm font-medium border transition ${
                  data.isIndoor === opt.v
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-800 border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1.5">Photo of the space (optional)</label>
          <label className={`flex items-center gap-3 w-full border border-dashed border-white/20 rounded-xl p-4 cursor-pointer hover:border-cyan-500/50 transition ${uploading ? 'opacity-50' : ''}`}>
            {data.venuePhotoUrl ? (
              <img src={data.venuePhotoUrl} alt="venue" className="w-16 h-12 object-cover rounded-lg" />
            ) : (
              <div className="w-16 h-12 bg-slate-800 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white/30" />
              </div>
            )}
            <div>
              <div className="text-sm text-white/70">{uploading ? 'Uploading…' : data.venuePhotoUrl ? 'Photo uploaded ✓' : 'Upload a photo'}</div>
              <div className="text-xs text-white/30">Helps us visualize the layout</div>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl py-3 transition"
        >
          <Sparkles className="w-4 h-4" /> Get AI Recommendations <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StepAI({ data, equipment, generatedItems, aiSummary, onGenerated, onBack, onViewCanvas }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localItems, setLocalItems] = useState(generatedItems || []);

  // Keep localItems in sync when generatedItems changes from outside (e.g. regenerate)
  const handleGenerated = (items, summary) => {
    setLocalItems(items);
    onGenerated(items, summary);
  };

  const updateQty = (id, delta) => {
    const updated = localItems.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) } : item
    ).filter(Boolean);
    setLocalItems(updated);
    onGenerated(updated, aiSummary);
  };

  const removeItem = (id) => {
    const updated = localItems.filter(item => item.id !== id);
    setLocalItems(updated);
    onGenerated(updated, aiSummary);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);

    const seen = new Set();
    const catalogSummary = equipment
      .filter(e => {
        if (!e.name) return false;
        const key = e.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 80)
      .map(e => ({
        id: e.id,
        name: e.name,
        category: e.category || 'Other',
        dailyRate: e.dailyRate || 0,
        footprintW: e.footprintWidth || DEFAULT_FOOTPRINTS[e.category]?.w || 10,
        footprintL: e.footprintLength || DEFAULT_FOOTPRINTS[e.category]?.l || 10,
      }));

    const eventTypeGuide = {
      birthday: 'casual party setup: round tables, chairs, a bounce house or inflatable if kids event, canopy/tent if outdoor',
      quinceañera: 'elegant banquet: round tables with chairs for all guests, head table/staging, dance floor, tent if outdoor, lighting',
      wedding: 'formal reception: round banquet tables, chairs for all, dance floor, staging/altar area, tent if outdoor, elegant lighting',
      corporate: 'professional setup: rectangular tables, chairs, staging/podium, projector area, tent if outdoor',
      municipal: 'large public event: multiple tents/canopies, many chairs, staging, generators, barricade areas, food service tables',
      festival: 'large outdoor event: multiple tents, lots of tables and chairs, staging, generators, light towers for evening',
      other: 'general event: tables and chairs proportional to guest count, tent if outdoor',
    };

    const prompt = `You are an expert event equipment planner for Rental World Equipment in the Rio Grande Valley, TX.

EVENT DETAILS:
- Type: ${data.eventType} — ${eventTypeGuide[data.eventType] || 'general event'}
- Guests: ${data.guestCount}
- Date: ${data.eventDate}${data.eventEndDate ? ' to ' + data.eventEndDate : ''}
- Start time: ${data.eventTime || 'not specified'}
- Setting: ${data.isIndoor ? 'Indoor' : 'Outdoor'}
- Surface: ${data.venueSurface || 'unknown'}
- Space: ${data.venueWidthFt || 80} ft wide × ${data.venueLengthFt || 100} ft long
- Venue: ${data.venueName || 'not specified'}

AVAILABLE EQUIPMENT CATALOG (id, name, category, dailyRate, footprintW ft, footprintL ft):
${JSON.stringify(catalogSummary)}

INSTRUCTIONS:
- Recommend equipment appropriate for a ${data.eventType} event with ${data.guestCount} guests
- Use ONLY equipment IDs from the catalog above
- Place items within ${(data.venueWidthFt || 80) * 10}px wide × ${(data.venueLengthFt || 100) * 10}px tall canvas (10px = 1ft)
- Items must not overlap (account for footprint sizes)
- Chairs: provide 1 per guest. Tables: 1 per 8 guests (round) or 1 per 10 (banquet)
- If outdoor and any powered equipment, include a generator
- Return 4–12 distinct line items (group same items by quantity, do NOT repeat same equipmentId)
- Write a friendly 1-sentence summary explaining what you included and why`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  equipmentId: { type: 'string' },
                  quantity: { type: 'integer' },
                  x: { type: 'number' },
                  y: { type: 'number' },
                  notes: { type: 'string' },
                },
                required: ['equipmentId', 'quantity', 'x', 'y'],
              },
            },
            summary: { type: 'string' },
          },
        },
      });

      const canvasItems = (response.items || []).map(item => {
        const eq = equipment.find(e => e.id === item.equipmentId);
        if (!eq) return null;
        const fp = {
          w: eq.footprintWidth || DEFAULT_FOOTPRINTS[eq.category]?.w || 10,
          l: eq.footprintLength || DEFAULT_FOOTPRINTS[eq.category]?.l || 10,
        };
        return {
          id: crypto.randomUUID(),
          equipmentId: eq.id,
          equipmentName: eq.name,
          category: eq.category,
          widthFt: fp.w,
          lengthFt: fp.l,
          x: Math.max(10, item.x),
          y: Math.max(10, item.y),
          rotation: 0,
          quantity: item.quantity || 1,
          color: CATEGORY_COLORS[eq.category] || CATEGORY_COLORS.default,
          label: eq.name,
          dailyRate: eq.dailyRate || 0,
          notes: item.notes || '',
        };
      }).filter(Boolean);

      handleGenerated(canvasItems, response.summary || '');
    } catch (err) {
      setError('Something went wrong generating the layout. Please try again.');
    }
    setLoading(false);
  };

  // Show results if we already have them
  if (localItems.length > 0) {
    const total = localItems.reduce((s, i) => s + (i.dailyRate || 0) * (i.quantity || 1), 0);
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">AI Equipment Suggestions 🎉</h2>
          <p className="text-white/50 text-sm">{aiSummary || "Here's a suggested setup based on your event."}</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-200 text-xs">
          ⚠️ These are <strong>suggestions only</strong> — not a confirmed order. Adjust quantities or remove items as needed. A Rental World team member will review everything with you before any charges are made.
        </div>

        <div className="space-y-2 max-h-52 overflow-y-auto">
          {localItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2.5">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white font-medium truncate">{item.equipmentName}</div>
                {item.dailyRate > 0 && <div className="text-cyan-400 text-[10px]">${item.dailyRate}/day each</div>}
              </div>
              {/* Quantity stepper */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-white text-xs w-6 text-center font-bold">{item.quantity || 1}</span>
                <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {item.dailyRate > 0 && (
                <span className="text-cyan-400 text-xs font-bold flex-shrink-0 w-16 text-right">
                  ${(item.dailyRate * (item.quantity || 1)).toFixed(0)}/day
                </span>
              )}
              <button onClick={() => removeItem(item.id)} className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {total > 0 && (
          <div className="bg-slate-800 rounded-xl px-4 py-2 flex justify-between">
            <span className="text-white/50 text-sm">Est. daily total</span>
            <span className="text-cyan-400 font-bold">${total.toFixed(2)}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={generate} disabled={loading} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Regenerate
          </button>
          <button
            onClick={onViewCanvas}
            className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl py-3 transition"
          >
            <Eye className="w-4 h-4" /> View on Canvas <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // No result yet — generate prompt
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Ready to generate your layout</h2>
        <p className="text-white/50 text-sm">Our AI will recommend equipment based on your <strong className="text-white">{data.eventType}</strong> event for <strong className="text-white">{data.guestCount} guests</strong>.</p>
      </div>

      <div className="bg-slate-800 rounded-2xl p-5 space-y-2.5">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Your Event Summary</div>
        {[
          ['Type', data.eventType],
          ['Guests', data.guestCount],
          ['Start Date', data.eventDate],
          ['End Date', data.eventEndDate],
          ['Start Time', data.eventTime ? to12h(data.eventTime) : null],
          ['Setting', data.isIndoor ? 'Indoor' : 'Outdoor'],
          ['Surface', data.venueSurface],
          ['Space', data.venueWidthFt && data.venueLengthFt ? `${data.venueWidthFt} × ${data.venueLengthFt} ft` : 'Not specified'],
        ].map(([label, val]) => val ? (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-white/50">{label}</span>
            <span className="text-white font-medium capitalize">{String(val)}</span>
          </div>
        ) : null)}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-blue-200 text-xs">
        💡 The AI will suggest equipment appropriate for your event type. You can adjust quantities or remove items before submitting — nothing is charged until you confirm with our team.
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">{error}</div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={generate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-bold rounded-xl py-3.5 transition"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Building your layout…</>
            : <><Sparkles className="w-4 h-4" /> Generate My Layout</>}
        </button>
      </div>
    </div>
  );
}

function StepReview({ canvasItems, onSubmit, onBack, submitting }) {
  const total = canvasItems.reduce((s, i) => s + (i.dailyRate || 0) * (i.quantity || 1), 0);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Review your plan</h2>
        <p className="text-white/50 text-sm">Everything look good? Submit it and our team will follow up.</p>
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {canvasItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
            <div className="flex-1 text-sm text-white truncate">{item.equipmentName}</div>
            {item.quantity > 1 && <span className="text-xs text-white/50">×{item.quantity}</span>}
            {item.dailyRate > 0 && <span className="text-cyan-400 text-xs font-bold flex-shrink-0">${(item.dailyRate * item.quantity).toFixed(0)}/day</span>}
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="bg-slate-800 rounded-xl px-4 py-3 flex justify-between">
          <span className="text-white/60 text-sm">Estimated daily total</span>
          <span className="text-cyan-400 font-black text-lg">${total.toFixed(2)}</span>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        💬 A Rental World team member will review your plan and contact you to confirm details and pricing. <strong>No charges are made until you approve.</strong>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition">
          <ArrowLeft className="w-4 h-4" /> Back to Layout
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold rounded-xl py-3.5 transition"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            : <>Submit for Review <CheckCircle2 className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );
}

export default function CustomerWizard({ equipment, onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ eventType: 'other', venueSurface: 'unknown', isIndoor: false });
  const [generatedItems, setGeneratedItems] = useState([]);
  const [aiSummary, setAiSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (patch) => setData(p => ({ ...p, ...patch }));

  const handleGenerated = (items, summary) => {
    setGeneratedItems(items);
    if (summary !== undefined) setAiSummary(summary);
  };

  const handleViewCanvas = () => {
    onComplete({
      ...data,
      canvasItems: generatedItems,
      title: `${data.customerName || 'Customer'}'s ${data.eventType || 'Event'}`,
      ownerRole: 'customer',
      status: 'customer_review',
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await onComplete({
      ...data,
      canvasItems: generatedItems,
      title: `${data.customerName || 'Customer'}'s ${data.eventType || 'Event'}`,
      ownerRole: 'customer',
      status: 'customer_review',
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-white/30 hover:text-white text-lg leading-none">✕</button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black">AE</span>
          </div>
          <div>
            <div className="text-white font-black text-sm">AIREvents</div>
            <div className="text-white/40 text-xs">Event Layout Wizard</div>
          </div>
        </div>

        <StepIndicator current={step} onGoTo={setStep} />

        {step === 0 && <StepEvent data={data} onChange={update} onNext={() => setStep(1)} />}
        {step === 1 && <StepVenue data={data} onChange={update} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && (
          <StepAI
            data={data}
            equipment={equipment}
            generatedItems={generatedItems}
            aiSummary={aiSummary}
            onGenerated={handleGenerated}
            onBack={() => setStep(1)}
            onViewCanvas={handleViewCanvas}
          />
        )}
        {step === 3 && (
          <StepReview
            canvasItems={generatedItems}
            onSubmit={handleSubmit}
            onBack={() => setStep(2)}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}