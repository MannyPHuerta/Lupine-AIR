import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Topaz SigWeb signature pad with mouse/touch fallback.
 *
 * SigWeb is confirmed installed (v1.7.3.0) but Chrome 142+ requires
 * an explicit Local Network Access permission grant. This component:
 * 1. Makes a fetch() to the local SigWeb endpoint to trigger Chrome's LNA prompt
 * 2. If that succeeds, loads SigWebTablet.js from the local service
 * 3. Falls back to mouse/touch if unavailable
 */

const SIGWEB_BASE = 'https://tablet.sigwebtablet.com:47290';
const SIGWEB_CDN_URL = 'https://www.sigplusweb.com/SigWebTablet.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.setAttribute('data-sigweb', '1');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

async function pingLocalService() {
  // A fetch() with mode:'no-cors' to the local HTTPS endpoint is what
  // triggers Chrome's LNA permission popup. We don't need a response body.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    await fetch(`${SIGWEB_BASE}/TabletState`, {
      mode: 'no-cors',
      signal: ctrl.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  // 'checking' | 'prompting' | 'active' | 'fallback'
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
  const tryActivate = useCallback(async () => {
    let active = true;
    setSigwebStatus('checking');

    // Step 1: ping with fetch() — this triggers Chrome's LNA permission popup
    setSigwebStatus('prompting');
    const reachable = await pingLocalService();

    if (!reachable) {
      setSigwebStatus('fallback');
      return () => { active = false; };
    }

    // Step 2: load SigWebTablet.js from local service (now that LNA is granted)
    document.querySelectorAll('script[data-sigweb]').forEach(s => s.remove());
    try {
      await loadScript(`${SIGWEB_BASE}/SigWebTablet.js`);
    } catch {
      // Local load failed even though ping worked — try CDN as last resort
      try { await loadScript(SIGWEB_CDN_URL); } catch {
        setSigwebStatus('fallback');
        return;
      }
    }

    // Step 3: verify SigWeb functions exist and service responds
    let installed = false;
    try {
      installed = window.IsSigWebInstalled ? window.IsSigWebInstalled() : false;
    } catch {}

    if (!installed) {
      setSigwebStatus('fallback');
      return;
    }

    // Step 4: set up canvas and start signing session
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    try { window.ClearTablet(); } catch {}
    try { window.SetTabletState(1); } catch {}
    try { window.SigWebSetDisplayTarget(ctx); } catch {}

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

    setSigwebStatus('active');

    return () => {
      active = false;
      clearInterval(refreshTimer.current);
      try { if (window.SetTabletState) window.SetTabletState(0); } catch {}
    };
  }, []);

  useEffect(() => {
    let cleanup;
    tryActivate().then(fn => { cleanup = fn; });
    return () => {
      if (cleanup) cleanup();
      clearInterval(refreshTimer.current);
    };
  }, [tryActivate]);

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
        {sigwebStatus === 'prompting' && (
          <div className="text-xs text-blue-500 animate-pulse">Connecting to Topaz pad…</div>
        )}
        {sigwebStatus === 'checking' && (
          <div className="text-xs text-gray-400 animate-pulse">Detecting pad…</div>
        )}
        {sigwebStatus === 'fallback' && (
          <div className="text-xs text-amber-500">Mouse / touch mode</div>
        )}
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
              {isActive ? 'Sign on the Topaz pad' : sigwebStatus === 'prompting' ? 'Waiting for Chrome permission…' : 'Sign here'}
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

      {sigwebStatus === 'prompting' && (
        <div className="text-xs bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1">
          <p className="font-semibold text-blue-800">👀 Check for a Chrome permission popup</p>
          <p className="text-blue-700 mt-1">
            Chrome should be showing a prompt asking to <strong>"Allow [this site] to connect to devices on your local network"</strong>.
            Click <strong>Allow</strong> to activate the Topaz pad.
          </p>
          <p className="text-blue-600 mt-1">If no popup appeared, click <button onClick={() => tryActivate()} className="underline font-semibold">Try again</button>.</p>
        </div>
      )}

      {sigwebStatus === 'fallback' && (
        <div className="text-xs space-y-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1">
          <p className="font-semibold text-amber-800">⚠ Topaz pad not detected — using mouse/touch fallback</p>
          <p className="text-amber-700">
            SigWeb is installed correctly (v1.7.3.0). Chrome is blocking the local connection.
            <button onClick={() => tryActivate()} className="ml-1 underline text-indigo-600 font-semibold">Try connecting again</button>
            {' '}— Chrome may show a permission popup this time.
          </p>

          <div className="bg-white border border-amber-200 rounded p-2 mt-1">
            <p className="font-semibold text-amber-900 mb-1">Manual Chrome permission fix</p>
            <ol className="list-decimal ml-4 space-y-1 text-amber-700">
              <li>
                Open a new Chrome tab, click the address bar and <strong>type</strong> (must type, not click):<br />
                <code className="bg-amber-100 px-1 rounded font-mono select-all">chrome://settings/content/localNetworkAccess</code>
                <button onClick={() => navigator.clipboard.writeText('chrome://settings/content/localNetworkAccess')} className="ml-1 text-indigo-500 underline">copy</button>
              </li>
              <li>Click <strong>Add</strong> → enter <code className="bg-amber-100 px-1 rounded font-mono select-all">{window.location.origin}</code> → <strong>Add</strong>.</li>
              <li><button onClick={() => tryActivate()} className="underline text-indigo-600 font-semibold">Retry connection.</button></li>
            </ol>
          </div>

          <p className="text-amber-600 mt-1 text-xs">
            Need more help? <a href="https://www.topazsystems.com/software/SigWeb_Local_Network_Access_Guide.pdf" target="_blank" rel="noopener noreferrer" className="underline text-indigo-600">Topaz LNA Guide (PDF)</a>
            {' · '}
            <a href="https://www.topazsystems.com/software/SigWeb_Test_Utility.exe" target="_blank" rel="noopener noreferrer" className="underline text-indigo-600">SigWeb Test Utility</a>
          </p>
        </div>
      )}
    </div>
  );
}