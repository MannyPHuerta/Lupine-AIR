import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Topaz SigWeb signature pad (LBK462-HSB) with mouse/touch fallback.
 *
 * Detection strategy:
 * - Load SigWebTablet.js from the LOCAL service (https://tablet.sigwebtablet.com:47290/)
 *   so Chrome's Private Network Access permission carries over to XHR calls.
 * - Call SetTabletState(1) and SigWebSetDisplayTarget(ctx).
 * - SigWeb fires window.tmSignUpdate repeatedly while the pad is active.
 *   The very first tmSignUpdate callback confirms the pad is connected.
 * - If no tmSignUpdate fires within PROBE_TIMEOUT_MS, fall back to mouse/touch.
 */

const SIGWEB_LOCAL_URL = 'https://tablet.sigwebtablet.com:47290/SigWebTablet.js';
const SIGWEB_CDN_URL   = 'https://www.sigplusweb.com/SigWebTablet.js';
const PROBE_TIMEOUT_MS = 10000;

function loadSigWebScript() {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.SetTabletState && window.SigWebSetDisplayTarget) { resolve(); return; }

    // Script tag already injected — wait for it
    const existing = document.querySelector('script[data-sigweb]');
    if (existing) {
      if (window.SetTabletState) { resolve(); return; }
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', reject);
      return;
    }

    const inject = (src, fallback) => {
      const s = document.createElement('script');
      s.setAttribute('data-sigweb', '1');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => {
        s.remove();
        if (fallback) {
          const s2 = document.createElement('script');
          s2.setAttribute('data-sigweb', '1');
          s2.src = fallback;
          s2.onload = resolve;
          s2.onerror = () => reject(new Error('SigWeb script unreachable'));
          document.head.appendChild(s2);
        } else {
          reject(new Error('SigWeb script unreachable'));
        }
      };
      document.head.appendChild(s);
    };

    // Load from local first — required for PNA permission
    inject(SIGWEB_LOCAL_URL, SIGWEB_CDN_URL);
  });
}

export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  // 'checking' | 'active' | 'fallback' | 'trust_needed'
  const [sigwebStatus, setSigwebStatus] = useState('checking');
  const [sigwebError, setSigwebError] = useState('');
  const lastPos = useRef(null);
  const probeTimer = useRef(null);
  const confirmedRef = useRef(false);

  // ── Size canvas to its container ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = 140;
    };
    size();
    window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, []);

  // ── Activate SigWeb pad ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await loadSigWebScript();
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // SigWeb draws the signature into this canvas context
        window.SigWebSetDisplayTarget(ctx);

        // tmSignUpdate is the callback SigWeb calls on every pen sample.
        // This is the ONLY reliable way to know the pad is alive.
        window.tmSignUpdate = () => {
          if (!active) return;
          if (!confirmedRef.current) {
            confirmedRef.current = true;
            clearTimeout(probeTimer.current);
            setSigwebStatus('active');
          }
          // If there are points, the canvas is no longer empty
          try {
            const pts = window.NumberOfTabletPoints ? window.NumberOfTabletPoints() : 0;
            if (pts > 0) setSigEmpty(false);
          } catch {}
        };

        // Also hook into the display refresh so signature strokes render
        window.SigWebSetDisplayXSize && window.SigWebSetDisplayXSize(canvas.width);
        window.SigWebSetDisplayYSize && window.SigWebSetDisplayYSize(canvas.height);

        // Activate the pad
        try { window.ClearTablet(); } catch {}
        window.SetTabletState(1, window.tmSignUpdate, 50);

        // Fallback timeout — if tmSignUpdate never fires, the pad isn't connected
        probeTimer.current = setTimeout(() => {
          if (!confirmedRef.current && active) {
            try { window.SetTabletState(0); } catch {}
            setSigwebStatus('fallback');
            setSigwebError('No response from Topaz pad after 10 seconds.');
          }
        }, PROBE_TIMEOUT_MS);

      } catch (err) {
        if (!active) return;
        const msg = err.message || '';
        setSigwebStatus(msg.includes('unreachable') ? 'trust_needed' : 'fallback');
        setSigwebError(msg);
      }
    })();

    return () => {
      active = false;
      clearTimeout(probeTimer.current);
      try { if (window.SetTabletState) window.SetTabletState(0); } catch {}
      if (window.tmSignUpdate) window.tmSignUpdate = null;
    };
  }, []);

  // Helper — avoids stale closure issue in tmSignUpdate
  function setSigEmpty(val) { setIsEmpty(val); }

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
        {isActive && (
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

      {(sigwebStatus === 'fallback' || sigwebStatus === 'trust_needed') && (
        <div className="text-xs space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1">
          <p className="font-semibold text-amber-800">⚠ Topaz pad not detected — using mouse/touch fallback</p>

          {sigwebStatus === 'trust_needed' ? (
            <>
              <p className="text-amber-700">
                SigWeb is installed but <strong>Chrome hasn't trusted the local cert yet.</strong>
              </p>
              <p className="text-amber-700 font-medium">One-time setup:</p>
              <ol className="list-decimal ml-4 space-y-1.5 text-amber-700">
                <li>
                  <button
                    onClick={() => {
                      const w = window.open('https://tablet.sigwebtablet.com:47290/', '_blank');
                      const t = setInterval(() => {
                        if (w && w.closed) { clearInterval(t); window.location.reload(); }
                      }, 500);
                    }}
                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded px-2 py-0.5"
                  >
                    Open SigWeb Trust Page ↗
                  </button>
                </li>
                <li>Click <strong>Advanced</strong> → <strong>Proceed to tablet.sigwebtablet.com (unsafe)</strong></li>
                <li>Close that tab — this page will reload automatically.</li>
              </ol>
              <p className="text-amber-600">You only need to do this once per browser / PC.</p>
            </>
          ) : (
            <>
              <p className="text-amber-700">
                Make sure SigWeb is running (check system tray), then{' '}
                <button onClick={() => window.location.reload()} className="underline text-indigo-600 font-medium">
                  reload this page
                </button>.
              </p>
              <p className="text-amber-600">
                Need the one-time cert setup?{' '}
                <button onClick={() => setSigwebStatus('trust_needed')} className="underline text-indigo-600">
                  Show instructions
                </button>
              </p>
            </>
          )}
          {sigwebError && <p className="text-red-500 font-mono text-xs mt-1 break-all">{sigwebError}</p>}
        </div>
      )}
    </div>
  );
}