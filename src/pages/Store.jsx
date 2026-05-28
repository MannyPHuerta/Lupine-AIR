import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Filter, ChevronRight, Star, Zap } from 'lucide-react';
import StoreEquipmentCard from '@/components/store/StoreEquipmentCard';
import StoreHeader from '@/components/store/StoreHeader';
import StoreIntentModal from '@/components/store/StoreIntentModal';
import StoreEquipmentDetail from '@/components/store/StoreEquipmentDetail';
import StoreAuthBar from '@/components/store/StoreAuthBar';
import StoreProfileSetup from '@/components/store/StoreProfileSetup';

const TRACK1_CATEGORIES = [
  'Air Compressor', 'Backhoe', 'Boom Lift', 'Bulldozer', 'Compactor',
  'Concrete Equipment', 'Dump Truck', 'Excavator', 'Floor Sander',
  'Forklift', 'Generator', 'Grader', 'Light Tower', 'Loader',
  'Pallet Jack', 'Paving Equipment', 'Plate Compactor', 'Pressure Washer',
  'Sandblaster', 'Scissor Lift', 'Skid Steer', 'Stump Grinder',
  'Telehandler', 'Tile Stripper', 'Trailer', 'Trencher',
  'Water Pump', 'Welder', 'Zero Turn Mower', 'Tool', 'Other'
];

const CATEGORIES_WITH_ICONS = [
  { label: 'All Equipment', value: 'all', icon: '🔧' },
  { label: 'Forklifts', value: 'Forklift', icon: '🏗️' },
  { label: 'Lifts', value: 'Boom Lift', icon: '🦺' },
  { label: 'Excavators', value: 'Excavator', icon: '⛏️' },
  { label: 'Generators', value: 'Generator', icon: '⚡' },
  { label: 'Compressors', value: 'Air Compressor', icon: '💨' },
  { label: 'Skid Steers', value: 'Skid Steer', icon: '🚜' },
  { label: 'Trailers', value: 'Trailer', icon: '🚛' },
];

export default function Store() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [intentChecked, setIntentChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [eventsEnabled, setEventsEnabled] = useState(true); // default on until loaded

  useEffect(() => {
    // Load company settings to check storeEventsEnabled
    base44.entities.CompanySettings.list().then(rows => {
      if (rows.length > 0) {
        // Default to true if field not yet set
        setEventsEnabled(rows[0].storeEventsEnabled !== false);
      }
    });

    base44.entities.Equipment.filter({ status: 'available' }, 'name', 200)
      .then(items => {
        const track1Items = items.filter(e =>
          TRACK1_CATEGORIES.includes(e.category) && e.dailyRate > 0
        );
        setEquipment(track1Items);
        setLoading(false);
      });
  }, []);

  const filtered = equipment.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === 'all' || e.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleEquipmentClick = (item) => {
    if (!intentChecked && eventsEnabled) {
      setSelectedEquipment(item);
      setShowIntentModal(true);
    } else {
      setIntentChecked(true);
      setSelectedEquipment(item);
    }
  };

  const handleUserLoaded = (user) => {
    setCurrentUser(user);
    // Show profile setup if first-time user (no phone saved yet)
    if (!user.phone && !user.profileComplete) {
      setShowProfileSetup(true);
    }
  };

  const handleIntentConfirm = (isEvent) => {
    setIntentChecked(true);
    setShowIntentModal(false);
    if (isEvent) {
      // Redirect to event planner / quote flow
      window.location.href = '/airfq';
    }
    // else: stay on page, show equipment detail
  };

  const handleIntentCancel = () => {
    setShowIntentModal(false);
    setSelectedEquipment(null);
  };

  if (selectedEquipment && intentChecked) {
    return (
      <StoreEquipmentDetail
        equipment={selectedEquipment}
        currentUser={currentUser}
        onBack={() => { setSelectedEquipment(null); setIntentChecked(false); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader eventsEnabled={eventsEnabled} />
      <StoreAuthBar onUserLoaded={handleUserLoaded} />

      {/* Profile setup for first-time users */}
      {showProfileSetup && currentUser && (
        <StoreProfileSetup
          user={currentUser}
          onComplete={(updatedUser) => {
            setCurrentUser(updatedUser);
            setShowProfileSetup(false);
          }}
        />
      )}

      {/* Intent check modal — only shown when events are enabled */}
      {showIntentModal && eventsEnabled && (
        <StoreIntentModal
          equipment={selectedEquipment}
          onConfirmJobsite={handleIntentConfirm}
          onCancel={handleIntentCancel}
        />
      )}

      {/* Hero bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-1">Rent Equipment Online</h1>
        <p className="text-slate-300 text-sm mb-4">Check availability, reserve instantly, pick up same day</p>
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search equipment (e.g. forklift, scissor lift...)"
            className="w-full pl-9 pr-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-white border-b">
        {CATEGORIES_WITH_ICONS.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              selectedCategory === cat.value
                ? 'bg-orange-500 text-white shadow'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-56 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-medium">No equipment found</div>
            <div className="text-sm mt-1">Try a different search or category</div>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-3">{filtered.length} items available</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map(item => (
                <StoreEquipmentCard
                  key={item.id}
                  equipment={item}
                  onClick={() => handleEquipmentClick(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Event planning banner — only shown when events are enabled */}
      {eventsEnabled && (
        <div className="mx-4 mb-8 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
          <div className="text-lg font-bold mb-1">🎉 Planning an Event?</div>
          <p className="text-indigo-100 text-sm mb-3">
            Tents, staging, dance floors, and more — get a custom quote from our event team.
          </p>
          <a
            href="/airfq"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
          >
            Get an Event Quote <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}