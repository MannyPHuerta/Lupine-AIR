import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Search, ShoppingCart, ExternalLink, X, Plus, Minus } from 'lucide-react';
import StoreHeader from '@/components/store/StoreHeader';
import { addToCart, getCart, removeFromCart, updateQuantity, cartCount } from '@/lib/storeCart';

// ─── Event Category Definitions ─────────────────────────────────────────────
const EVENT_CATEGORIES = [
  {
    id: 'wedding',
    label: 'Weddings',
    emoji: '💍',
    photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    desc: 'Elegant tents, dance floors, lighting, tables & full power stack',
    tags: ['Tent', 'Chair', 'Table', 'Dance Floor', 'Staging', 'Generator', 'Light Tower', 'Air Compressor', 'Inflatable'],
  },
  {
    id: 'corporate',
    label: 'Corporate & Trade Shows',
    emoji: '💼',
    photo: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80',
    desc: 'Staging, AV support, seating, tents & power for professional events',
    tags: ['Staging', 'Tent', 'Chair', 'Table', 'Generator', 'Light Tower'],
  },
  {
    id: 'festival',
    label: 'Festivals & Concerts',
    emoji: '🎶',
    photo: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    desc: 'Large tents, staging, crowd control, generators, light towers & more',
    tags: ['Staging', 'Tent', 'Generator', 'Light Tower', 'Trailer', 'Chair', 'Table', 'Forklift'],
  },
  {
    id: 'party',
    label: 'Parties & Social',
    emoji: '🎉',
    photo: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80',
    desc: 'Inflatables, tables, chairs, tents and fun for any gathering',
    tags: ['Inflatable', 'Chair', 'Table', 'Tent', 'Dance Floor', 'Generator'],
  },
  {
    id: 'funrun',
    label: 'Fun Runs & Sports',
    emoji: '🏅',
    photo: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80',
    desc: 'Crowd control barriers, tents, staging, generators & inflatables',
    tags: ['Tent', 'Staging', 'Generator', 'Light Tower', 'Inflatable', 'Trailer'],
  },
  {
    id: 'municipal',
    label: 'Municipal & Government',
    emoji: '🏛️',
    photo: 'https://images.unsplash.com/photo-1555848962-6e79363ec58f?w=800&q=80',
    desc: 'Large-scale power, lighting, tents, staging for public events',
    tags: ['Generator', 'Light Tower', 'Tent', 'Staging', 'Chair', 'Table', 'Trailer', 'Forklift'],
  },
];

// Map equipment categories to event tags for flexible matching
const CATEGORY_TO_TAGS = {
  'Tent': ['Tent'],
  'Chair': ['Chair'],
  'Table': ['Table'],
  'Dance Floor': ['Dance Floor'],
  'Staging': ['Staging'],
  'Inflatable': ['Inflatable'],
  'Generator': ['Generator'],
  'Light Tower': ['Light Tower'],
  'Air Compressor': ['Air Compressor'],
  'Forklift': ['Forklift'],
  'Trailer': ['Trailer'],
  'Boom Lift': ['Boom Lift'],
  'Scissor Lift': ['Scissor Lift'],
};

function equipmentMatchesEvent(equipment, eventCategory) {
  if (!eventCategory) return true;
  return eventCategory.tags.some(tag => {
    const equipCat = equipment.category || '';
    return equipCat === tag || equipCat.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(equipCat.toLowerCase());
  });
}

// ─── Mini Cart Drawer ────────────────────────────────────────────────────────
function CartDrawer({ cart, onClose, onUpdate, onRemove, eventCategory }) {
  const total = cart.reduce((sum, i) => sum + (i.dailyRate || 0) * (i.quantity || 1), 0);
  const hasItems = cart.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="font-bold text-gray-900">Your Event Cart ({cart.reduce((s,i)=>s+(i.quantity||1),0)} items)</div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <div className="text-sm">Your cart is empty</div>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                <div className="text-xs text-gray-400">${item.dailyRate}/day each</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onUpdate(item.id, Math.max(1, (item.quantity||1) - 1))} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity || 1}</span>
                <button onClick={() => onUpdate(item.id, (item.quantity||1) + 1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <button onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {hasItems && (
          <div className="border-t px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm font-semibold text-gray-800">
              <span>Estimated daily total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400">Final pricing confirmed at checkout based on your event dates.</p>

            {/* Event planner nudge */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
              <div className="text-xs font-semibold text-indigo-800 mb-1">🎨 Visualize your layout</div>
              <p className="text-xs text-indigo-600 mb-2">Open these selections in the Event Planner to design your space and get a complete quote.</p>
              <a
                href={`/event-planner?eventType=${eventCategory?.id || ''}&fromCart=1`}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Open in Event Planner <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <button
              onClick={() => window.location.href = '/airfq'}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-3 rounded-xl transition"
            >
              Request a Quote →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function EventStore() {
  const [allEquipment, setAllEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(getCart());
  const [showCart, setShowCart] = useState(false);
  const [addedId, setAddedId] = useState(null);
  const [storeMode, setStoreMode] = useState('both');

  useEffect(() => {
    Promise.all([
      base44.entities.CompanySettings.list(),
      base44.entities.Equipment.filter({ status: 'available' }, 'name', 300),
    ]).then(([settings, items]) => {
      if (settings.length > 0) setStoreMode(settings[0].storeMode || 'both');
      // Include all event-relevant categories
      const eventCats = new Set(Object.keys(CATEGORY_TO_TAGS));
      const eventItems = items.filter(e => eventCats.has(e.category) && e.dailyRate > 0);
      setAllEquipment(eventItems);
      setLoading(false);
    });
  }, []);

  const filtered = allEquipment.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.category||'').toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || equipmentMatchesEvent(e, selectedCategory);
    return matchSearch && matchCat;
  });

  const handleAdd = (item) => {
    const updated = addToCart(item, 1);
    setCart([...updated]);
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const handleRemove = (id) => {
    const updated = removeFromCart(id);
    setCart([...updated]);
  };

  const handleUpdate = (id, qty) => {
    const updated = updateQuantity(id, qty);
    setCart([...updated]);
  };

  const cartTotal = cart.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader storeMode={storeMode} />

      {/* Top nav */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-[57px] z-30">
        <button
          onClick={() => selectedCategory ? setSelectedCategory(null) : (window.location.href = '/store')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          {selectedCategory ? 'All Event Categories' : 'Back to Store'}
        </button>
        <button
          onClick={() => setShowCart(true)}
          className="relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartTotal > 0 ? `Cart (${cartTotal})` : 'Cart'}
          {cartTotal > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {cartTotal}
            </span>
          )}
        </button>
      </div>

      {/* Hero */}
      {!selectedCategory && (
        <div className="relative bg-gradient-to-br from-indigo-900 to-purple-900 text-white px-4 py-12 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1400&q=80')"}} />
          <div className="relative">
            <div className="text-4xl mb-3">🎉</div>
            <h1 className="text-3xl font-bold mb-2">Event Rentals</h1>
            <p className="text-indigo-200 text-sm max-w-md mx-auto">
              Tents, staging, tables, chairs, dance floors, power & more — browse our full event catalog and build your perfect setup.
            </p>
          </div>
        </div>
      )}

      {/* Category selection */}
      {!selectedCategory ? (
        <div className="px-4 py-6 max-w-5xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4">What kind of event are you planning?</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {EVENT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] shadow-md hover:shadow-xl transition-all focus:outline-none"
              >
                <img src={cat.photo} alt={cat.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-left">
                  <div className="text-xl mb-0.5">{cat.emoji}</div>
                  <div className="font-bold text-sm leading-tight">{cat.label}</div>
                  <div className="text-xs text-white/70 mt-0.5 hidden sm:block">{cat.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Browse all */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setSelectedCategory({ id: 'all', label: 'All Event Equipment', tags: Object.keys(CATEGORY_TO_TAGS) })}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Browse all event equipment →
            </button>
          </div>
        </div>
      ) : (
        /* Equipment grid for selected category */
        <div className="max-w-5xl mx-auto px-4 py-5">
          {/* Category header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">{selectedCategory.emoji || '🎪'}</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{selectedCategory.label}</h2>
              <p className="text-xs text-gray-500">{selectedCategory.desc || 'Browse available equipment'}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search equipment (e.g. tent, dance floor, generator...)"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {/* Open in planner banner */}
          {cart.length > 0 && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-indigo-900">🎨 Ready to design your layout?</div>
                <div className="text-xs text-indigo-600 mt-0.5">You have {cartTotal} item{cartTotal !== 1 ? 's' : ''} in your cart — open in the Event Planner to visualize your setup.</div>
              </div>
              <a
                href={`/event-planner?eventType=${selectedCategory.id}&fromCart=1`}
                className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
              >
                Open Planner <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <div className="font-medium">No equipment found</div>
              <div className="text-xs mt-1">Try a broader search or browse all categories</div>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 mb-3">{filtered.length} items available</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filtered.map(item => {
                  const inCart = cart.find(c => c.id === item.id);
                  const justAdded = addedId === item.id;
                  return (
                    <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition flex flex-col">
                      <div className="h-32 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                        <span className="text-5xl">{
                          item.category === 'Tent' ? '⛺' :
                          item.category === 'Chair' ? '🪑' :
                          item.category === 'Table' ? '🪞' :
                          item.category === 'Dance Floor' ? '🕺' :
                          item.category === 'Staging' ? '🎭' :
                          item.category === 'Inflatable' ? '🏰' :
                          item.category === 'Generator' ? '⚡' :
                          item.category === 'Light Tower' ? '💡' :
                          item.category === 'Air Compressor' ? '💨' :
                          '📦'
                        }</span>
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <div className="text-xs text-indigo-500 font-medium mb-0.5">{item.category}</div>
                        <div className="text-sm font-semibold text-gray-900 mb-1 leading-tight flex-1">{item.name}</div>
                        <div className="text-base font-bold text-gray-800 mb-2">${item.dailyRate}<span className="text-xs font-normal text-gray-400">/day</span></div>
                        <button
                          onClick={() => handleAdd(item)}
                          className={`w-full text-xs font-semibold py-2 rounded-lg transition ${
                            justAdded
                              ? 'bg-green-500 text-white'
                              : inCart
                              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {justAdded ? '✓ Added!' : inCart ? `In Cart (${inCart.quantity})  + Add More` : '+ Add to Cart'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating cart button when items in cart and drawer closed */}
      {cartTotal > 0 && !showCart && selectedCategory && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-full shadow-xl transition"
          >
            <ShoppingCart className="w-5 h-5" />
            View Cart ({cartTotal} items) →
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          eventCategory={selectedCategory}
        />
      )}
    </div>
  );
}