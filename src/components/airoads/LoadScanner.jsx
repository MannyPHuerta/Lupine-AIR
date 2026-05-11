import { useState, useRef } from 'react';
import { Scan, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoadScanner({ truck, onStatusUpdate }) {
  const [scanInput, setScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState({});
  const [error, setError] = useState('');
  const scannerRef = useRef(null);

  const handleScan = () => {
    setError('');
    const data = scanInput.trim();

    if (!data) {
      setError('Please enter or scan a QR code');
      return;
    }

    // Parse QR data: truck:id|item:id|name:name
    const itemMatch = data.match(/item:([^|]+)/);
    const nameMatch = data.match(/name:([^|]*)/);

    if (!itemMatch) {
      setError('Invalid QR code format');
      setScanInput('');
      scannerRef.current?.focus();
      return;
    }

    const itemId = itemMatch[1];
    const itemName = nameMatch?.[1] || 'Unknown';

    // Check if item exists in truck
    const itemExists = truck.items?.some(i => i.id === itemId);

    if (!itemExists) {
      setError(`Item "${itemName}" not found in this load`);
      setScanInput('');
      scannerRef.current?.focus();
      return;
    }

    // Toggle item status
    const newStatus = scannedItems[itemId] ? null : { loaded: new Date().toISOString() };
    const updatedScanned = { ...scannedItems, [itemId]: newStatus };
    setScannedItems(updatedScanned);

    // Notify parent
    if (onStatusUpdate) {
      onStatusUpdate({
        truckId: truck.id,
        itemId,
        itemName,
        status: newStatus ? 'loaded' : 'unloaded',
      });
    }

    setScanInput('');
    scannerRef.current?.focus();
  };

  const handleClearAll = () => {
    setScannedItems({});
    setScanInput('');
    setError('');
  };

  const scannedCount = Object.values(scannedItems).filter(Boolean).length;
  const totalItems = truck.items?.length || 0;
  const loadedPercent = totalItems > 0 ? ((scannedCount / totalItems) * 100).toFixed(0) : 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Scan className="w-5 h-5 text-blue-600" />
          Load Scanner
        </h3>
        <div className="text-sm font-semibold text-gray-900">
          {scannedCount}/{totalItems} Loaded ({loadedPercent}%)
        </div>
      </div>

      {/* Scanner input */}
      <div className="flex gap-2">
        <Input
          ref={scannerRef}
          type="text"
          placeholder="Scan QR code or paste data here..."
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleScan()}
          className="flex-1"
          autoFocus
        />
        <Button onClick={handleScan} className="gap-2 bg-green-600 hover:bg-green-700">
          <Scan className="w-4 h-4" />
          Scan
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Scanned items list */}
      <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
        <div className="space-y-2">
          {truck.items?.map((item) => {
            const isScanned = !!scannedItems[item.id];
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded border ${
                  isScanned
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className={`flex-shrink-0 ${isScanned ? 'text-green-600' : 'text-gray-400'}`}>
                  {isScanned ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${isScanned ? 'text-gray-900' : 'text-gray-600'}`}>
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.weight && `${(item.weight / 1000).toFixed(1)}k lbs`}
                  </div>
                </div>
                {isScanned && (
                  <div className="text-xs text-green-600 font-semibold">Loaded</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          onClick={handleClearAll}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Clear All
        </Button>
        <div className="flex-1 flex items-center justify-end">
          {scannedCount === totalItems && totalItems > 0 && (
            <div className="text-xs font-semibold text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> All items loaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}