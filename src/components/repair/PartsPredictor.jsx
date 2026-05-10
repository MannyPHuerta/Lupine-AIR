import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PartsPredictor({ workOrderId, equipmentId, onCreatePartRequirements }) {
  const [predicted, setPredicted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState({});

  const loadPrediction = async () => {
    if (!workOrderId || !equipmentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/predictRequiredParts`, {
        method: 'POST',
        body: JSON.stringify({ workOrderId, equipmentId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPredicted(data);
      // Pre-select high-confidence parts
      const initial = {};
      data.predictedParts.forEach((p, i) => {
        initial[i] = true;
      });
      setSelected(initial);
    } catch (err) {
      console.error('Failed to predict parts:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!predicted) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={loadPrediction}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🔍'}
        Predict Parts
      </Button>
    );
  }

  if (predicted.predictedParts.length === 0) {
    return <div className="text-xs text-gray-400">No parts predicted</div>;
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
      <div className="text-xs font-semibold text-purple-900">🔮 Predicted Parts</div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {predicted.predictedParts.map((part, idx) => (
          <label key={idx} className="flex items-center gap-2 text-xs p-1.5 hover:bg-purple-100 rounded cursor-pointer transition">
            <input
              type="checkbox"
              checked={selected[idx] || false}
              onChange={e => setSelected(prev => ({ ...prev, [idx]: e.target.checked }))}
              className="w-3.5 h-3.5 accent-purple-600"
            />
            <span className="text-purple-900">{part.partName}</span>
          </label>
        ))}
      </div>
      <Button
        size="sm"
        onClick={() => {
          const parts = predicted.predictedParts
            .filter((_, i) => selected[i])
            .map(p => p.partName);
          onCreatePartRequirements(parts);
          setPredicted(null);
          setSelected({});
        }}
        className="w-full bg-purple-600 hover:bg-purple-700 gap-1"
      >
        <CheckCircle className="w-3.5 h-3.5" />
        Create {Object.values(selected).filter(Boolean).length} Part Requests
      </Button>
    </div>
  );
}