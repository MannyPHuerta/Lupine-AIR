import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MechanicRecommendation({ workOrderId, onAssign, disabled }) {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadRecommendations = async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/recommendMechanicAssignment`, {
        method: 'POST',
        body: JSON.stringify({ workOrderId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!recommendations) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={loadRecommendations}
        disabled={loading || disabled}
        className="gap-1.5"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '🤖'}
        Recommend Mechanic
      </Button>
    );
  }

  const topRec = recommendations.topRecommendation;

  if (!topRec) {
    return <div className="text-xs text-gray-400">No available mechanics</div>;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
      <div className="text-xs font-semibold text-blue-900">🤖 AI Recommendation</div>
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-blue-900">{topRec.name}</div>
            <div className="text-xs text-blue-700">
              Score: {topRec.totalScore} • {topRec.currentJobs}/{topRec.maxJobs} jobs
              {topRec.skillMatch && <span className="ml-2 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">✓ Certified</span>}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onAssign(topRec.email)}
          disabled={!topRec.available}
          className="w-full bg-blue-600 hover:bg-blue-700 gap-1"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Auto-Assign to {topRec.name.split(' ')[0]}
        </Button>
        {!topRec.available && (
          <div className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
            ⚠️ At max capacity, but still recommended
          </div>
        )}
      </div>

      {recommendations.recommendations.length > 1 && (
        <div className="border-t border-blue-200 pt-2">
          <div className="text-xs text-blue-600 font-medium mb-1">Other Options:</div>
          <div className="space-y-1">
            {recommendations.recommendations.slice(1, 3).map(rec => (
              <button
                key={rec.email}
                onClick={() => onAssign(rec.email)}
                className="w-full text-left text-xs p-1.5 rounded hover:bg-blue-100 transition"
              >
                {rec.name} (Score: {rec.totalScore})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}