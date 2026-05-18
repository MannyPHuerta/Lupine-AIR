import { AlertTriangle, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Pops up when a piece of equipment has a rentalAlert message.
 * Staff must acknowledge before the item is added to the cart.
 */
export default function RentalAlertModal({ equipment, onConfirm, onCancel }) {
  if (!equipment) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500 px-5 py-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-white flex-shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-white text-lg">Add-On / Alert Required</div>
            <div className="text-amber-100 text-sm font-medium">{equipment.name}</div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert message */}
        <div className="px-5 py-5">
          <p className="text-gray-800 text-base leading-relaxed whitespace-pre-line">
            {equipment.rentalAlert}
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Acknowledged — Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}