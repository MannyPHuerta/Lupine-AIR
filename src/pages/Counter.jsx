import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X, ScanLine, Phone, ShoppingCart, ChevronRight, Trash2, DollarSign, FlaskConical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import RentalCartPanel from '@/components/counter/RentalCartPanel';
import { useDLScanner } from '@/hooks/useDLScanner';
import PracticeModeWatermark from '@/components/PracticeModeWatermark';

// Steps: 'equipment' → 'scan' → 'phone' → 'checkout'

export default function Counter() {
  const navigate = useNavigate();
  const equipSearchRef = useRef(null);
  const phoneRef = useRef(null);

  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [branchSettings, setBranchSettings] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [practiceMode, setPracticeMode] = useState(() => localStorage.getItem('practiceMode') === 'true');

  const [step, setStep] = useState('equipment'); // 'equipment' | 'scan' | 'phone' | 'checkout'
  const [cart, setCart] = useState([]);
  const [equipmentSearchTerm, setEquipmentSearchTerm] = useState('');
  const [branch, setBranch] = useState('01 McAllen');

  // Customer state — built up progressively
  const [customer, setCustomer] = useState(null); // final customer object
  const [dlScanResult, setDlScanResult] = useState(null);
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const handleDLScan = useCallback((parsed) => {
    if (!parsed?.fullName) return;
    setDlScanResult(parsed);
    // Auto-advance if we're on the scan step
    setStep(s => s === 'scan' ? 'phone' : s);
  }, []);

  useDLScanner(handleDLScan);

  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-updated_date', 500),
      base44.entities.Customer.list('-updated_date', 500),
      base44.entities.Rental.list('-created_date', 200),
      base44.entities.BranchSettings.list(),
      base44.entities.CompanySettings.list(),
    ]).then(([eq, cust, rent, bs, cs]) => {
      setEquipment(eq);
      setCustomers(cust);
      setRentals(rent);
      setBranchSettings(bs[0]);
      setCompanySettings(cs[0]);
      setLoading(false);
    });
    setTimeout(() => equipSearchRef.current?.focus(), 100);
  }, []);

  const handleAddToCart = (item) => {
    setCart(prev => [...prev, { ...item, lineId: Math.random(), quantity: 1 }]);
    setEquipmentSearchTerm('');
  };

  const handleRemoveFromCart = (lineId) => {
    setCart(prev => prev.filter(i => i.lineId !== lineId));
  };

  // After DL scan, create/find customer and ask for phone
  const handleConfirmPhone = async () => {
    // PRACTICE MODE — skip all DB writes
    if (practiceMode) {
      setCustomer({ fullName: dlScanResult?.fullName || 'Practice Customer', phone, address: dlScanResult?.address || '', city: dlScanResult?.city || '', state: dlScanResult?.state || '', zip: dlScanResult?.zip || '', id: 'practice' });
      setStep('checkout');
      return;
    }
    setSavingPhone(true);
    let finalCustomer;
    if (dlScanResult) {
      // Try to find existing customer by name
      const match = customers.find(c =>
        c.fullName?.toLowerCase() === dlScanResult.fullName?.toLowerCase()
      );
      if (match) {
        finalCustomer = await base44.entities.Customer.update(match.id, { phone });
        finalCustomer = { ...match, phone };
      } else {
        finalCustomer = await base44.entities.Customer.create({
          fullName: dlScanResult.fullName,
          address: dlScanResult.address,
          city: dlScanResult.city,
          state: dlScanResult.state,
          zip: dlScanResult.zip,
          idVerified: true,
          idType: `${dlScanResult.state} Driver's License`,
          idNumber: dlScanResult.dlLast4,
          phone,
          source: 'manual',
        });
      }
    } else {
      // No DL scan — just a name-entered customer
      finalCustomer = { fullName: 'Walk-in Customer', phone };
    }
    setSavingPhone(false);
    setCustomer(finalCustomer);
    setStep('checkout');
  };

  const handleCompleteRental = () => {
    setCart([]);
    setCustomer(null);
    setDlScanResult(null);
    setPhone('');
    setStep('equipment');
    setTimeout(() => equipSearchRef.current?.focus(), 50);
  };

  const filteredEquipment = equipment.filter(e =>
    e.status === 'available' &&
    e.location === branch &&
    e.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
  ).slice(0, 30);

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
      {practiceMode && <PracticeModeWatermark />}
      {practiceMode && (
        <div className="bg-red-600 text-white text-center text-xs font-bold py-1.5 tracking-widest z-40 relative">
          ⚠ PRACTICE MODE — Nothing will be saved ⚠
        </div>
      )}
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-20 shadow-lg">
        <div className="px-4 py-2 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded hover:bg-indigo-800 text-sm">
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
              { key: 'scan', label: '2. Scan ID' },
              { key: 'phone', label: '3. Phone' },
              { key: 'checkout', label: '4. Checkout' },
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

      {/* ── STEP 1: Equipment search ── */}
      {step === 'equipment' && (
        <div className="flex flex-1 h-[calc(100vh-60px)]">
          {/* Left: search */}
          <div className="w-1/2 border-r bg-white flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={equipSearchRef}
                  placeholder="Search equipment by name..."
                  value={equipmentSearchTerm}
                  onChange={e => setEquipmentSearchTerm(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredEquipment.length === 0 && equipmentSearchTerm && (
                <div className="text-center text-gray-400 text-sm py-8">No equipment found</div>
              )}
              {filteredEquipment.length === 0 && !equipmentSearchTerm && (
                <div className="text-center text-gray-400 text-sm py-8">Type to search available equipment</div>
              )}
              {filteredEquipment.map(e => (
                <button
                  key={e.id}
                  onClick={() => handleAddToCart(e)}
                  className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition group"
                >
                  <div className="font-medium text-gray-900 group-hover:text-indigo-700 text-sm">{e.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    ${e.dailyRate}/day
                    {e.weeklyRate && <span className="ml-2 text-gray-400">· ${e.weeklyRate}/wk</span>}
                    {e.category && <span className="ml-2 text-gray-400">· {e.category}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: cart / quote */}
          <div className="w-1/2 flex flex-col bg-gray-50">
            <div className="p-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                  Quote ({cart.length} {cart.length === 1 ? 'item' : 'items'})
                </div>
                {quickTotal > 0 && (
                  <div className="text-sm font-bold text-indigo-600">${quickTotal.toFixed(2)}/day</div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-12">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Add equipment from the left
                </div>
              )}
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
            </div>

            <div className="p-4 border-t bg-white">
              <Button
                onClick={() => setStep('scan')}
                disabled={cart.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                Customer agreed — Scan ID <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: Scan ID ── */}
      {step === 'scan' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <ScanLine className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900">Scan Customer's ID</h2>
              <p className="text-sm text-gray-500 mt-1">Swipe or scan the driver's license now</p>
            </div>

            {dlScanResult ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                <div className="text-green-800 font-semibold flex items-center gap-2">
                  ✅ ID Scanned
                </div>
                <div className="text-sm text-green-900 font-medium">{dlScanResult.fullName}</div>
                <div className="text-xs text-green-700">{dlScanResult.address}, {dlScanResult.city}, {dlScanResult.state}</div>
                <Button onClick={() => setStep('phone')} className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2 gap-2">
                  Continue — Enter Phone <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center text-indigo-600 text-sm">
                Waiting for ID scan…
              </div>
            )}

            <button
              onClick={() => setStep('phone')}
              className="w-full text-xs text-gray-400 hover:text-gray-600 text-center py-2"
            >
              Skip — enter name manually
            </button>

            <button onClick={() => setStep('equipment')} className="w-full text-xs text-indigo-600 hover:text-indigo-800 text-center">
              ← Back to equipment
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Phone number ── */}
      {step === 'phone' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center">
              <Phone className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900">Phone Number</h2>
              {dlScanResult && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>{dlScanResult.fullName}</strong> — one more field
                </p>
              )}
            </div>

            <div className="space-y-3">
              {!dlScanResult && (
                <Input
                  placeholder="Customer full name"
                  className="text-sm"
                />
              )}
              <Input
                ref={phoneRef}
                type="tel"
                placeholder="(956) 555-0100"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && phone && handleConfirmPhone()}
                className="text-lg text-center tracking-wider"
                autoFocus
              />
              <Button
                onClick={handleConfirmPhone}
                disabled={!phone || savingPhone}
                className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                {savingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {savingPhone ? 'Saving…' : 'Go to Checkout'}
              </Button>
            </div>

            <button onClick={() => setStep('scan')} className="w-full text-xs text-indigo-600 hover:text-indigo-800 text-center">
              ← Back to ID scan
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Checkout (RentalCartPanel) ── */}
      {step === 'checkout' && customer && (
        <div className="flex flex-1 h-[calc(100vh-60px)]">
          {/* Customer summary + equipment add */}
          <div className="w-1/3 border-r bg-white overflow-y-auto flex flex-col">
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-gray-900">{customer.fullName}</div>
                  <div className="text-xs text-gray-500 mt-1">{customer.phone}</div>
                  {customer.address && <div className="text-xs text-gray-400">{customer.city}, {customer.state}</div>}
                </div>
                <button onClick={() => { setCustomer(null); setStep('scan'); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {customer.creditHold && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                  <strong>Credit Hold:</strong> {customer.creditHoldReason}
                </div>
              )}

              <div className="border-t pt-4">
                <div className="text-xs font-semibold text-gray-700 mb-3">Add Equipment</div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search equipment..."
                    value={equipmentSearchTerm}
                    onChange={e => setEquipmentSearchTerm(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {equipment
                    .filter(e =>
                      e.status === 'available' &&
                      e.location === branch &&
                      e.name?.toLowerCase().includes(equipmentSearchTerm.toLowerCase())
                    )
                    .slice(0, 20)
                    .map(e => (
                      <button
                        key={e.id}
                        onClick={() => { handleAddToCart(e); setEquipmentSearchTerm(''); }}
                        className="w-full text-left p-2 rounded hover:bg-indigo-50 text-xs border border-transparent hover:border-indigo-300 transition group"
                      >
                        <div className="font-medium text-gray-900 group-hover:text-indigo-700">{e.name}</div>
                        <div className="text-gray-500">${e.dailyRate}/day</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Cart / invoice */}
          <RentalCartPanel
            cart={cart}
            customer={customer}
            branch={branch}
            branchSettings={branchSettings}
            companySettings={companySettings}
            allEquipment={equipment}
            onRemoveItem={handleRemoveFromCart}
            onCompleteRental={handleCompleteRental}
          />
        </div>
      )}
    </div>
  );
}