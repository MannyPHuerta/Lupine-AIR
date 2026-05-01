import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BarcodeDisplay({ assetNumber, equipmentId, equipmentName }) {
  const svgRef = useRef(null);

  const barcodeValue = assetNumber || equipmentId;

  useEffect(() => {
    if (svgRef.current && barcodeValue) {
      try {
        JsBarcode(svgRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 5,
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [barcodeValue]);

  const handleDownload = () => {
    if (svgRef.current) {
      const svg = svgRef.current.outerHTML;
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barcode-${barcodeValue}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(barcodeValue);
  };

  if (!barcodeValue) {
    return <div className="text-xs text-gray-400">No asset number or equipment ID available</div>;
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white border rounded-lg">
      <svg ref={svgRef} />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
          <Copy className="w-3.5 h-3.5" /> Copy Value
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload} className="gap-2">
          <Download className="w-3.5 h-3.5" /> Download SVG
        </Button>
      </div>
      <div className="text-xs text-gray-500 text-center">
        <div className="font-mono font-semibold text-gray-700">{barcodeValue}</div>
        <div className="text-gray-400">{equipmentName}</div>
      </div>
    </div>
  );
}