import { useState } from 'react';
import { Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function ShippingLabelPrinter({ truck }) {
  const [labels, setLabels] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateLabels = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateShippingLabels', {
        truck,
        equipment: truck.items || [],
      });
      if (res.data?.labels) {
        setLabels(res.data);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!labels) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 mb-3">Generate QR-code shipping labels for each piece of equipment</p>
        <Button
          onClick={handleGenerateLabels}
          disabled={loading || !truck.items?.length}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Generate Labels
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900">{labels.truckName} – Shipping Labels</h3>
          <p className="text-xs text-gray-500">{labels.totalItems} items</p>
        </div>
        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
          <Printer className="w-4 h-4" /> Print All
        </Button>
      </div>

      {/* Printable labels grid */}
      <div className="grid grid-cols-2 gap-4 print:grid-cols-3">
        {labels.labels.map((label) => (
          <div
            key={label.id}
            className="bg-white border border-gray-300 rounded-lg p-4 print:break-inside-avoid print:page-break-inside-avoid"
            style={{ minHeight: '240px' }}
          >
            {/* QR Code placeholder */}
            <div className="bg-gray-100 border border-gray-300 rounded p-2 mb-3 flex items-center justify-center h-32 print:h-28">
              <div className="text-center">
                <div className="text-xs text-gray-500 font-semibold mb-1">QR Code</div>
                <svg className="w-20 h-20 mx-auto" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  {/* Simple placeholder QR pattern */}
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="20" height="20" fill="black" />
                  <rect x="70" y="10" width="20" height="20" fill="black" />
                  <rect x="10" y="70" width="20" height="20" fill="black" />
                  <rect x="40" y="40" width="20" height="20" fill="black" />
                  {/* Encode label data as pattern */}
                  {label.id.charCodeAt(0) % 2 === 0 && <rect x="35" y="35" width="30" height="30" fill="none" stroke="black" strokeWidth="2" />}
                </svg>
              </div>
            </div>

            {/* Label info */}
            <div className="text-xs space-y-1">
              <div>
                <span className="font-bold text-gray-700">Item #{label.sequenceNumber}</span>
              </div>
              <div className="text-gray-900 font-semibold truncate">{label.name}</div>
              <div className="text-gray-600">
                {(label.weight / 1000).toFixed(1)}k lbs • {label.volume} cu ft
              </div>
              <div className="text-gray-500 text-xs mt-1">Truck: {label.truckName}</div>
              <div className="text-gray-400 text-xs">{label.qrData}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}