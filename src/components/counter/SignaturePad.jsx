import { useRef, useState } from 'react';
import { Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignaturePad({ onSignatureCapture }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearPad = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const captureSignature = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureCapture(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-700">Customer Signature</div>
      <canvas
        ref={canvasRef}
        width={300}
        height={80}
        className="border-2 border-gray-300 rounded bg-white cursor-crosshair w-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="flex gap-2">
        <Button
          onClick={clearPad}
          variant="outline"
          size="sm"
          className="flex-1 text-xs"
        >
          <Trash2 className="w-3 h-3 mr-1" /> Clear
        </Button>
        <Button
          onClick={captureSignature}
          disabled={isEmpty}
          size="sm"
          className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700"
        >
          ✓ Confirm
        </Button>
      </div>
    </div>
  );
}