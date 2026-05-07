import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Signature pad supporting:
 *   1. Topaz SigWeb (LBK462-HSB and other Topaz USB/HSB pads)
 *      Requires SigWeb installed & running: https://www.topazsystems.com/software/sigweb.exe
 *      SigWeb exposes SigWebTablet.js at localhost:47289 with global JS functions.
 *   2. Mouse / touch fallback when SigWeb is not detected.
 *
 * Props:
 *   onSave(dataUrl) — called when user clicks "Accept Signature"
 *   onClear()       — called when cleared
 */

const SIGWEB_JS_URL = 'http://localhost:47289/SigWeb/SigWebTablet.js';

function loadSigWebScript() {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.SetTabletState) { resolve(); return; }
    const existing = document.querySelector(`script[src="${SIGWEB_JS_URL}"]`);
    if (existing) { existing.addEventListener('load', resolve); existing.addEventListener('error', reject); return; }
    const script = document.createElement('script');
    script.src = SIGWEB_JS_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('SigWeb not available'));
    document.head.appendChild(script);
  });
}

export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [sigwebAvailable, setSigwebAvailable] = useState(null); // null=checking, true, false
  const lastPos = useRef(null);
  const pollTimer = useRef(null);

  // ── Load SigWebTablet.js and activate tablet ────────────────────────────────
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await loadSigWebScript();
        if (!active) return;

        setSigwebAvailable(true);

        const canvas = canvasRef.current;
        if (canvas) {
          if (window.SetDisplayTarget) window.SetDisplayTarget(canvas);
          if (window.SetDisplayXSize) window.SetDisplayXSize(canvas.offsetWidth);
          if (window.SetDisplayYSize) window.SetDisplayYSize(canvas.offsetHeight);
        }

        // Clear prior ink and turn the pad on
        if (window.ClearTablet) window.ClearTablet();
        if (window.SetTabletState) window.SetTabletState(1);

        // Poll to detect when user has started signing
        pollTimer.current = setInterval(() => {
          if (!active) return;
          try {
            const pts = window.NumberOfTabletPoints ? window.NumberOfTabletPoints() : 0;
            if (pts > 0) setIsEmpty(false);
          } catch {}
        }, 400);

      } catch {
        if (active) setSigwebAvailable(false);
      }
    })();

    return () => {
      active = false;
      clearInterval(pollTimer.current);
      try { if (window.SetTabletState) window.SetTabletState(0); } catch {}
    };
  }, []);

  // ── Resize canvas ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const img = canvas.toDataURL();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (!isEmpty) {
        const image = new Image();
        image.onload = () => ctx.drawImage(image, 0, 0);
        image.src = img;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [isEmpty]);

  // ── Mouse / touch fallback ──────────────────────────────────────────────────
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = useCallback((e) => {
    if (sigwebAvailable) return;
    e.preventDefault();
    setDrawing(true);
    setIsEmpty(false);
    lastPos.current = getPos(e);
  }, [sigwebAvailable]);

  const draw = useCallback((e) => {
    if (sigwebAvailable || !drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [sigwebAvailable, drawing]);

  const stopDraw = useCallback(() => {
    setDrawing(false);
    lastPos.current = null;
  }, []);

  // ── Clear ───────────────────────────────────────────────────────────────────
  const handleClear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    try { if (window.ClearTablet) window.ClearTablet(); } catch {}
    if (onClear) onClear();
  };

  // ── Accept ──────────────────────────────────────────────────────────────────
  const handleAccept = () => {
    if (isEmpty) return;

    if (sigwebAvailable && window.GetSigImageB64) {
      window.GetSigImageB64((b64) => {
        if (b64 && onSave) onSave(`data:image/png;base64,${b64}`);
      });
      return;
    }

    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (onSave) onSave(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Signature</div>
        {sigwebAvailable === true && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Topaz pad active
          </div>
        )}
        {sigwebAvailable === false && (
          <div className="text-xs text-gray-400">Mouse / touch mode</div>
        )}
        {sigwebAvailable === null && (
          <div className="text-xs text-gray-300 animate-pulse">Detecting pad…</div>
        )}
      </div>

      <div
        className={`border-2 border-dashed rounded-lg bg-gray-50 relative ${sigwebAvailable ? 'border-emerald-400' : 'border-gray-300'}`}
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg cursor-crosshair"
          style={{ height: 140, display: 'block' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
            <span className="text-gray-400 text-sm">
              {sigwebAvailable ? 'Sign on the Topaz pad' : 'Sign here'}
            </span>
            {sigwebAvailable === false && (
              <span className="text-gray-300 text-xs">Topaz SigWeb not detected — using mouse/touch</span>
            )}
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

      {sigwebAvailable === false && (
        <p className="text-xs text-gray-400">
          No Topaz pad detected. Install{' '}
          <a href="https://www.topazsystems.com/software/sigweb.exe" target="_blank" rel="noreferrer"
            className="underline hover:text-gray-600">SigWeb</a>{' '}
          and plug in the LBK462 to activate the pad.
        </p>
      )}
    </div>
  );
}