import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Topaz SigWeb signature pad (LBK462-HSB) with mouse/touch fallback.
 *
 * SigWeb runs a local HTTPS service on port 47290 (HTTP on 47289).
 * Because the app is served over HTTPS, we MUST use port 47290.
 * The DNS alias tablet.sigwebtablet.com resolves to 127.0.0.1 and has
 * a self-signed cert that browsers accept for this purpose.
 *
 * Key API (from official SigWebTablet.js source):
 *   SigWebSetDisplayTarget(ctx2d) — pass the 2D canvas CONTEXT, not the element
 *   SetTabletState(1)             — activates pad
 *   ClearTablet()                 — clears ink buffer
 *   SigWebRefresh()               — call every ~50ms to render ink onto canvas
 *   NumberOfTabletPoints()        — returns captured point count
 *   GetSigImageB64(callback)      — returns base64 PNG
 */

// SigWeb serves its JS from the local service OR from sigplusweb.com (CDN fallback)
// Topaz recommends the CDN copy so the cert is always trusted
const SIGWEB_CDN_URL = 'https://www.sigplusweb.com/SigWebTablet.js';

function loadSigWebScript() {
  return new Promise((resolve, reject) => {
    if (window.SigWebSetDisplayTarget && window.SetTabletState) { resolve(); return; }

    const existing = document.querySelector('script[data-sigweb]');
    if (existing) {
      // Already injected — wait for it or resolve immediately
      if (window.SigWebSetDisplayTarget) { resolve(); return; }
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-sigweb', '1');
    // Use Topaz's own CDN — avoids cert/LNA issues with tablet.sigwebtablet.com
    script.src = SIGWEB_CDN_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('SigWeb JS not reachable'));
    document.head.appendChild(script);
  });
}

export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [sigwebStatus, setSigwebStatus] = useState('checking'); // 'checking' | 'active' | 'fallback'
  const [sigwebError, setSigwebError] = useState('');
  const lastPos = useRef(null);
  const refreshTimer = useRef(null);

  // ── Activate SigWeb pad ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await loadSigWebScript();
        if (!active) return;

        // Pre-flight: verify the local SigWeb service is actually reachable
        // This fetch WITHOUT 'no-cors' will trigger the browser's Local Network Access permission dialog
        const port = 47290;
        const preflightUrl = `https://tablet.sigwebtablet.com:${port}/SigWeb/SigWebVersion`;
        await fetch(preflightUrl, { cache: 'no-store' })
          .catch(() => { throw new Error('SigWeb service not reachable on port 47290 — is SigWeb running?'); });

        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // MUST pass the 2D context (not the canvas element)
        window.SigWebSetDisplayTarget(ctx);
        window.ClearTablet();
        window.SetTabletState(1);

        setSigwebStatus('active');

        // SigWebRefresh pulls new ink from the SigWeb service and draws it on canvas
        refreshTimer.current = setInterval(() => {
          if (!active) return;
          try {
            window.SigWebRefresh();
            if (window.NumberOfTabletPoints && window.NumberOfTabletPoints() > 0) {
              setIsEmpty(false);
            }
          } catch {}
        }, 50);

      } catch (err) {
        console.warn('[SignaturePad] SigWeb unavailable:', err.message);
        if (active) {
          setSigwebStatus('fallback');
          setSigwebError(err.message);
        }
      }
    })();

    return () => {
      active = false;
      clearInterval(refreshTimer.current);
      try { if (window.SetTabletState) window.SetTabletState(0); } catch {}
    };
  }, []);

  // ── Size canvas to its container ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = () => {
      const w = canvas.offsetWidth;
      canvas.width = w;
      canvas.height = 140;
    };
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, []);

  // ── Mouse / touch fallback ──────────────────────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = useCallback((e) => {
    if (sigwebStatus === 'active') return;
    e.preventDefault();
    setDrawing(true);
    setIsEmpty(false);
    lastPos.current = getPos(e);
  }, [sigwebStatus]);

  const draw = useCallback((e) => {
    if (sigwebStatus === 'active' || !drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
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
  }, [sigwebStatus, drawing]);

  const stopDraw = useCallback(() => { setDrawing(false); lastPos.current = null; }, []);

  // ── Clear ───────────────────────────────────────────────────────────────────
  const handleClear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setIsEmpty(true);
    try { if (window.ClearTablet) window.ClearTablet(); } catch {}
    if (onClear) onClear();
  };

  // ── Accept ──────────────────────────────────────────────────────────────────
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

  const isActive = sigwebStatus === 'active';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Signature</div>
        {sigwebStatus === 'active' && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Topaz pad active
          </div>
        )}
        {sigwebStatus === 'fallback' && <div className="text-xs text-amber-500">Mouse / touch mode</div>}
        {sigwebStatus === 'checking' && <div className="text-xs text-gray-300 animate-pulse">Detecting pad…</div>}
      </div>

      <div
        className={`border-2 border-dashed rounded-lg bg-gray-50 relative ${isActive ? 'border-emerald-400' : 'border-gray-300'}`}
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
              {isActive ? 'Sign on the Topaz pad' : 'Sign here'}
            </span>
            {sigwebStatus === 'fallback' && (
              <span className="text-gray-300 text-xs">SigWeb not detected — using mouse/touch</span>
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

      {sigwebStatus === 'fallback' && (
        <div className="text-xs text-gray-500 space-y-1.5 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1">
          <p className="font-semibold text-amber-800">⚠ Topaz pad not detected — using mouse/touch fallback</p>
          <p className="text-amber-700">
            The SigWeb service at <code className="bg-amber-100 px-1 rounded">tablet.sigwebtablet.com:47290</code> is not responding.
          </p>
          <ol className="list-decimal ml-4 space-y-1 text-amber-700">
            <li>Make sure <strong>SigWeb is running</strong> — look for its icon in the system tray (taskbar).</li>
            <li>Open <a href="https://www.sigplusweb.com/webdemo_sign.htm" target="_blank" rel="noreferrer" className="underline text-indigo-600 font-medium">Topaz Web Demo</a> — if signing works there, SigWeb is running correctly.</li>
            <li>If the demo works, <strong>check for a browser permission prompt</strong> (shield icon in address bar) for local network access and click <strong>Allow</strong>.</li>
            <li>Then <button onClick={() => window.location.reload()} className="underline text-indigo-600 font-medium">reload this page</button>.</li>
          </ol>
          {sigwebError && <p className="text-red-500 text-xs font-mono mt-1">{sigwebError}</p>}
        </div>
      )}
    </div>
  );
}