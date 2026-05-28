import { ChevronRight } from 'lucide-react';

const CATEGORY_IMAGES = {
  'Forklift': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80',
  'Scissor Lift': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
  'Boom Lift': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80',
  'Excavator': 'https://images.unsplash.com/photo-1627757054889-dde47b009b04?w=400&q=80',
  'Skid Steer': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  'Generator': 'https://images.unsplash.com/photo-1621905251189-08b45249d545?w=400&q=80',
  'Air Compressor': 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&q=80',
  'Trailer': 'https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?w=400&q=80',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=80';

export default function StoreEquipmentCard({ equipment, onClick }) {
  const imgSrc = CATEGORY_IMAGES[equipment.category] || DEFAULT_IMAGE;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-md hover:border-orange-200 transition-all active:scale-95 w-full"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        <img
          src={imgSrc}
          alt={equipment.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = DEFAULT_IMAGE; }}
        />
      </div>
      <div className="p-3">
        <div className="text-xs text-orange-600 font-medium mb-0.5">{equipment.category}</div>
        <div className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 mb-2">
          {equipment.name}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold text-gray-900">${equipment.dailyRate?.toFixed(0)}</span>
            <span className="text-xs text-gray-400">/day</span>
          </div>
          <div className="bg-orange-50 rounded-full p-1">
            <ChevronRight className="w-3.5 h-3.5 text-orange-500" />
          </div>
        </div>
      </div>
    </button>
  );
}