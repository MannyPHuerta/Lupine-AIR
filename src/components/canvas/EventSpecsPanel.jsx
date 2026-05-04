import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Plus, Layers } from 'lucide-react';

const CATEGORY_COLORS = {
  Tent: '#6366f1', Chair: '#f59e0b', Table: '#10b981', Generator: '#ef4444',
  Inflatable: '#ec4899', Staging: '#8b5cf6', 'Dance Floor': '#06b6d4',
  'Light Tower': '#f97316', default: '#64748b',
};

function QuickAddField({ equipment, onAdd }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return equipment
      .filter(e => e.unitStatus === 'available' && (!q || e.name?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [equipment, query]);

  const handleSelect = (eq) => {
    onAdd(eq);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-slate-800 border border-white/10 rounded-lg px-2.5 py-2 focus-within:border-cyan-500/50 transition">
        <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        <input
          className="bg-transparent flex-1 text-xs text-white placeholder-white/30 outline-none"
          placeholder="Search & add equipment…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto">
          {results.map(eq => (
            <button
              key={eq.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(eq); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition text-left"
            >
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[eq.category] || CATEGORY_COLORS.default }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white truncate">{eq.name}</div>
                <div className="text-white/40 text-[10px]">{eq.category}{eq.dailyRate ? ` · $${eq.dailyRate}/day` : ''}</div>
              </div>
              <Plus className="w-3 h-3 text-white/30 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BrowseAllDrawer({ equipment, onDragStart, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return equipment.filter(e =>
      e.unitStatus === 'available' &&
      (e.name?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q))
    );
  }, [equipment, search]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(e => {
      const cat = e.category || 'Other';
      if (!g[cat]) g[cat] = [];
      g[cat].push(e);
    });
    return g;
  }, [filtered]);

  return (
    <div className="absolute inset-0 bg-slate-900 z-20 flex flex-col">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wider">All Equipment</span>
        <button onClick={onClose} className="text-white/40 hover:text-white text-xs">✕ Close</button>
      </div>
      <div className="p-2 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            className="w-full bg-slate-800 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <div key={cat}>
            <button
              onClick={() => setCollapsed(p => ({ ...p, [cat]: !p[cat] }))}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/50 hover:text-white/80 hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.default }} />
                {cat} <span className="text-white/30 font-normal">({items.length})</span>
              </span>
              {collapsed[cat] ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {!collapsed[cat] && items.map(eq => (
              <div
                key={eq.id}
                draggable
                onDragStart={e => onDragStart(e, eq)}
                className="mx-2 mb-1 px-3 py-2 rounded-lg border border-white/10 bg-slate-800 hover:bg-slate-700 cursor-grab active:cursor-grabbing transition"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.default }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white font-medium truncate">{eq.name}</div>
                    {eq.dailyRate && <div className="text-cyan-400 text-[10px]">${eq.dailyRate}/day</div>}
                  </div>
                  <button onMouseDown={e => { e.stopPropagation(); onAdd(eq); }} className="p-1 rounded hover:bg-white/10">
                    <Plus className="w-3 h-3 text-white/40" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EventSpecsPanel({
  equipment, onDragStart, onAdd,
  title, setTitle,
  eventDate, setEventDate,
  eventTime, setEventTime,
  eventType, setEventType,
  guestCount, setGuestCount,
  venueSurface, setVenueSurface,
  venueDimensions, setVenueDimensions,
  onSave,
}) {
  const [showBrowse, setShowBrowse] = useState(false);
  const [editingDims, setEditingDims] = useState(false);
  const [w, setW] = useState(venueDimensions.width || '');
  const [l, setL] = useState(venueDimensions.length || '');

  const handleDimsSubmit = (e) => {
    e.preventDefault();
    setVenueDimensions({ width: parseFloat(w) || 0, length: parseFloat(l) || 0 });
    setEditingDims(false);
    onSave?.();
  };

  const handleAddFromSearch = (eq) => {
    onAdd(eq, 60, 60); // center-ish drop
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-white/10 w-56 flex-shrink-0 relative">
      {showBrowse && (
        <BrowseAllDrawer
          equipment={equipment}
          onDragStart={onDragStart}
          onAdd={handleAddFromSearch}
          onClose={() => setShowBrowse(false)}
        />
      )}

      {/* Event Specs */}
      <div className="p-3 border-b border-white/10 space-y-2.5">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Event Details</div>

        {/* Title */}
        <input
          className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-cyan-500"
          placeholder="Event title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={onSave}
        />

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className="text-[10px] text-white/30 mb-0.5">Date</div>
            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 outline-none focus:ring-1 focus:ring-cyan-500" />
          </div>
          <div>
            <div className="text-[10px] text-white/30 mb-0.5">Time</div>
            <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 outline-none focus:ring-1 focus:ring-cyan-500" />
          </div>
        </div>

        {/* Guests + Type */}
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <div className="text-[10px] text-white/30 mb-0.5">Guests</div>
            <input type="number" placeholder="0" value={guestCount || ''} onChange={e => setGuestCount(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 outline-none focus:ring-1 focus:ring-cyan-500" />
          </div>
          <div>
            <div className="text-[10px] text-white/30 mb-0.5">Type</div>
            <select value={eventType} onChange={e => setEventType(e.target.value)}
              className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 outline-none focus:ring-1 focus:ring-cyan-500">
              {['birthday', 'quinceañera', 'wedding', 'corporate', 'municipal', 'festival', 'other'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Surface */}
        <div>
          <div className="text-[10px] text-white/30 mb-0.5">Surface</div>
          <select value={venueSurface} onChange={e => setVenueSurface(e.target.value)}
            className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white/70 outline-none focus:ring-1 focus:ring-cyan-500">
            {['unknown', 'grass', 'asphalt', 'concrete', 'pavers', 'sand', 'mixed'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Venue Dimensions */}
        <div>
          <div className="text-[10px] text-white/30 mb-0.5">Venue (ft)</div>
          {editingDims ? (
            <form onSubmit={handleDimsSubmit} className="flex items-center gap-1">
              <input className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white text-center outline-none" placeholder="W" value={w} onChange={e => setW(e.target.value)} autoFocus />
              <span className="text-white/30 text-xs">×</span>
              <input className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white text-center outline-none" placeholder="L" value={l} onChange={e => setL(e.target.value)} />
              <button type="submit" className="text-cyan-400 text-xs">✓</button>
            </form>
          ) : (
            <button onClick={() => { setW(venueDimensions.width || ''); setL(venueDimensions.length || ''); setEditingDims(true); }}
              className="w-full bg-slate-800 border border-white/10 rounded px-2 py-1 text-[11px] text-white/50 hover:text-white text-left transition">
              {venueDimensions.width && venueDimensions.length ? `${venueDimensions.width} × ${venueDimensions.length} ft` : 'Set dimensions…'}
            </button>
          )}
        </div>
      </div>

      {/* Quick-Add Equipment */}
      <div className="p-3 border-b border-white/10 space-y-2">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Equipment</div>
        <QuickAddField equipment={equipment} onAdd={handleAddFromSearch} />
        <button
          onClick={() => setShowBrowse(true)}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-white/40 hover:text-cyan-400 transition py-1"
        >
          <Layers className="w-3.5 h-3.5" />
          Browse all equipment →
        </button>
      </div>
    </div>
  );
}