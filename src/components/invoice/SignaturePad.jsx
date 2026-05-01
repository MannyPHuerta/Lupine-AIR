import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Canvas-based signature pad.
 * Works with mouse, touch (laptop touchscreen / tablet), and Topaz SigWeb (which writes to canvas the same way).
 * Props:
 *   onSave(dataUrl) — called when user clicks "Accept Signature"
 *   onClear()       — called when cleared
 */
export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef(null);

  // Auto-click canvas when it mounts so Topaz SigWeb targets it without requiring a manual click
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        canvas.click();
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Resize canvas to match its CSS size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Save current drawing
      const img = canvas.toDataURL();
      canvas.width = rect.width;
      canvas.height = rect.height;
      // Restore
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

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    setDrawing(true);
    setIsEmpty(false);
    lastPos.current = getPos(e);
  }, []);

  const draw = useCallback((e) => {
    if (!drawing) return;
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
  }, [drawing]);

  const stopDraw = useCallback(() => {
    setDrawing(false);
    lastPos.current = null;
  }, []);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    if (onClear) onClear();
  };

  const handleAccept = () => {
    if (isEmpty) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    if (onSave) onSave(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Signature</div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative" style={{ touchAction: 'none' }}>
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-sm">Sign here</span>
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={isEmpty}
          className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition"
        >
          Accept Signature
        </button>
      </div>
    </div>
  );
}