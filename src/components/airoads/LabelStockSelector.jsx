import { useState } from 'react';
import { Button } from '@/components/ui/button';

const LABEL_STOCKS = {
  '4x6_thermal': {
    name: '4x6 Thermal Label',
    description: 'Zebra/thermal printer format',
    columnsPerPage: 1,
    aspect: '4/6',
  },
  '8.5x11_4up': {
    name: '8.5x11 Sheet (4 per page)',
    description: 'Avery or similar label sheets',
    columnsPerPage: 2,
    aspect: '4/5.25',
  },
  '8.5x11_2up': {
    name: '8.5x11 Sheet (2 per page)',
    description: 'Larger labels on standard paper',
    columnsPerPage: 1,
    aspect: '8.5/5.25',
  },
};

export default function LabelStockSelector({ onSelect, onCancel }) {
  const [selected, setSelected] = useState(null);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Select Label Stock</h2>
        
        <div className="space-y-3 mb-6">
          {Object.entries(LABEL_STOCKS).map(([key, stock]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`w-full text-left p-4 rounded-lg border-2 transition ${
                selected === key
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{stock.name}</div>
              <div className="text-xs text-gray-600 mt-1">{stock.description}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}