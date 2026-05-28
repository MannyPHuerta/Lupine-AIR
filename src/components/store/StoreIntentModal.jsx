import { X, HardHat, PartyPopper } from 'lucide-react';

export default function StoreIntentModal({ equipment, onConfirmJobsite, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="font-bold text-gray-900 text-lg">What are you renting for?</div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-5 text-sm text-gray-500 mb-4">
          We serve construction, jobsites, and special events. Pick your type below.
        </p>

        {/* Options */}
        <div className="px-5 pb-6 space-y-3">
          {/* Track 1 */}
          <button
            onClick={() => onConfirmJobsite(false)}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition text-left active:scale-98 group"
          >
            <div className="text-3xl mt-0.5">🏗️</div>
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-orange-700">
                Construction / Jobsite Use
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Check availability, pick your dates, pay online, and pick up
              </div>
            </div>
          </button>

          {/* Track 2 */}
          <button
            onClick={() => onConfirmJobsite(true)}
            className="w-full flex items-start gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 transition text-left active:scale-98 group"
          >
            <div className="text-3xl mt-0.5">🎉</div>
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-indigo-700">
                Event / Special Occasion
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Weddings, festivals, corporate events, trade shows, parties — tents, tables, chairs, inflatables & more
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}