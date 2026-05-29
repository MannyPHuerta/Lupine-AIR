import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Calendar, Package, Shield, ChevronRight, Truck } from 'lucide-react';
import StoreCheckoutDrawer from './StoreCheckoutDrawer';

const CATEGORY_IMAGES = {
  'Forklift': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80',
  'Scissor Lift': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'Boom Lift': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80',
  'Excavator': 'https://images.unsplash.com/photo-1627757054889-dde47b009b04?w=800&q=80',
  'Skid Steer': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'Generator': 'https://images.unsplash.com/photo-1621905251189-08b45249d545?w=800&q=80',
  'Air Compressor': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80',
  'Trailer': 'https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?w=800&q=80',
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80';

export default function StoreEquipmentDetail({ equipment, currentUser, onBack }) {
  const [showCheckout, setShowCheckout] = useState(false);
  const imgSrc = equipment.imageUrl || CATEGORY_IMAGES[equipment.category] || DEFAULT_IMAGE;

  const specs = equipment.specs || {};
  const hasSpecs = Object.keys(specs).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back nav */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </button>
      </div>

      {/* Hero image */}
      <div className="bg-white">
        <img
          src={imgSrc}
          alt={equipment.name}
          className="w-full max-h-72 object-cover"
          onError={e => { e.target.src = DEFAULT_IMAGE; }}
        />
      </div>

      {/* Main content */}
      <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">

        {/* Title & price */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">{equipment.category}</div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">{equipment.name}</h1>
          <div className="flex items-end gap-6">
            <div>
              <div className="text-3xl font-bold text-gray-900">${equipment.dailyRate?.toFixed(0)}<span className="text-base font-normal text-gray-400">/day</span></div>
              {equipment.weeklyRate && (
                <div className="text-sm text-green-600 font-medium mt-0.5">${equipment.weeklyRate?.toFixed(0)}/week · Save {Math.round((1 - equipment.weeklyRate / (equipment.dailyRate * 7)) * 100)}%</div>
              )}
              {equipment.monthlyRate && (
                <div className="text-sm text-green-600 font-medium">${equipment.monthlyRate?.toFixed(0)}/month</div>
              )}
            </div>
            {equipment.depositRequired > 0 && (
              <div className="text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                ${equipment.depositRequired} deposit
              </div>
            )}
          </div>
        </div>

        {/* Key specs */}
        {hasSpecs && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" /> Key Specifications
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(specs).slice(0, 8).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2.5">
                  <div className="text-xs text-gray-400 capitalize">{k.replace(/_/g, ' ')}</div>
                  <div className="text-sm font-semibold text-gray-800 mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes / description */}
        {equipment.notes && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="font-semibold text-gray-900 mb-2">About This Unit</div>
            <p className="text-sm text-gray-600 leading-relaxed">{equipment.notes}</p>
          </div>
        )}

        {/* What's included */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" /> What's Included
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> Standard safety inspection before rental</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> Full tank / charged battery</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> Operator manual</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> 24/7 breakdown support line</div>
          </div>
        </div>

        {/* Delivery note */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
          <Truck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <span className="font-semibold">Delivery available.</span> Delivery fees are calculated at checkout based on your location.
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setShowCheckout(true)}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-base py-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-200"
        >
          <Calendar className="w-5 h-5" /> Check Availability & Reserve
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          You'll log in or create an account to complete your reservation
        </p>
      </div>

      {/* Checkout drawer */}
      {showCheckout && (
        <StoreCheckoutDrawer
          equipment={equipment}
          currentUser={currentUser}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}