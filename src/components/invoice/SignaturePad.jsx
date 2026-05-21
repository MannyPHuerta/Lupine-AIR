import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Topaz SigWeb signature pad (LBK462-HSB) with mouse/touch fallback.
 *
 * The SigWebTablet.js library uses synchronous XHR to localhost:47290.
 * Chrome blocks these from HTTPS pages via Private Network Access (PNA) policy.
 * The ONLY workaround for a hosted HTTPS app:
 *   - The user must visit https://tablet.sigwebtablet.com:47290/ once to accept
 *     the self-signed cert, which whitelists the origin in Chrome's PNA.
 * 
 * Detection: use IsSigWebInstalled() which does a sync XHR to TabletState.
 * If it returns true, activate the pad and poll with SigWebRefresh().
 */

const SIGWEB_LOCAL_URL = 'https://tablet.sigwebtablet.com:47290/SigWebTablet.js';
const SIGWEB_CDN_URL   = 'https://www.sigplusweb.com/SigWebTablet.js';

function loadSigWebScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.setAttribute('data-sigweb', '1');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  // 'checking' | 'active' | 'fallback' | 'trust_needed'
  const [sigwebStatus, setSigwebStatus] = useState('checking');
  const lastPos = useRef(null);
  const refreshTimer = useRef(null);

  // ── Size canvas to container ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = 140; };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Activate SigWeb ──────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    (async () => {
      // 1. Try loading JS from LOCAL SigWeb service first.
      //    If this fails, the cert hasn't been trusted yet.
      const alreadyLoaded = !!(window.IsSigWebInstalled && window.SetTabletState);
      
      if (!alreadyLoaded) {
        // Remove any old script tag
        document.querySelectorAll('script[data-sigweb]').forEach(s => s.remove());
        try {
          await loadSigWebScript(SIGWEB_LOCAL_URL);
        } catch {
          // Local failed — cert not trusted. Fall back to CDN load but note trust issue.
          try {
            await loadSigWebScript(SIGWEB_CDN_URL);
            // CDN loaded OK but XHR to localhost will still be blocked.
            // We'll try anyway and surface trust_needed if it fails.
          } catch {
            if (active) setSigwebStatus('fallback');
            return;
          }
        }
      }

      if (!active) return;

      // 2. Check if SigWeb service is actually running & responding.
      //    IsSigWebInstalled() uses a synchronous XHR — it will throw or return false
      //    if Chrome's PNA blocks it.
      let installed = false;
      try {
        installed = window.IsSigWebInstalled ? window.IsSigWebInstalled() : false;
      } catch (e) {
        console.warn('[SignaturePad] IsSigWebInstalled threw:', e);
      }

      if (!installed) {
        if (active) {
          // If local script loaded but sync XHR failed → cert not trusted
          setSigwebStatus('trust_needed');
        }
        return;
      }

      // 3. Pad is reachable — set up canvas and start signing session
      const canvas = canvasRef.current;
      if (!canvas || !active) return;
      const ctx = canvas.getContext('2d');

      try { window.ClearTablet(); } catch {}
      try { window.SetTabletState(1); } catch {}
      try { window.SigWebSetDisplayTarget(ctx); } catch {}

      // 4. Poll with SigWebRefresh every 200ms — it draws strokes onto our canvas
      let lastPts = 0;
      refreshTimer.current = setInterval(() => {
        if (!active) return;
        try {
          window.SigWebRefresh();
          const pts = window.NumberOfTabletPoints ? window.NumberOfTabletPoints() : 0;
          if (pts !== lastPts) {
            lastPts = pts;
            if (pts > 0) setIsEmpty(false);
          }
        } catch {}
      }, 200);

      if (active) setSigwebStatus('active');
    })();

    return () => {
      active = false;
      clearInterval(refreshTimer.current);
      try { if (window.SetTabletState) window.SetTabletState(0); } catch {}
    };
  }, []);

  // ── Mouse / touch fallback ───────────────────────────────────────────────
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
          <p className="text-amber-700">
            Chrome 142+ blocks local hardware services by default. One-time fix per PC:
          </p>
          <ol className="list-decimal ml-4 space-y-2 text-amber-700">
            <li>
              Open a <strong>new Chrome tab</strong>, click the address bar, and <strong>manually type</strong> (do not paste from a link):<br />
              <code className="bg-white border border-amber-300 rounded px-2 py-0.5 text-amber-900 font-mono select-all block mt-1">
                chrome://settings/content/localNetworkAccess
              </code>
              <button
                onClick={() => navigator.clipboard.writeText('chrome://settings/content/localNetworkAccess')}
                className="mt-1 inline-flex items-center gap-1 border border-indigo-300 text-indigo-600 hover:bg-indigo-50 rounded px-2 py-0.5 text-xs"
              >
                📋 Copy to clipboard
              </button>
            </li>
            <li>Under <strong>"Allowed to connect to any device on your local network"</strong>, click <strong>Add</strong>.</li>
            <li>
              Enter this app's URL and click <strong>Add</strong>:<br />
              <code className="bg-white border border-amber-300 rounded px-2 py-0.5 text-amber-900 font-mono select-all block mt-1">
                {window.location.origin}
              </code>
            </li>
            <li>
              <button onClick={() => window.location.reload()} className="underline text-indigo-600 font-semibold">
                Reload this page
              </button>
              {' '}— the Topaz pad should now connect.
            </li>
          </ol>
          <p className="text-amber-600 mt-1">
            <strong>Quickest fix:</strong> Open a new tab, type{' '}
            <code className="bg-amber-100 px-1 rounded font-mono">chrome://flags/#local-network-access-check</code>
            , set it to <strong>Disabled</strong>, restart Chrome, then reload this page.
          </p>
        </div>
      )}
    </div>
  );
}