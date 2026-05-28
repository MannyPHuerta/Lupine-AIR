import { Phone, MapPin } from 'lucide-react';

export default function StoreHeader() {
  return (
    <header className="bg-white border-b shadow-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-none">Rental World</div>
            <div className="text-xs text-gray-400">Equipment Rentals</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="tel:+19565551234"
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-600 transition"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Call Us</span>
          </a>
          <button
            onClick={() => window.location.href = '/airfq'}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
          >
            Event Quote
          </button>
        </div>
      </div>
    </header>
  );
}