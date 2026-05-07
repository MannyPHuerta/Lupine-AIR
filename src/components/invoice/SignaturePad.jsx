import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Signature pad supporting:
 *   1. Topaz SigWeb (LBK462 and other Topaz USB pads) via localhost:47289
 *   2. Mouse / touch fallback for laptops and tablets
 *
 * SigWeb must be installed and running on the local PC.
 * Download: https://www.topazsystems.com/software/sigweb.exe
 *
 * Props:
 *   onSave(dataUrl) — called when user clicks "Accept Signature"
 *   onClear()       — called when cleared
 */

const SIGWEB_URL = 'http://localhost:47289';

async function sigwebCall(endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${SIGWEB_URL}/${endpoint}`, opts);
  if (!res.ok) throw new Error(`SigWeb ${endpoint} failed: ${res.status}`);
  return res.json();
}

export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [sigwebAvailable, setSigwebAvailable] = useState(null); // null=checking, true, false
  const [sigwebCapturing, setSigwebCapturing] = useState(false);
  const lastPos = useRef(null);
  const sigwebTimer = useRef(null);

  // ── Detect SigWeb on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await sigwebCall('SigWeb/TabletState', 'GET');
        if (!cancelled) setSigwebAvailable(true);
      } catch {
        if (!cancelled) setSigwebAvailable(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Start SigWeb capture when pad is detected ───────────────────────────────
  useEffect(() => {
    if (!sigwebAvailable) return;

    let active = true;

    const startCapture = async () => {
      try {
        // Set tablet to capture mode
        await sigwebCall('SigWeb/SetTabletState', 'POST', { state: 1 });
        await sigwebCall('SigWeb/ClearSignature', 'POST');
        setSigwebCapturing(true);
        setIsEmpty(true);

        // Poll for signature data every 500ms
        sigwebTimer.current = setInterval(async () => {
          if (!active) return;
          try {
            const result = await sigwebCall('SigWeb/NumberOfTabletPoints', 'GET');
            const pts = result?.count ?? result?.NumberOfTabletPoints ?? 0;
            if (pts > 0) {
              setIsEmpty(false);
              // Render to canvas
              const imgData = await sigwebCall('SigWeb/SigImageB64', 'GET');
              const b64 = imgData?.SigImageB64 ?? imgData?.sigImageB64;
              if (b64 && canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const img = new Image();
                img.onload = () => {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = `data:image/png;base64,${b64}`;
              }
            }
          } catch {
            // SigWeb went away — stop polling
            clearInterval(sigwebTimer.current);
          }
        }, 500);
      } catch (err) {
        console.warn('[SignaturePad] SigWeb startCapture error:', err);
      }
    };

    startCapture();

    return () => {
      active = false;
      clearInterval(sigwebTimer.current);
      // Release tablet
      sigwebCall('SigWeb/SetTabletState', 'POST', { state: 0 }).catch(() => {});
    };
  }, [sigwebAvailable]);

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
    if (sigwebAvailable) return; // let SigWeb handle it
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
  const handleClear = async () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    if (sigwebAvailable) {
      try { await sigwebCall('SigWeb/ClearSignature', 'POST'); } catch {}
    }
    if (onClear) onClear();
  };

  // ── Accept ──────────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (isEmpty) return;

    if (sigwebAvailable) {
      try {
        const imgData = await sigwebCall('SigWeb/SigImageB64', 'GET');
        const b64 = imgData?.SigImageB64 ?? imgData?.sigImageB64;
        if (b64 && onSave) {
          onSave(`data:image/png;base64,${b64}`);
          return;
        }
      } catch (err) {
        console.warn('[SignaturePad] SigWeb accept error — falling back to canvas:', err);
      }
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
          No Topaz pad? Install{' '}
          <a href="https://www.topazsystems.com/software/sigweb.exe" target="_blank" rel="noreferrer"
            className="underline hover:text-gray-600">SigWeb</a>{' '}
          to activate the LBK462.
        </p>
      )}
    </div>
  );
}