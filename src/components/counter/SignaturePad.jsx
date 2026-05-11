import { useRef, useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignaturePad({ onSignatureCapture }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  // Set canvas internal resolution to match its CSS display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 400;
    canvas.height = rect.height || 100;
  }, []);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setConfirmed(false);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e1b4b';
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearPad = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setConfirmed(false);
    onSignatureCapture(null);
  };

  const captureSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureCapture(dataUrl);
    setConfirmed(true);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-700">Customer Signature</div>
      <canvas
        ref={canvasRef}
        className="border-2 border-gray-300 rounded bg-white cursor-crosshair w-full"
        style={{ height: '90px', display: 'block' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={clearPad}
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
        >
          <Trash2 className="w-3 h-3 mr-1" /> Clear
        </Button>
        <Button
          type="button"
          onClick={captureSignature}
          disabled={isEmpty}
          size="sm"
          className={`flex-1 text-xs ${confirmed ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {confirmed ? '✓ Confirmed' : '✓ Confirm Signature'}
        </Button>
      </div>
    </div>
  );
}