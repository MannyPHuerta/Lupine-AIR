import { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, X, ChevronDown, ChevronRight } from 'lucide-react';

function computeNudges(canvasItems, guestCount, venueSurface, eventType) {
  const nudges = [];
  const categories = canvasItems.map(i => i.category || '');
  const hasTent = categories.includes('Tent');
  const hasGenerator = categories.includes('Generator');
  const hasInflatable = categories.includes('Inflatable');
  const hasStaging = categories.includes('Staging');
  const hasDanceFloor = categories.includes('Dance Floor');

  const tentItems = canvasItems.filter(i => i.category === 'Tent');
  const totalTentSqFt = tentItems.reduce((s, t) => s + ((t.widthFt || 0) * (t.lengthFt || 0)), 0);

  if ((hasTent || hasInflatable || hasDanceFloor) && !hasGenerator) {
    nudges.push({ id: 'power_needed', severity: 'error', category: 'Power', icon: '⚡', title: 'No power source', detail: 'Outdoor setup detected — a generator is required.' });
  }
  if (hasTent) {
    if (venueSurface === 'concrete' || venueSurface === 'asphalt') {
      nudges.push({ id: 'anchoring_ballast', severity: 'warning', category: 'Anchoring', icon: '⚓', title: 'Hard surface anchoring', detail: `Water barrel ballast required (~${Math.ceil(totalTentSqFt / 100)} barrels).` });
    } else {
      nudges.push({ id: 'anchoring_stakes', severity: 'info', category: 'Anchoring', icon: '⚓', title: 'Stake & rebar anchoring', detail: 'Grass/soft soil — rebar stakes will be used. Confirm surface before day of.' });
    }
  }
  if (totalTentSqFt >= 400) {
    nudges.push({ id: 'permit_tent_fire', severity: 'error', category: 'Permits', icon: '📋', title: 'Fire marshal permit required', detail: `${totalTentSqFt} sq ft tent requires a permit. Allow 5–10 business days.` });
  }
  if (eventType === 'municipal' || eventType === 'festival') {
    nudges.push({ id: 'permit_public', severity: 'error', category: 'Permits', icon: '🏛️', title: 'Public event permits', detail: 'Temporary structure permit, health inspection, and noise variance may apply.' });
  }
  if (hasStaging) {
    nudges.push({ id: 'staging_safety', severity: 'warning', category: 'Safety', icon: '🎤', title: 'Staging safety check', detail: 'Stages over 6" require an accessible ramp for ADA compliance.' });
  }
  if (guestCount >= 50) {
    const req = Math.ceil(guestCount * 0.02);
    nudges.push({ id: 'ada_seating', severity: 'warning', category: 'ADA', icon: '♿', title: `${req} accessible seats required`, detail: `~2% of ${guestCount} guests. Verify aisle widths ≥ 60 inches.` });
  }
  if (hasInflatable) {
    nudges.push({ id: 'inflatable_wind', severity: 'warning', category: 'Safety', icon: '🌬️', title: 'Wind monitoring required', detail: 'Deflate when winds exceed 25 mph. Assign staff to monitor.' });
  }
  const month = new Date().getMonth();
  if ([4, 5, 6, 7, 8].includes(month) && hasTent) {
    nudges.push({ id: 'heat_cooling', severity: 'info', category: 'Comfort', icon: '🌡️', title: 'Summer heat advisory', detail: 'May–Sep in the RGV can exceed 100°F. Consider portable AC or evaporative coolers.' });
  }
  return nudges;
}

const SEVER = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />, dot: 'bg-red-400' },
  warning: { bg: 'bg-amber-500/10 border-amber-500/30', icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />, dot: 'bg-amber-400' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />, dot: 'bg-blue-400' },
};

export default function SmartChecklist({ canvasItems, guestCount, venueSurface, eventType, acknowledged, onAcknowledge }) {
  const [expanded, setExpanded] = useState(false);

  const nudges = computeNudges(canvasItems, guestCount, venueSurface, eventType);
  const active = nudges.filter(n => !acknowledged.includes(n.id));
  const done = nudges.filter(n => acknowledged.includes(n.id));

  const errors = active.filter(n => n.severity === 'error').length;
  const warnings = active.filter(n => n.severity === 'warning').length;

  // Collapsed: show summary badge + top 2 issues
  const topIssues = active.slice(0, 2);

  if (!expanded) {
    return (
      <div className="h-full flex flex-col bg-slate-900 border-l border-white/10 w-56 flex-shrink-0">
        <button
          onClick={() => setExpanded(true)}
          className="p-3 border-b border-white/10 w-full text-left hover:bg-white/5 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Checklist</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {errors > 0 && (
              <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5 text-[10px] text-red-300 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{errors} required
              </span>
            )}
            {warnings > 0 && (
              <span className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 rounded-full px-2 py-0.5 text-[10px] text-amber-300 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{warnings} warnings
              </span>
            )}
            {errors === 0 && warnings === 0 && active.length === 0 && (
              <span className="flex items-center gap-1 text-green-400 text-[10px]">
                <CheckCircle2 className="w-3 h-3" /> All clear
              </span>
            )}
          </div>
        </button>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {topIssues.map(nudge => {
            const s = SEVER[nudge.severity];
            return (
              <div key={nudge.id} className={`rounded-lg border p-2.5 ${s.bg}`}>
                <div className="flex items-start gap-1.5">
                  {s.icon}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white leading-tight">{nudge.icon} {nudge.title}</div>
                    <div className="text-white/50 text-[10px] mt-0.5 leading-relaxed line-clamp-2">{nudge.detail}</div>
                  </div>
                  <button onClick={() => onAcknowledge(nudge.id)} className="text-white/20 hover:text-white/60 flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
          {active.length > 2 && (
            <button onClick={() => setExpanded(true)} className="w-full text-center text-[11px] text-white/30 hover:text-cyan-400 py-1 transition">
              +{active.length - 2} more issues →
            </button>
          )}
          {nudges.length === 0 && (
            <div className="text-center py-4 text-white/20 text-[11px]">Add items to see checklist</div>
          )}
          {done.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <div className="text-[10px] text-white/20 px-1 mb-1">Done ({done.length})</div>
              {done.map(n => (
                <div key={n.id} className="flex items-center gap-1.5 px-1 py-0.5 text-white/20 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-green-700" />
                  <span className="line-through truncate">{n.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded: full checklist
  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-white/10 w-72 flex-shrink-0">
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Event Checklist</div>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {errors > 0 && <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5 text-[10px] text-red-300 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />{errors} required</span>}
            {warnings > 0 && <span className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 rounded-full px-2 py-0.5 text-[10px] text-amber-300 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{warnings} warnings</span>}
            {errors === 0 && warnings === 0 && active.length === 0 && <span className="flex items-center gap-1 text-green-400 text-[10px]"><CheckCircle2 className="w-3 h-3" /> All clear</span>}
          </div>
        </div>
        <button onClick={() => setExpanded(false)} className="text-white/30 hover:text-white transition">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {active.map(nudge => {
          const s = SEVER[nudge.severity];
          return (
            <div key={nudge.id} className={`rounded-lg border p-3 ${s.bg}`}>
              <div className="flex items-start gap-2">
                {s.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white">{nudge.icon} {nudge.title}</div>
                  <div className="text-white/50 text-[11px] mt-0.5 leading-relaxed">{nudge.detail}</div>
                </div>
                <button onClick={() => onAcknowledge(nudge.id)} className="text-white/20 hover:text-white/60 flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
        {done.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] text-white/20 px-1 mb-1">Acknowledged ({done.length})</div>
            {done.map(n => (
              <div key={n.id} className="flex items-center gap-2 px-1 py-1 text-white/20 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-green-700" />
                <span className="line-through">{n.title}</span>
              </div>
            ))}
          </div>
        )}
        {nudges.length === 0 && (
          <div className="text-center py-8 text-white/20 text-[11px]">Add items to see checklist</div>
        )}
      </div>
    </div>
  );
}