import { useState, useRef, useEffect } from 'react';
import { Scan, CheckCircle2, AlertCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TransitScanner({ truck }) {
  const [scannedItems, setScannedItems] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);

  // Parse QR code data: truck:id|item:id|name:name
  const parseQRData = (data) => {
    try {
      const parts = data.split('|');
      const result = {};
      parts.forEach(part => {
        const [key, ...valueParts] = part.split(':');
        result[key.trim()] = valueParts.join(':').trim();
      });
      return result;
    } catch {
      return null;
    }
  };

  const handleScan = (qrData) => {
    const parsed = parseQRData(qrData);

    if (!parsed || parsed.truck !== truck.id) {
      setFeedback({ type: 'error', message: 'QR code does not match this truck' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const itemId = parsed.item;
    const itemExists = truck.items?.find(i => i.id === itemId);

    if (!itemExists) {
      setFeedback({ type: 'error', message: 'Item not found in this load' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    // Toggle loaded status
    setScannedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        loaded: !(prev[itemId]?.loaded || false),
        loadedTime: !(prev[itemId]?.loaded) ? new Date().toLocaleTimeString() : prev[itemId]?.loadedTime,
      },
    }));

    setFeedback({ type: 'success', message: `${itemExists.name} scanned` });
    setTimeout(() => setFeedback(null), 2000);

    setInputValue('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputSubmit = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      handleScan(inputValue.trim());
    }
  };

  const handleMarkDelivered = (itemId) => {
    setScannedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        delivered: !(prev[itemId]?.delivered || false),
        deliveredTime: !(prev[itemId]?.delivered) ? new Date().toLocaleTimeString() : prev[itemId]?.deliveredTime,
      },
    }));
  };

  const handleReset = () => {
    setScannedItems({});
    setFeedback(null);
  };

  const loadedCount = Object.values(scannedItems).filter(s => s.loaded).length;
  const deliveredCount = Object.values(scannedItems).filter(s => s.delivered).length;
  const totalItems = truck.items?.length || 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Truck Header */}
      <div className="bg-indigo-900 text-white rounded-xl p-6">
        <h2 className="text-2xl font-bold">{truck.name}</h2>
        <p className="text-indigo-200 mt-1">Transit Scanner</p>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{totalItems}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{loadedCount}</div>
          <div className="text-sm text-green-800">Loaded</div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{deliveredCount}</div>
          <div className="text-sm text-blue-800">Delivered</div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-lg p-4 flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {feedback.message}
        </div>
      )}

      {/* Scanner Input */}
      <div className="bg-white rounded-xl border-2 border-indigo-300 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Scan className="w-5 h-5 text-indigo-600" />
          <label className="text-sm font-semibold text-gray-800">Scan QR Code or Enter Manually</label>
        </div>
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputSubmit}
          placeholder="Point camera at QR code or paste data..."
          className="text-lg h-12 focus:ring-indigo-500"
          autoFocus
        />
        <p className="text-xs text-gray-500 mt-2">Press Enter to submit or use a QR code scanner app</p>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-bold text-lg text-gray-900 mb-4">Equipment Checklist</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {truck.items && truck.items.length > 0 ? (
            truck.items.map(item => {
              const status = scannedItems[item.id] || {};
              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition ${
                    status.delivered
                      ? 'bg-blue-50 border-blue-300'
                      : status.loaded
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {item.weight && <span>{(item.weight / 1000).toFixed(1)}k lbs</span>}
                        {item.weight && item.volume && <span className="mx-1">•</span>}
                        {item.volume && <span>{item.volume} cu ft</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => handleMarkDelivered(item.id)}
                        variant={status.delivered ? 'default' : 'outline'}
                        size="sm"
                        className={`gap-1.5 ${
                          status.delivered
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {status.delivered ? 'Delivered' : 'Mark Delivered'}
                      </Button>
                      {status.loaded && (
                        <div className="flex items-center gap-1 text-green-700 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          {status.loadedTime}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-400">No items assigned</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleReset} variant="outline" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Reset All
        </Button>
      </div>
    </div>
  );
}