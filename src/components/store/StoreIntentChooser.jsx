import { X } from 'lucide-react';

const CONSTRUCTION_IMG = 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80';
const EVENTS_IMG = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80';

// ─── Split Screen ────────────────────────────────────────────────────────────
function SplitScreen({ onConstruction, onEvents }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Left: Construction */}
      <button
        onClick={onConstruction}
        className="relative flex-1 group overflow-hidden focus:outline-none"
      >
        <img src={CONSTRUCTION_IMG} alt="Construction" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:from-black/70 transition-all" />
        <div className="relative flex flex-col items-center justify-end h-full pb-16 px-8 text-white text-center">
          <div className="text-5xl mb-4">🏗️</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">Construction & Jobsite</h2>
          <p className="text-white/80 text-base md:text-lg mb-6 max-w-xs">Forklifts, excavators, compressors, lifts — browse, reserve, pick up same day</p>
          <span className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-3 rounded-full text-base shadow-lg transition group-hover:scale-105">
            Browse Equipment →
          </span>
        </div>
      </button>

      {/* Divider */}
      <div className="relative z-10 flex items-center justify-center w-0">
        <div className="absolute bg-white/20 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center text-white font-bold text-sm shadow-xl border border-white/30">OR</div>
      </div>

      {/* Right: Events */}
      <button
        onClick={onEvents}
        className="relative flex-1 group overflow-hidden focus:outline-none"
      >
        <img src={EVENTS_IMG} alt="Events" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 group-hover:from-black/70 transition-all" />
        <div className="relative flex flex-col items-center justify-end h-full pb-16 px-8 text-white text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">Special Events</h2>
          <p className="text-white/80 text-base md:text-lg mb-6 max-w-xs">Weddings, festivals, corporate events, fun runs — tents, staging, dance floors & more</p>
          <span className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-8 py-3 rounded-full text-base shadow-lg transition group-hover:scale-105">
            Plan My Event →
          </span>
        </div>
      </button>
    </div>
  );
}

// ─── Card Tiles on Dark ──────────────────────────────────────────────────────
function CardTiles({ onConstruction, onEvents }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a2e] flex flex-col items-center justify-center px-6">
      <div className="text-white text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome! What can we help with?</h1>
        <p className="text-white/50 text-base">We'll show you exactly what you need.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {/* Construction */}
        <button onClick={onConstruction} className="group flex-1 rounded-2xl overflow-hidden bg-[#16213e] border border-white/10 hover:border-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all text-left">
          <div className="h-40 overflow-hidden">
            <img src={CONSTRUCTION_IMG} alt="Construction" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="p-5">
            <div className="text-3xl mb-2">🏗️</div>
            <div className="text-white font-bold text-lg mb-1">Construction & Jobsite</div>
            <div className="text-white/50 text-sm mb-4">Forklifts, lifts, excavators, generators, compressors & more</div>
            <span className="inline-block bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-lg group-hover:bg-orange-400 transition">Browse Equipment →</span>
          </div>
        </button>

        {/* Events */}
        <button onClick={onEvents} className="group flex-1 rounded-2xl overflow-hidden bg-[#16213e] border border-white/10 hover:border-purple-400 hover:shadow-[0_0_30px_rgba(167,139,250,0.3)] transition-all text-left">
          <div className="h-40 overflow-hidden">
            <img src={EVENTS_IMG} alt="Events" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="p-5">
            <div className="text-3xl mb-2">🎉</div>
            <div className="text-white font-bold text-lg mb-1">Special Events</div>
            <div className="text-white/50 text-sm mb-4">Weddings, festivals, corporate, fun runs, parties & more</div>
            <span className="inline-block bg-purple-600 text-white text-sm font-semibold px-4 py-2 rounded-lg group-hover:bg-purple-500 transition">Plan My Event →</span>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── Warm Welcome ────────────────────────────────────────────────────────────
function WarmWelcome({ onConstruction, onEvents }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="text-4xl mb-2">👋</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome! What brings you here?</h1>
          <p className="text-gray-400 text-sm">We'll take you to the right place.</p>
        </div>
        <div className="px-6 pb-8 flex flex-col sm:flex-row gap-4 mt-4">
          {/* Construction */}
          <button
            onClick={onConstruction}
            className="group flex-1 flex flex-col items-center text-center p-5 rounded-2xl border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition"
          >
            <div className="text-5xl mb-3">🏗️</div>
            <div className="font-bold text-gray-900 text-base mb-1 group-hover:text-orange-700">Construction & Jobsite</div>
            <div className="text-xs text-gray-500 mb-4">Forklifts, lifts, excavators, generators & more</div>
            <span className="bg-orange-500 group-hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition">Browse Equipment</span>
          </button>

          {/* Events */}
          <button
            onClick={onEvents}
            className="group flex-1 flex flex-col items-center text-center p-5 rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 transition"
          >
            <div className="text-5xl mb-3">🎉</div>
            <div className="font-bold text-gray-900 text-base mb-1 group-hover:text-indigo-700">Special Events</div>
            <div className="text-xs text-gray-500 mb-4">Weddings, festivals, parties, corporate & more</div>
            <span className="bg-indigo-600 group-hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition">Plan My Event</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Immersive Full-Screen ───────────────────────────────────────────────────
function Immersive({ onConstruction, onEvents }) {
  return (
    <div className="fixed inset-0 z-50">
      {/* Background: split blurred images */}
      <div className="absolute inset-0 flex">
        <div className="flex-1 bg-cover bg-center" style={{ backgroundImage: `url(${CONSTRUCTION_IMG})` }} />
        <div className="flex-1 bg-cover bg-center" style={{ backgroundImage: `url(${EVENTS_IMG})` }} />
      </div>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Floating glass cards */}
      <div className="relative flex flex-col items-center justify-center h-full px-6 text-center">
        <h1 className="text-white text-3xl md:text-5xl font-bold mb-2 drop-shadow-xl">What are you here for?</h1>
        <p className="text-white/60 mb-10 text-base md:text-lg">Choose your path and we'll handle the rest.</p>

        <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
          <button
            onClick={onConstruction}
            className="group flex-1 bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-6 text-white hover:bg-white/25 hover:border-orange-300 transition-all text-center"
          >
            <div className="text-4xl mb-3">🏗️</div>
            <div className="font-bold text-lg mb-1">Construction</div>
            <div className="text-white/70 text-sm mb-4">Jobsite & heavy equipment</div>
            <span className="inline-block bg-orange-500/90 backdrop-blur text-white font-semibold text-sm px-5 py-2 rounded-full group-hover:bg-orange-400 transition">Browse Equipment</span>
          </button>

          <button
            onClick={onEvents}
            className="group flex-1 bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl p-6 text-white hover:bg-white/25 hover:border-purple-300 transition-all text-center"
          >
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-bold text-lg mb-1">Special Events</div>
            <div className="text-white/70 text-sm mb-4">Tents, staging, tables & more</div>
            <span className="inline-block bg-purple-600/90 backdrop-blur text-white font-semibold text-sm px-5 py-2 rounded-full group-hover:bg-purple-500 transition">Plan My Event</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function StoreIntentChooser({ style = 'split_screen', onConstruction, onEvents }) {
  const props = { onConstruction, onEvents };
  if (style === 'card_tiles') return <CardTiles {...props} />;
  if (style === 'warm_welcome') return <WarmWelcome {...props} />;
  if (style === 'immersive') return <Immersive {...props} />;
  return <SplitScreen {...props} />;
}