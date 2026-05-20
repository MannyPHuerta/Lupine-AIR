import { useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AgreementSigningPad({ token, label, type, onSign, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e1b4b';
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    onSign(token, canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{label}</h3>
            <p className="text-xs text-gray-500">{type === 'signature' ? 'Sign here' : 'Initial here'}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="border-2 border-gray-300 rounded bg-white cursor-crosshair w-full mb-3 touch-none"
          style={{ display: 'block' }}
        />

        {!hasSignature && (
          <p className="text-xs text-gray-400 text-center -mt-2 mb-2">Sign in the box above</p>
        )}

        <div className="flex gap-2">
          <Button onClick={clear} variant="outline" className="flex-1">
            Clear
          </Button>
          <Button onClick={save} disabled={!hasSignature} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 gap-2">
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}