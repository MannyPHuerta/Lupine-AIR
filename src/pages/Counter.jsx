import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X, ShoppingCart, ChevronRight, Trash2, DollarSign, FlaskConical, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import RentalCartPanel from '@/components/counter/RentalCartPanel';
import PracticeModeWatermark from '@/components/PracticeModeWatermark';
import { useAIEquipmentSearch } from '@/hooks/useAIEquipmentSearch';
import AIEquipmentSearchInput from '@/components/equipment/AIEquipmentSearchInput';
import CustomerSearchPanel from '@/components/counter/CustomerSearchPanel';
import RentalAlertModal from '@/components/equipment/RentalAlertModal';

// Steps: 'equipment' → 'checkout'
const WALKIN_CUSTOMER = { fullName: 'Walk-in', phone: '', address: '', city: '', state: '', zip: '', id: 'walkin' };

export default function Counter() {
  const navigate = useNavigate();
  const equipSearchRef = useRef(null);
  const phoneRef = useRef(null);

  const [equipment, setEquipment] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [branchSettings, setBranchSettings] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [practiceMode, setPracticeMode] = useState(() => localStorage.getItem('practiceMode') === 'true');
  const { aiSuggestions, isSearching: aiSearching, triggerAISearch, clearAISuggestions } = useAIEquipmentSearch(equipment);
  const aiTimerRef = useRef(null);

  const [step, setStep] = useState('equipment'); // 'equipment' | 'checkout'
  const [cart, setCart] = useState([]);
  const [pendingAlertItem, setPendingAlertItem] = useState(null);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [branch, setBranch] = useState('01 McAllen');
  const listRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-updated_date', 500),
      base44.entities.Rental.list('-created_date', 200),
      base44.entities.BranchSettings.list(),
      base44.entities.CompanySettings.list(),
      base44.entities.Customer.list('-created_date', 500),
      base44.auth.me().catch(() => null),
    ]).then(([eq, rent, bs, cs, custs, user]) => {
      setEquipment(eq);
      setRentals(rent);
      setBranchSettings(bs[0]);
      setCompanySettings(cs[0]);
      setCustomers(custs);
      setCurrentUser(user);
      setLoading(false);
    });
    setTimeout(() => equipSearchRef.current?.focus(), 100);
  }, []);

  const commitAddToCart = (item) => {
    setCart(prev => [...prev, { ...item, lineId: Math.random(), quantity: 1 }]);
    setEquipmentSearchTerm('');
    setHighlightIndex(0);
    setTimeout(() => equipSearchRef.current?.focus(), 50);
  };

  const handleAddToCart = (item) => {
    if (!item.consumable) {
      // Non-consumables require a full rental contract — redirect to /availability
      if (confirm(`"${item.name}" requires a rental contract.\n\nOpen the Full Form now?`)) {
        navigate('/availability');
      }
      return;
    }
    // If item has a rental alert, show the modal first
    if (item.rentalAlert) {
      setPendingAlertItem(item);
      return;
    }
    commitAddToCart(item);
  };

  const handleRemoveFromCart = (lineId) => {
    setCart(prev => prev.filter(i => i.lineId !== lineId));
  };

  const handleCompleteRental = () => {
    setCart([]);
    setStep('equipment');
    setEquipmentSearchTerm('');
    setHighlightIndex(0);
    setTimeout(() => equipSearchRef.current?.focus(), 50);
  };

  const filteredEquipment = equipment
    .filter(e =>
      e.status !== 'retired' &&
      e.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 50);

  // Trigger AI synonym search when no local results found
  useEffect(() => {
    clearTimeout(aiTimerRef.current);
    if (equipmentSearchTerm.trim().length >= 3 && filteredEquipment.length === 0) {
      aiTimerRef.current = setTimeout(() => triggerAISearch(equipmentSearchTerm.trim()), 600);
    } else {
      clearAISuggestions();
    }
    return () => clearTimeout(aiTimerRef.current);
  }, [equipmentSearchTerm, filteredEquipment.length]);

  const checkoutBtnRef = useRef(null);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Tab') {
      // Let Tab move focus naturally to the checkout button — do nothing
      return;
    }
    if (filteredEquipment.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(highlightIndex + 1, filteredEquipment.length - 1);
      setHighlightIndex(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.max(highlightIndex - 1, 0);
      setHighlightIndex(next);
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && filteredEquipment[highlightIndex]) handleAddToCart(filteredEquipment[highlightIndex]);
    }
  };

  // Quick subtotal for the verbal quote
  const quickTotal = cart.reduce((sum, item) => sum + (item.dailyRate || 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {pendingAlertItem && (
        <RentalAlertModal
          equipment={pendingAlertItem}
          onConfirm={() => { commitAddToCart(pendingAlertItem); setPendingAlertItem(null); }}
          onCancel={() => setPendingAlertItem(null)}
        />
      )}
      {practiceMode && <PracticeModeWatermark />}
      {practiceMode && (
        <div className="bg-red-600 text-white text-center text-xs font-bold py-1.5 tracking-widest z-40 relative">
          ⚠ PRACTICE MODE — Nothing will be saved ⚠
        </div>
      )}
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-20 shadow-lg">
        <div className="px-4 py-2 flex items-center gap-3">
          <button onClick={() => step === 'checkout' ? setStep('equipment') : navigate('/')} className="p-2 rounded hover:bg-indigo-800 text-sm">
            ← Back
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Counter</div>
            <div className="text-indigo-300 text-xs">{branch}</div>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-indigo-800 rounded-lg p-0.5 text-xs">
            <button className="px-3 py-1.5 rounded-md bg-white text-indigo-900 font-semibold">Quick</button>
            <button onClick={() => navigate('/availability')} className="px-3 py-1.5 rounded-md text-indigo-300 hover:text-white font-semibold transition">Full Form</button>
          </div>

          {/* Practice Mode toggle */}
          <button
            onClick={() => setPracticeMode(p => { const next = !p; localStorage.setItem('practiceMode', next); return next; })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
              practiceMode
                ? 'bg-red-500 border-red-400 text-white animate-pulse'
                : 'bg-indigo-800 border-indigo-600 text-indigo-300 hover:text-white'
            }`}
            title="Toggle Practice Mode — no data is saved"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {practiceMode ? 'PRACTICE ON' : 'Practice'}
          </button>

          {/* Step pills */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            {[
              { key: 'equipment', label: '1. Equipment' },
              { key: 'checkout', label: '2. Checkout' },
            ].map((s, i, arr) => (
              <span key={s.key} className="flex items-center gap-1">
                <span className={`px-2 py-1 rounded font-semibold ${step === s.key ? 'bg-cyan-500 text-black' : 'text-indigo-400'}`}>
                  {s.label}
                </span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-indigo-600" />}
              </span>
            ))}
          </div>

          <select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            className="h-9 border-0 rounded px-2 bg-indigo-800 text-white text-sm"
          >
            {['01 McAllen', '02 Weslaco', '03 Harlingen', '05 Brownsville', '06 Corpus'].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── STEP 1: Equipment search + cart ── */}
      {step === 'equipment' && (
        <div className="flex flex-1 h-[calc(100vh-60px)]">
          {/* Left: search */}
          <div className="w-1/2 border-r bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={equipSearchRef}
                  placeholder="Search equipment by name…"
                  value={equipmentSearchTerm}
                  onChange={e => { setEquipmentSearchTerm(e.target.value); setHighlightIndex(-1); }}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredEquipment.length === 0 && !aiSearching && aiSuggestions.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  {equipmentSearchTerm ? 'No equipment found' : 'Start typing to search equipment'}
                </div>
              )}
              {filteredEquipment.length === 0 && aiSearching && (
                <div className="flex items-center justify-center gap-2 text-indigo-500 text-sm py-8">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching by alternate names…
                </div>
              )}
              {filteredEquipment.length === 0 && !aiSearching && aiSuggestions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 px-3 py-2 bg-indigo-50 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5" /> Did you mean…
                  </div>
                  {aiSuggestions.map((e, idx) => (
                    <button
                      key={e.id}
                      onClick={() => handleAddToCart(e)}
                      className="w-full text-left p-3 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{e.name}</span>
                        {e.consumable
                          ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Counter Sale</span>
                          : <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Full Form ↗</span>
                        }
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">${e.dailyRate}/day{e.category && ` · ${e.category}`}</div>
                    </button>
                  ))}
                </div>
              )}
              {filteredEquipment.map((e, idx) => (
                <button
                  key={e.id}
                  tabIndex={-1}
                  onClick={() => handleAddToCart(e)}
                  className={`w-full text-left p-3 rounded-lg border transition group ${
                    highlightIndex >= 0 && idx === highlightIndex
                      ? 'bg-indigo-100 border-indigo-300'
                      : 'border-transparent hover:bg-indigo-50 hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 group-hover:text-indigo-700 text-sm">{e.name}</span>
                    {e.consumable
                      ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Counter Sale</span>
                      : <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Full Form ↗</span>
                    }
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    ${e.dailyRate}/day
                    {e.weeklyRate && <span className="ml-2 text-gray-400">· ${e.weeklyRate}/wk</span>}
                    {e.category && <span className="ml-2 text-gray-400">· {e.category}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: action button pinned at top, cart scrolls below */}
          <div className="w-1/2 flex flex-col bg-gray-50">
            {/* Action button — always visible at top */}
            <div className="p-3 border-b bg-white">
              <Button
                ref={checkoutBtnRef}
                onClick={() => setStep('checkout')}
                disabled={cart.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 h-12 text-base font-bold"
              >
                <DollarSign className="w-5 h-5" /> Checkout
              </Button>
            </div>

            {/* Cart items — scrollable */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Add equipment from the left
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-1">
                    <div className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                      <ShoppingCart className="w-4 h-4 text-indigo-600" />
                      {cart.length} {cart.length === 1 ? 'item' : 'items'}
                    </div>
                    {quickTotal > 0 && (
                      <div className="text-sm font-bold text-indigo-600">${quickTotal.toFixed(2)}/day</div>
                    )}
                  </div>
                  {cart.map(item => (
                    <div key={item.lineId} className="bg-white rounded-lg border p-3 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                        <div className="text-xs text-gray-500">${item.dailyRate}/day</div>
                      </div>
                      <button onClick={() => handleRemoveFromCart(item.lineId)} className="text-gray-400 hover:text-red-600 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Checkout (RentalCartPanel) ── */}
      {step === 'checkout' && (
        <div className="flex flex-1 h-[calc(100vh-60px)]">
          {/* Left sidebar: back + add more equipment */}
          <div className="w-1/3 border-r bg-white flex flex-col p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Add Equipment</span>
              <button onClick={() => setStep('equipment')} className="text-gray-400 hover:text-gray-600" title="Back to equipment list">
                <X className="w-4 h-4" />
              </button>
            </div>
            <AIEquipmentSearchInput
              equipment={equipment}
              placeholder="Search equipment…"
              onSelect={(e) => handleAddToCart(e)}
            />
          </div>

          {/* Right: Cart / invoice */}
          <RentalCartPanel
            cart={cart}
            branch={branch}
            branchSettings={branchSettings}
            companySettings={companySettings}
            onRemoveItem={handleRemoveFromCart}
            onCompleteRental={handleCompleteRental}
            practiceMode={practiceMode}
          />
        </div>
      )}
    </div>
  );
}