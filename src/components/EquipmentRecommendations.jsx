import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EquipmentRecommendations({ selectedEquipment, equipment, cartItems, onAddRecommendation, dateRange, quantity }) {
  if (!selectedEquipment || !selectedEquipment.dependencies || selectedEquipment.dependencies.length === 0) {
    return null;
  }

  const recommendations = selectedEquipment.dependencies
    .map(dep => {
      const item = equipment.find(e => e.id === dep.equipmentId);
      return { ...dep, item };
    })
    .filter(dep => dep.item);

  if (recommendations.length === 0) {
    return null;
  }

  const handleAddRecommendation = (rec) => {
    if (!dateRange.start || !dateRange.end) {
      alert('Please set dates first');
      return;
    }
    onAddRecommendation(rec);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-blue-900 text-sm">Recommended Items</div>
          <div className="text-xs text-blue-700">Order takers often pair these with {selectedEquipment.name}</div>
        </div>
      </div>

      <div className="space-y-2">
        {recommendations.map((rec) => {
          const alreadyInCart = cartItems.some(
            ci => ci.equipmentId === rec.equipmentId &&
              ci.startDate === dateRange.start &&
              ci.endDate === dateRange.end
          );
          
          return (
            <div key={rec.equipmentId} className="flex items-start justify-between p-2 bg-white rounded border border-blue-100">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{rec.item.name}</div>
                {rec.reason && (
                  <div className="text-xs text-gray-600">{rec.reason}</div>
                )}
                <div className="text-xs text-gray-500 mt-0.5">${rec.item.dailyRate}/day</div>
              </div>
              <Button
                size="sm"
                variant={alreadyInCart ? 'outline' : 'default'}
                onClick={() => handleAddRecommendation(rec)}
                disabled={alreadyInCart || !dateRange.start || !dateRange.end}
                className="ml-2 flex-shrink-0"
              >
                {alreadyInCart ? '✓' : '+'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}