import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Topaz SigWeb signature pad (LBK462-HSB) with mouse/touch fallback.
 *
 * Strategy: load SigWebTablet.js from the CDN, call SetTabletState(1),
 * then poll for points. If after a grace period no XHR succeeds, fall back
 * to mouse/touch canvas drawing. No preflight fetch needed.
 */

const SIGWEB_CDN_URL = 'https://www.sigplusweb.com/SigWebTablet.js';
const PROBE_TIMEOUT_MS = 3000; // wait this long for first successful XHR

function loadSigWebScript() {
  return new Promise((resolve, reject) => {
    if (window.SigWebSetDisplayTarget && window.SetTabletState) { resolve(); return; }
    const existing = document.querySelector('script[data-sigweb]');
    if (existing) {
      if (window.SigWebSetDisplayTarget) { resolve(); return; }
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.setAttribute('data-sigweb', '1');
    script.src = SIGWEB_CDN_URL;
    script.onload = resolve;
    script.onerror = () => reject(new Error('SigWeb JS failed to load from CDN'));
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
  const probeTimer = useRef(null);

  // ── Size canvas to its container ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = 140;
    };
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, []);

  // ── Activate SigWeb pad ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    let confirmed = false;

    (async () => {
      try {
        await loadSigWebScript();
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Pass the 2D context to SigWeb (required by API)
        window.SigWebSetDisplayTarget(ctx);

        // Attempt to activate pad — this internally fires XHR to tablet.sigwebtablet.com:47290
        // If SigWeb isn't running, these calls silently fail
        try { window.ClearTablet(); } catch {}
        try { window.SetTabletState(1); } catch {}

        // Poll every 50ms — if we ever get a successful response,
        // NumberOfTabletPoints() will return a value (even 0 is a valid response meaning connected)
        let pollCount = 0;
        refreshTimer.current = setInterval(() => {
          if (!active) return;
          try {
            window.SigWebRefresh();
            const pts = window.NumberOfTabletPoints ? window.NumberOfTabletPoints() : -1;
            if (!confirmed && pts >= 0) {
              // Got a valid numeric response → pad is connected
              confirmed = true;
              clearTimeout(probeTimer.current);
              setSigwebStatus('active');
            }
            if (pts > 0) setIsEmpty(false);
          } catch {}
          pollCount++;
        }, 50);

        // After grace period, if still no confirmation → fall back
        probeTimer.current = setTimeout(() => {
          if (!confirmed && active) {
            clearInterval(refreshTimer.current);
            try { window.SetTabletState(0); } catch {}
            setSigwebStatus('fallback');
            setSigwebError('No response from SigWeb after 3 seconds — pad may not be connected or SigWeb is not running.');
          }
        }, PROBE_TIMEOUT_MS);

      } catch (err) {
        console.warn('[SignaturePad] SigWeb setup error:', err.message);
        if (active) {
          setSigwebStatus('fallback');
          setSigwebError(err.message);
        }
      }
    })();

    return () => {
      active = false;
      clearInterval(refreshTimer.current);
      clearTimeout(probeTimer.current);
      try { if (window.SetTabletState) window.SetTabletState(0); } catch {}
    };
  }, []);

  // ── Mouse / touch fallback drawing ─────────────────────────────────────────
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
        {sigwebStatus === 'checking' && <div className="text-xs text-gray-400 animate-pulse">Detecting Topaz pad…</div>}
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
              {isActive ? 'Sign on the Topaz pad' : sigwebStatus === 'checking' ? 'Detecting pad…' : 'Sign here'}
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

      {sigwebStatus === 'fallback' && (
        <div className="text-xs space-y-1.5 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1">
          <p className="font-semibold text-amber-800">⚠ Topaz pad not detected — using mouse/touch fallback</p>
          <ol className="list-decimal ml-4 space-y-1 text-amber-700">
            <li>Make sure <strong>SigWeb is running</strong> — look for its icon in the system tray.</li>
            <li>Test it: open <a href="https://www.sigplusweb.com/webdemo_sign.htm" target="_blank" rel="noreferrer" className="underline text-indigo-600 font-medium">Topaz Web Demo</a>. If signing works there, SigWeb is running.</li>
            <li>Then <button onClick={() => window.location.reload()} className="underline text-indigo-600 font-medium">reload this page</button>.</li>
          </ol>
          {sigwebError && <p className="text-red-500 font-mono text-xs mt-1 break-all">{sigwebError}</p>}
        </div>
      )}
    </div>
  );
}