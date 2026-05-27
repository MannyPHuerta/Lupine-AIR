import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Signature pad using HTML5 canvas with mouse/stylus/touch input.
 *
 * The XP-Pen tablet acts as a standard pointer device on the correct display,
 * so we use the canvas directly rather than any SigWeb/Topaz driver integration
 * (which was hijacking input to the wrong display in multi-monitor setups).
 */

export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [showTabletHelp, setShowTabletHelp] = useState(false);
  const [penDetected, setPenDetected] = useState(false);
  const sigwebStatus = 'fallback'; // always use canvas mode
  const lastPos = useRef(null);

  // ── Size canvas to container ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = 140; };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Mouse / touch fallback ───────────────────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    if (e.pointerType === 'pen') setPenDetected(true);
    canvasRef.current.setPointerCapture(e.pointerId);
    setDrawing(true);
    setIsEmpty(false);
    const pos = getPos(e);
    lastPos.current = pos;
    // Draw a dot so single taps/short presses register
    const ctx = canvasRef.current.getContext('2d');
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    ctx.beginPath();
    ctx.fillStyle = '#1e1b4b';
    ctx.arc(pos.x, pos.y, Math.max(0.8, pressure * 1.5), 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const draw = useCallback((e) => {
    if (!drawing) return;
    e.preventDefault();
    if (!lastPos.current) { lastPos.current = getPos(e); return; }
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    ctx.beginPath();
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = Math.max(1, pressure * 3);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [drawing]);

  const stopDraw = useCallback((e) => {
    e.preventDefault();
    setDrawing(false);
    lastPos.current = null;
  }, []);

  // ── Clear ────────────────────────────────────────────────────────────────
  const handleClear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setIsEmpty(true);
    try { if (window.ClearTablet) window.ClearTablet(); } catch {}
    if (onClear) onClear();
  };

  // ── Accept ───────────────────────────────────────────────────────────────
  const handleAccept = () => {
    if (isEmpty) return;
    if (sigwebStatus === 'active' && window.GetSigImageB64) {
      window.GetSigImageB64((b64) => {
        if (b64 && onSave) onSave(`data:image/png;base64,${b64}`);
      });
      return;
    }
    if (onSave) onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Signature</div>
        <div className="text-xs text-gray-400">Stylus / mouse / touch</div>
      </div>

      <div
        className="border-2 border-dashed rounded-lg bg-gray-50 relative border-gray-300"
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          className="w-full rounded-lg cursor-crosshair focus:outline-none focus:ring-2 focus:ring-indigo-400"
          style={{ height: 140, display: 'block' }}
          onFocus={() => canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={stopDraw}
          onPointerCancel={stopDraw}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
            <span className="text-gray-400 text-sm">
              Sign here
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={handleClear}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">
          Clear
        </button>
        <button type="button" onClick={handleAccept} disabled={isEmpty}
          className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition">
          Accept Signature
        </button>
      </div>

      {/* Tablet setup hint — shown only after a pen is detected */}
      {penDetected && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowTabletHelp(h => !h)}
            className="text-xs text-indigo-500 hover:text-indigo-700 underline"
          >
            ✏️ Pen tablet detected — having trouble? Setup guide
          </button>
          {showTabletHelp && (
            <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 space-y-1.5">
              <p className="font-semibold">One-time XP-Pen setup for multi-display:</p>
              <ol className="list-decimal list-inside space-y-1 text-indigo-800">
                <li>Install the XP-Pen driver from <a href="https://www.xp-pen.com/download.html" target="_blank" rel="noreferrer" className="underline font-medium">xp-pen.com/download</a></li>
                <li>Open the XP-Pen driver app (system tray)</li>
                <li>Go to the <strong>Work Area</strong> tab</li>
                <li>Under <strong>Screen Area</strong>, select the monitor showing this form</li>
                <li>Click <strong>Apply</strong> — done!</li>
              </ol>
              <p className="text-indigo-600 pt-1">After setup the pen will draw directly on this signature box.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}