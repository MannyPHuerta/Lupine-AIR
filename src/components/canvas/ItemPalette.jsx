import { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORY_COLORS = {
  Tent: '#6366f1',
  Chair: '#f59e0b',
  Table: '#10b981',
  Generator: '#ef4444',
  Inflatable: '#ec4899',
  Staging: '#8b5cf6',
  'Dance Floor': '#06b6d4',
  'Light Tower': '#f97316',
  default: '#64748b',
};

export default function ItemPalette({ equipment, onDragStart }) {
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
    const groups = {};
    filtered.forEach(e => {
      const cat = e.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(e);
    });
    return groups;
  }, [filtered]);

  const toggleCollapse = (cat) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getFootprint = (eq) => {
    const w = eq.footprintWidth || eq.specs?.widthFt || 0;
    const l = eq.footprintLength || eq.specs?.lengthFt || 0;
    if (w && l) return `${w}×${l} ft`;
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-white/10 w-64 flex-shrink-0">
      <div className="p-3 border-b border-white/10">
        <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Equipment</div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            className="w-full bg-slate-800 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
          <div key={cat}>
            <button
              onClick={() => toggleCollapse(cat)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-white/60 hover:text-white/90 hover:bg-white/5 transition"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.default }} />
                {cat}
                <span className="text-white/30 font-normal">({items.length})</span>
              </span>
              {collapsed[cat] ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {!collapsed[cat] && items.map(eq => {
              const footprint = getFootprint(eq);
              const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
              return (
                <div
                  key={eq.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, eq)}
                  className="mx-2 mb-1 px-3 py-2 rounded-lg border border-white/10 bg-slate-800 hover:bg-slate-700 cursor-grab active:cursor-grabbing transition group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-medium truncate">{eq.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {footprint && <span className="text-white/40 text-[10px]">{footprint}</span>}
                        {eq.dailyRate && <span className="text-cyan-400 text-[10px]">${eq.dailyRate}/day</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="p-4 text-xs text-white/30 text-center">No available items</div>
        )}
      </div>
    </div>
  );
}