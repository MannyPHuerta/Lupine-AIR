import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronRight, X } from 'lucide-react';

function computeNudges(canvasItems, guestCount, venueSurface, eventType) {
  const nudges = [];
  const categories = canvasItems.map(i => i.category || '');
  const hasTent = categories.includes('Tent');
  const hasGenerator = categories.includes('Generator');
  const hasInflatable = categories.includes('Inflatable');
  const hasStaging = categories.includes('Staging');
  const hasDanceFloor = categories.includes('Dance Floor');
  const hasLighting = categories.includes('Light Tower');

  const tentItems = canvasItems.filter(i => i.category === 'Tent');
  const totalTentSqFt = tentItems.reduce((s, t) => s + ((t.widthFt || 0) * (t.lengthFt || 0)), 0);

  // Power
  if ((hasTent || hasInflatable || hasDanceFloor) && !hasGenerator) {
    nudges.push({
      id: 'power_needed',
      severity: 'error',
      category: 'Power',
      icon: '⚡',
      title: 'No power source',
      detail: 'Outdoor setup detected — a generator is required. Add one from the Equipment panel.',
    });
  }

  // Anchoring
  if (hasTent) {
    if (venueSurface === 'concrete' || venueSurface === 'asphalt') {
      nudges.push({
        id: 'anchoring_ballast',
        severity: 'warning',
        category: 'Anchoring',
        icon: '⚓',
        title: 'Hard surface anchoring',
        detail: `${venueSurface === 'concrete' ? 'Concrete' : 'Asphalt'} surface — water barrel ballast required. Approximately ${Math.ceil(totalTentSqFt / 100)} barrels needed.`,
      });
    } else if (venueSurface === 'grass' || venueSurface === 'unknown') {
      nudges.push({
        id: 'anchoring_stakes',
        severity: 'info',
        category: 'Anchoring',
        icon: '⚓',
        title: 'Stake & rebar anchoring',
        detail: 'Grass/soft soil surface — rebar stakes will be used. Confirm surface before day of.',
      });
    }
  }

  // Permits — tent size
  if (totalTentSqFt >= 400) {
    nudges.push({
      id: 'permit_tent_fire',
      severity: 'error',
      category: 'Permits',
      icon: '📋',
      title: 'Fire marshal permit required',
      detail: `Tent over 400 sq ft (${totalTentSqFt} sq ft total) requires a fire marshal permit. Allow 5–10 business days.`,
    });
  }

  // Permits — public/municipal
  if (eventType === 'municipal' || eventType === 'festival') {
    nudges.push({
      id: 'permit_public',
      severity: 'error',
      category: 'Permits',
      icon: '🏛️',
      title: 'Public event permits',
      detail: 'Public/municipal events typically require: temporary structure permit, health dept inspection, and possibly noise variance.',
    });
  }

  // Staging safety
  if (hasStaging) {
    nudges.push({
      id: 'staging_safety',
      severity: 'warning',
      category: 'Safety',
      icon: '🎤',
      title: 'Staging safety check',
      detail: 'Confirm stage height. Stages over 6" require accessible ramp or lift for ADA compliance.',
    });
  }

  // ADA — guest count seating
  if (guestCount >= 50) {
    const requiredAccessible = Math.ceil(guestCount * 0.02);
    nudges.push({
      id: 'ada_seating',
      severity: 'warning',
      category: 'ADA',
      icon: '♿',
      title: `${requiredAccessible} accessible seats required`,
      detail: `Events with ${guestCount}+ guests require ~2% accessible seating (${requiredAccessible} seats). Verify aisle widths ≥ 60 inches.`,
    });
  }

  // Manpower — tent
  if (hasTent && totalTentSqFt > 0) {
    const crew = Math.max(2, Math.ceil(totalTentSqFt / 400) * 2);
    nudges.push({
      id: 'manpower_tent',
      severity: 'info',
      category: 'Crew',
      icon: '👷',
      title: `~${crew} crew members for setup`,
      detail: `Based on ${totalTentSqFt} sq ft of tent. Setup typically takes ${Math.ceil(crew / 2)} hours. Schedule delivery window accordingly.`,
    });
  }

  // Inflatable safety
  if (hasInflatable) {
    nudges.push({
      id: 'inflatable_wind',
      severity: 'warning',
      category: 'Safety',
      icon: '🌬️',
      title: 'Wind monitoring required',
      detail: 'Inflatables must be deflated when winds exceed 25 mph. Assign staff to monitor during event.',
    });
  }

  // Heat (RGV summers)
  const month = new Date().getMonth();
  if ([4, 5, 6, 7, 8].includes(month) && hasTent) {
    nudges.push({
      id: 'heat_cooling',
      severity: 'info',
      category: 'Comfort',
      icon: '🌡️',
      title: 'Summer heat advisory',
      detail: 'May–September in the RGV can exceed 100°F. Consider adding evaporative coolers or portable AC units.',
    });
  }

  return nudges;
}

const SEVERITY_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />, dot: 'bg-red-400' },
  warning: { bg: 'bg-amber-500/10 border-amber-500/30', icon: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />, dot: 'bg-amber-400' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />, dot: 'bg-blue-400' },
};

export default function NudgePanel({ canvasItems, guestCount, venueSurface, eventType, acknowledged, onAcknowledge }) {
  const [collapsed, setCollapsed] = useState({});
  const nudges = computeNudges(canvasItems, guestCount, venueSurface, eventType);
  const active = nudges.filter(n => !acknowledged.includes(n.id));
  const done = nudges.filter(n => acknowledged.includes(n.id));

  const errors = active.filter(n => n.severity === 'error').length;
  const warnings = active.filter(n => n.severity === 'warning').length;

  const grouped = {};
  active.forEach(n => {
    if (!grouped[n.category]) grouped[n.category] = [];
    grouped[n.category].push(n);
  });

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-white/10 w-72 flex-shrink-0">
      <div className="p-3 border-b border-white/10">
        <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Event Checklist</div>
        <div className="flex gap-2">
          {errors > 0 && (
            <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-red-300 text-xs font-bold">{errors} required</span>
            </div>
          )}
          {warnings > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 rounded-full px-2 py-0.5">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-amber-300 text-xs font-bold">{warnings} warnings</span>
            </div>
          )}
          {errors === 0 && warnings === 0 && active.length === 0 && (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All checks passed</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <button
              onClick={() => setCollapsed(p => ({ ...p, [cat]: !p[cat] }))}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-white/50 hover:text-white/80"
            >
              <span>{cat}</span>
              {collapsed[cat] ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {!collapsed[cat] && items.map(nudge => {
              const style = SEVERITY_STYLES[nudge.severity];
              return (
                <div key={nudge.id} className={`rounded-lg border p-3 mb-1.5 ${style.bg}`}>
                  <div className="flex items-start gap-2">
                    {style.icon}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white">{nudge.icon} {nudge.title}</div>
                      <div className="text-white/50 text-[11px] mt-0.5 leading-relaxed">{nudge.detail}</div>
                    </div>
                    <button
                      onClick={() => onAcknowledge(nudge.id)}
                      className="text-white/20 hover:text-white/60 flex-shrink-0"
                      title="Acknowledge"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {done.length > 0 && (
          <div className="pt-2">
            <div className="text-xs text-white/20 px-2 mb-1">Acknowledged ({done.length})</div>
            {done.map(n => (
              <div key={n.id} className="flex items-center gap-2 px-2 py-1 text-white/20 text-xs">
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="line-through">{n.title}</span>
              </div>
            ))}
          </div>
        )}

        {nudges.length === 0 && (
          <div className="text-center py-8 text-white/20 text-xs">
            Add items to see checklist
          </div>
        )}
      </div>
    </div>
  );
}