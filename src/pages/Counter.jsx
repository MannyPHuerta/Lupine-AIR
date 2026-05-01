import { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CustomerSearchPanel from '@/components/counter/CustomerSearchPanel';
import RentalCartPanel from '@/components/counter/RentalCartPanel';
import QuickAddEquipment from '@/components/counter/QuickAddEquipment';

export default function Counter() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // Data
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [branchSettings, setBranchSettings] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branch, setBranch] = useState('01 McAllen');

  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-updated_date', 500),
      base44.entities.Customer.list('-updated_date', 500),
      base44.entities.BranchSettings.list(),
      base44.entities.CompanySettings.list(),
    ]).then(([eq, cust, bs, cs]) => {
      setEquipment(eq);
      setCustomers(cust);
      setBranchSettings(bs[0]);
      setCompanySettings(cs[0]);
      setLoading(false);
    });

    // Focus search on load for keyboard nav
    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const handleAddToCart = (item) => {
    setCart(prev => [...prev, { ...item, lineId: Math.random() }]);
  };

  const handleRemoveFromCart = (lineId) => {
    setCart(prev => prev.filter(l => l.lineId !== lineId));
  };

  const handleClearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSearchTerm('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchRef.current?.focus();
    }
    // Escape: Clear search or close customer selection
    if (e.key === 'Escape') {
      if (selectedCustomer) setSelectedCustomer(null);
      else setSearchTerm('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="bg-indigo-900 text-white sticky top-0 z-20 shadow-lg">
        <div className="px-4 py-2 flex items-center gap-3">
          <button onClick={() => navigate('/lupine')} className="p-2 rounded hover:bg-indigo-800">
            ← Back
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">Counter</div>
            <div className="text-indigo-300 text-xs">{branch}</div>
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

      <div className="flex h-[calc(100vh-60px)]">
        {/* Left: Customer Search & Info */}
        <div className="w-1/2 border-r bg-white overflow-y-auto">
          {selectedCustomer ? (
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-gray-900">{selectedCustomer.fullName}</div>
                  {selectedCustomer.companyName && (
                    <div className="text-sm text-gray-600">{selectedCustomer.companyName}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">{selectedCustomer.phone}</div>
                  <div className="text-xs text-gray-500">{selectedCustomer.email}</div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customer flags */}
              <div className="space-y-1 text-xs">
                {selectedCustomer.creditHold && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div><strong>Credit Hold:</strong> {selectedCustomer.creditHoldReason}</div>
                  </div>
                )}
                {selectedCustomer.blacklisted && (
                  <div className="bg-red-100 border border-red-400 text-red-800 px-3 py-2 rounded font-bold">
                    ⛔ BLACKLISTED: {selectedCustomer.blacklistReason}
                  </div>
                )}
                {selectedCustomer.taxExempt && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded">
                    ✓ Tax Exempt
                  </div>
                )}
              </div>

              {/* Payment terms */}
              <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
                <div className="font-medium text-gray-700 mb-1">Payment Terms</div>
                <div className="text-gray-600">{selectedCustomer.paymentTerms || 'Due on Receipt'}</div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="text-gray-600 font-medium">Total Rentals</div>
                  <div className="text-lg font-bold text-blue-700">{selectedCustomer.totalRentals || 0}</div>
                </div>
                <div className="bg-green-50 p-2 rounded border border-green-200">
                  <div className="text-gray-600 font-medium">Lifetime Spend</div>
                  <div className="text-lg font-bold text-green-700">${(selectedCustomer.totalSpend || 0).toFixed(0)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={searchRef}
                  placeholder="Search customer... (Ctrl+K)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                  autoFocus
                />
              </div>
              <CustomerSearchPanel
                searchTerm={searchTerm}
                customers={customers}
                onSelect={(c) => {
                  setSelectedCustomer(c);
                  setSearchTerm('');
                }}
              />
            </div>
          )}
        </div>

        {/* Right: Order Building */}
        <div className="w-1/2 bg-gray-50 overflow-y-auto flex flex-col">
          {!selectedCustomer ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-center p-4">
              <div>
                <div className="text-lg font-medium mb-2">Select a customer to start</div>
                <div className="text-sm text-gray-400">Search on the left or create a new customer</div>
              </div>
            </div>
          ) : (
            <>
              {/* Quick add equipment */}
              <div className="border-b p-4 bg-white">
                <QuickAddEquipment
                  equipment={equipment}
                  onAdd={handleAddToCart}
                />
              </div>

              {/* Cart */}
              <RentalCartPanel
                cart={cart}
                customer={selectedCustomer}
                branch={branch}
                branchSettings={branchSettings}
                companySettings={companySettings}
                allEquipment={equipment}
                onRemoveItem={handleRemoveFromCart}
                onCompleteRental={handleClearCart}
              />

              {/* Clear button */}
              {cart.length > 0 && (
                <div className="border-t p-4 bg-white">
                  <Button
                    onClick={handleClearCart}
                    variant="outline"
                    className="w-full text-red-600 hover:text-red-700"
                  >
                    Clear Order
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}