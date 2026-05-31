import { useState } from "react";
import { Clock, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";

/**
 * ExtraShiftBillingModal - Allows counter staff to add extra rental days/shifts to an active rental
 */
export default function ExtraShiftBillingModal({ rental, equipment, onClose, onSuccess }) {
  const [extraShifts, setExtraShifts] = useState(1);
  const [extraShiftRate, setExtraShiftRate] = useState(equipment?.dailyRate || 0);
  const [isProcessing, setIsProcessing] = useState(false);

  const extraShiftTotal = extraShifts * extraShiftRate;

  const handleAddExtraShift = async () => {
    setIsProcessing(true);
    try {
      const response = await base44.functions.invoke('addExtraShift', {
        rentalId: rental.id,
        extraShifts,
        extraShiftRate
      });

      if (response.data.success) {
        onSuccess(response.data);
      }
    } catch (error) {
      alert(`Error adding extra shift: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Add Extra Shift Billing
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Equipment info */}
          <div className="text-sm text-gray-600">
            <div className="font-semibold text-gray-900">{rental.equipmentName}</div>
            <div>Current end date: {rental.endDate}</div>
          </div>

          {/* Extra shifts input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Extra Days
            </label>
            <Input
              type="number"
              min="1"
              value={extraShifts}
              onChange={(e) => setExtraShifts(parseInt(e.target.value) || 0)}
              className="w-full"
            />
          </div>

          {/* Rate input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rate Per Day ($)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={extraShiftRate}
              onChange={(e) => setExtraShiftRate(parseFloat(e.target.value) || 0)}
              className="w-full"
            />
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Extra Days:</span>
              <span className="font-semibold">{extraShifts} day(s)</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Rate Per Day:</span>
              <span className="font-semibold">${extraShiftRate.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                Total Extra Charges:
              </span>
              <span className="text-lg font-bold text-green-600">${extraShiftTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddExtraShift}
              disabled={isProcessing || extraShifts < 1 || extraShiftRate < 0}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {isProcessing ? 'Processing...' : 'Add Extra Shift'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}