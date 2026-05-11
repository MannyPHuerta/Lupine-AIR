import { useState } from 'react';
import { Printer, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShippingLabels({ truck, onClose }) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = window.location.href;
    link.download = `labels_${truck.name.replace(/\s+/g, '_')}.html`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Shipping Labels</h2>
          <p className="text-sm text-gray-600 mt-1">{truck.name} • {truck.items?.length || 0} items</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download HTML
          </Button>
          <Button
            onClick={handlePrint}
            disabled={printing}
            size="sm"
            className="gap-2"
          >
            {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Print All
          </Button>
        </div>
      </div>

      {/* Labels Grid */}
      <div className="print:space-y-0 space-y-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {truck.items && truck.items.length > 0 ? (
          truck.items.map((item, idx) => {
            const qrData = `truck:${truck.id}|item:${item.id}|name:${item.name}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

            return (
              <div
                key={item.id}
                className="bg-white border-2 border-gray-800 p-4 print:break-inside-avoid print:page-break-inside-avoid"
                style={{ width: '4in', height: '6in' }}
              >
                {/* Sequence */}
                <div className="text-center mb-2">
                  <div className="text-xs font-bold text-gray-600 uppercase">Item #{idx + 1}</div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center mb-3">
                  <img
                    src={qrUrl}
                    alt={`QR Code for ${item.name}`}
                    className="w-32 h-32 border border-gray-300"
                  />
                </div>

                {/* Equipment Info */}
                <div className="text-center space-y-2 mb-3 border-t-2 border-b-2 border-gray-800 py-2">
                  <div className="font-bold text-sm text-gray-900 line-clamp-2">{item.name}</div>
                  <div className="text-xs text-gray-700">
                    <div>{item.weight ? `${(item.weight / 1000).toFixed(1)}k lbs` : 'Weight: TBD'}</div>
                    <div>{item.volume ? `${item.volume} cu ft` : 'Volume: TBD'}</div>
                  </div>
                </div>

                {/* Truck & Load Info */}
                <div className="text-center space-y-1 mb-3 text-xs">
                  <div className="font-semibold text-gray-800">Truck: {truck.name}</div>
                  <div className="text-gray-600 font-mono text-xs break-all">{truck.id}</div>
                </div>

                {/* Status Boxes */}
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div className="border border-gray-800 px-1 py-1">
                    <div className="text-xs font-bold">Loaded</div>
                    <div className="h-6 border border-gray-400"></div>
                  </div>
                  <div className="border border-gray-800 px-1 py-1">
                    <div className="text-xs font-bold">Delivered</div>
                    <div className="h-6 border border-gray-400"></div>
                  </div>
                </div>

                {/* Date/Time */}
                <div className="text-xs text-gray-600 mt-2 text-center border-t pt-1">
                  Date: _____________ Time: _______
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-gray-400">
            No items assigned to this truck
          </div>
        )}
      </div>
    </div>
  );
}