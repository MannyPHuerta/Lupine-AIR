import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowRight, ArrowLeft, Sparkles, Loader2, CheckCircle2, Upload, Eye } from 'lucide-react';

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
            <label className="text-xs text-white/50 block mb-1.5">Start date</label>
            <input
              type="date"
              value={data.eventDate || ''}
              onChange={e => onChange({ eventDate: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="text-xs text-white/50 block mb-1.5">Start time</label>
            <input
              type="time"
              value={data.eventTime || ''}
              onChange={e => onChange({ eventTime: e.target.value })}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className="text-xs text-white/50 block mb-1.5">Available space (approximate)</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number" placeholder="100" value={data.venueWidthFt || ''}
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
          <Sparkles className="w-4 h-4" /> Generate My Layout <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StepAI({ data, equipment, generatedItems, aiSummary, onGenerated, onBack, onViewCanvas }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

    const prompt = `You are an expert event layout planner for Rental World Equipment in the Rio Grande Valley, TX.

EVENT DETAILS:
- Type: ${data.eventType}
- Guests: ${data.guestCount}
- Date: ${data.eventDate}
- Setting: ${data.isIndoor ? 'Indoor' : 'Outdoor'}
- Surface: ${data.venueSurface || 'unknown'}
- Space: ${data.venueWidthFt || 80} ft wide × ${data.venueLengthFt || 100} ft long
- Venue: ${data.venueName || 'not specified'}

AVAILABLE EQUIPMENT CATALOG (id, name, category, dailyRate, footprintW ft, footprintL ft):
${JSON.stringify(catalogSummary)}

Create a practical, realistic equipment layout. Rules:
- Use ONLY equipment IDs from the catalog above
- Place items within ${(data.venueWidthFt || 80) * 10}px wide × ${(data.venueLengthFt || 100) * 10}px tall canvas (10px = 1ft)
- Items must not overlap (account for footprint sizes)
- Include chairs for all guests, tables (1 per 8 guests), tent if outdoor
- If outdoor with powered items, add a generator
- Return 4–12 line items
- Write a friendly 1-sentence summary for the customer`;

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

      onGenerated(canvasItems, response.summary || '');
    } catch (err) {
      setError('Something went wrong generating the layout. Please try again.');
    }
    setLoading(false);
  };

  // Show results if we already have them
  if (generatedItems && generatedItems.length > 0) {
    const total = generatedItems.reduce((s, i) => s + (i.dailyRate || 0) * (i.quantity || 1), 0);
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Your layout is ready! 🎉</h2>
          <p className="text-white/50 text-sm">{aiSummary || "Here's your suggested event setup."}</p>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto">
          {generatedItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{item.equipmentName}</div>
                {item.notes && <div className="text-xs text-white/40 truncate">{item.notes}</div>}
              </div>
              {item.quantity > 1 && <span className="text-xs text-white/50 flex-shrink-0">×{item.quantity}</span>}
              {item.dailyRate > 0 && <span className="text-cyan-400 text-xs font-bold flex-shrink-0">${(item.dailyRate * item.quantity).toFixed(0)}/day</span>}
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
        <p className="text-white/50 text-sm">Our AI will build a custom floor plan based on your event details.</p>
      </div>

      <div className="bg-slate-800 rounded-2xl p-5 space-y-2.5">
        <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Your Event Summary</div>
        {[
          ['Type', data.eventType],
          ['Guests', data.guestCount],
          ['Start Date', data.eventDate],
          ['End Date', data.eventEndDate],
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
        💬 A Rental World team member will review your plan and contact you to confirm details and pricing.
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
    setAiSummary(summary);
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