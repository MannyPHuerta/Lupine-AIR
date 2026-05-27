import { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, Usb, Pen, Target, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// tx/ty are percentage coords used for hit detection — must match the visual position
const TARGETS = [
  { id: 'tl', label: 'Top-Left',     tx: 12, ty: 12, style: { top: '8%',  left: '8%'  } },
  { id: 'tr', label: 'Top-Right',    tx: 88, ty: 12, style: { top: '8%',  right: '8%' } },
  { id: 'c',  label: 'Center',       tx: 50, ty: 50, style: { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' } },
  { id: 'bl', label: 'Bottom-Left',  tx: 12, ty: 88, style: { bottom: '8%', left: '8%'  } },
  { id: 'br', label: 'Bottom-Right', tx: 88, ty: 88, style: { bottom: '8%', right: '8%' } },
];

export default function HardwareDiagnostic() {
  const padRef = useRef(null);
  const [hits, setHits] = useState(new Set());
  const [lastEvent, setLastEvent] = useState(null);
  const [history, setHistory] = useState([]);
  const [pointerType, setPointerType] = useState(null);
  const [pressure, setPressure] = useState(0);
  const [ripples, setRipples] = useState([]);


  const [liveCoords, setLiveCoords] = useState(null);

  const getRelativeCoords = (e) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      px: ((e.clientX - rect.left) / rect.width) * 100,
      py: ((e.clientY - rect.top) / rect.height) * 100,
      rect,
    };
  };

  const handlePointerMove = useCallback((e) => {
    setPressure(e.pressure || 0);
    setPointerType(e.pointerType || 'unknown');
    const coords = getRelativeCoords(e);
    if (coords) setLiveCoords({ px: coords.px.toFixed(0), py: coords.py.toFixed(0) });
  }, []);

  const handlePointerDown = useCallback((e) => {
    const coords = getRelativeCoords(e);
    if (!coords) return;

    const type = e.pointerType || 'mouse';
    setPointerType(type);
    setPressure(e.pressure || 0);

    const { x, y, px, py } = coords;

    // Spawn ripple at the actual relative position
    const id = Date.now();
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 700);

    setLastEvent({ x: x.toFixed(0), y: y.toFixed(0), px: px.toFixed(0), py: py.toFixed(0), type, pressure: (e.pressure || 0).toFixed(2) });
    setHistory(prev => [{
      time: new Date().toLocaleTimeString(),
      type,
      x: px.toFixed(0), y: py.toFixed(0),
      pressure: (e.pressure || 0).toFixed(2),
    }, ...prev.slice(0, 9)]);

    TARGETS.forEach(t => {
      const dist = Math.hypot(px - t.tx, py - t.ty);
      if (dist < 18) setHits(prev => new Set([...prev, t.id]));
    });
  }, []);

  const reset = () => {
    setHits(new Set());
    setLastEvent(null);
    setHistory([]);
    setPointerType(null);
    setPressure(0);
    setRipples([]);
  };

  const allHit = hits.size === TARGETS.length;
  const statusColor = allHit ? 'text-emerald-600' : hits.size > 0 ? 'text-amber-500' : 'text-gray-400';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Usb className="w-4 h-4 text-indigo-500" />
            Signature Tablet Diagnostic
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Plug in your USB tablet and tap all five targets to verify it's working.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset} className="gap-1">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </Button>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 bg-gray-50 rounded-lg border px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Input:</span>
          <span className={`font-semibold ${pointerType === 'pen' ? 'text-indigo-600' : pointerType ? 'text-gray-700' : 'text-gray-400'}`}>
            {pointerType ? pointerType.toUpperCase() : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Pressure:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-100"
                style={{ width: `${pressure * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 w-8">{(pressure * 100).toFixed(0)}%</span>
          </div>
        </div>
        {liveCoords && (
          <div className="flex items-center gap-1 text-xs font-mono text-gray-400">
            <span>x:{liveCoords.px}%</span>
            <span>y:{liveCoords.py}%</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {allHit ? (
            <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600 font-semibold text-xs">All targets hit — tablet OK!</span></>
          ) : (
            <span className={`text-xs font-medium ${statusColor}`}>{hits.size}/{TARGETS.length} targets hit</span>
          )}
        </div>
      </div>

      {/* Drawing pad */}
      <div
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className="relative w-full rounded-xl border-2 border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50 to-white overflow-hidden select-none touch-none cursor-crosshair"
        style={{ aspectRatio: '4/3', height: 'auto' }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6366f1" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Targets */}
        {TARGETS.map(t => {
          const hit = hits.has(t.id);
          return (
            <div
              key={t.id}
              className="absolute pointer-events-none flex flex-col items-center gap-1"
              style={t.style}
            >
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                hit
                  ? 'bg-emerald-100 border-emerald-500 shadow-lg shadow-emerald-200'
                  : 'bg-white/70 border-indigo-300'
              }`}>
                {hit
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  : <Target className="w-5 h-5 text-indigo-400" />
                }
              </div>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${hit ? 'text-emerald-600 bg-emerald-50' : 'text-indigo-400 bg-white/60'}`}>
                {t.label}
              </span>
            </div>
          );
        })}

        {/* Ripples */}
        {ripples.map(r => (
          <div
            key={r.id}
            className="absolute pointer-events-none rounded-full border-2 border-indigo-400 animate-ping"
            style={{ left: r.x - 16, top: r.y - 16, width: 32, height: 32 }}
          />
        ))}

        {/* Center instruction */}
        {hits.size === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <Pen className="w-8 h-8 text-indigo-300" />
            <span className="text-sm text-indigo-400 font-medium">Tap or draw anywhere with your tablet pen</span>
            <span className="text-xs text-indigo-300">Then tap each of the 5 corner/center targets</span>
          </div>
        )}

        {allHit && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-emerald-600 text-white text-xs font-semibold rounded-full px-4 py-1.5 shadow-lg">
              ✓ Tablet verified and working correctly
            </div>
          </div>
        )}
      </div>

      {/* Event log */}
      {history.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-3 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
          <div className="text-gray-400 mb-2 text-xs font-sans font-semibold">Event log</div>
          {history.map((ev, i) => (
            <div key={i} className={`${i === 0 ? 'text-green-400' : 'text-gray-500'}`}>
              {ev.time} &nbsp;
              <span className={ev.type === 'pen' ? 'text-indigo-400' : 'text-yellow-400'}>{ev.type}</span>
              &nbsp; x={ev.x}% y={ev.y}% pressure={ev.pressure}
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      <div className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        💡 <strong>Tip:</strong> If nothing registers, try a different USB port or cable. Tablets are plug-and-play — no drivers required for the XP-Pen Star G430S or Wacom CTL-4100.
      </div>
    </div>
  );
}