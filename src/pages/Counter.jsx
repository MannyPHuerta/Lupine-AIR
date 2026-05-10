import { useState, useEffect, useRef, useCallback } from 'react';

import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import CustomerSearchPanel from '@/components/counter/CustomerSearchPanel';
import RentalCartPanel from '@/components/counter/RentalCartPanel';
import { useDLScanner } from '@/hooks/useDLScanner';

export default function Counter() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [branchSettings, setBranchSettings] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branch, setBranch] = useState('01 McAllen');
  const [dlScanResult, setDlScanResult] = useState(null);
  const [dlScanFlash, setDlScanFlash] = useState(null);

  const handleDLScan = useCallback((parsed) => {
    setDlScanResult(parsed);
    setDlScanFlash(parsed?.isExpired ? 'expired' : 'success');
    if (parsed?.fullName) {
      setSearchTerm(parsed.lastName || parsed.fullName);
    }
    setTimeout(() => setDlScanFlash(null), 4000);
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

    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const handleAddToCart = (item) => {
    const lineId = Math.random();
    setCart([...cart, { ...item, lineId, quantity: 1 }]);
  };

  const handleRemoveFromCart = (lineId) => {
    setCart(cart.filter(item => item.lineId !== lineId));
  };

  const handleCompleteRental = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSearchTerm('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchRef.current?.focus();
    }
    if (e.key === 'Escape' && selectedCustomer) {
      setSelectedCustomer(null);
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
    <div className="min-h-screen bg-gray-50" onKeyDown={handleKeyDown} tabIndex={-1}>
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
        {/* Left: Customer & Equipment Search */}
        <div className="w-1/3 border-r bg-white overflow-y-auto flex flex-col">
          {selectedCustomer ? (
            <>
              <div className="p-4 space-y-4 flex-1 overflow-y-auto">
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
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedCustomer.creditHold && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                    <strong>Credit Hold:</strong> {selectedCustomer.creditHoldReason}
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="text-xs font-semibold text-gray-700 mb-3">Add Equipment</div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      ref={searchRef}
                      placeholder="Search equipment... (Ctrl+K)"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {equipment
                      .filter(e => 
                        e.status === 'available' && 
                        e.location === branch &&
                        e.name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .slice(0, 20)
                      .map(e => (
                        <button
                          key={e.id}
                          onClick={() => {
                            handleAddToCart(e);
                            setSearchTerm('');
                          }}
                          className="w-full text-left p-2 rounded hover:bg-indigo-50 text-xs border border-transparent hover:border-indigo-300 transition group"
                        >
                          <div className="font-medium text-gray-900 group-hover:text-indigo-700">{e.name}</div>
                          <div className="text-gray-500">${e.dailyRate}/day</div>
                        </button>
                      ))}
                    {searchTerm && equipment.filter(e => 
                      e.status === 'available' && 
                      e.location === branch &&
                      e.name?.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-3">No equipment found</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Change Customer
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
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
              {dlScanResult && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                <ScanLine className="w-3.5 h-3.5 flex-shrink-0" />
                <span>DL scanned: <strong>{dlScanResult.fullName}</strong> — select or create below</span>
                <button onClick={() => setDlScanResult(null)} className="ml-auto text-green-600 hover:text-green-900"><X className="w-3 h-3" /></button>
              </div>
            )}
            <CustomerSearchPanel
              searchTerm={searchTerm}
              customers={customers}
              scannedDL={dlScanResult}
              onSelect={(c) => {
                setSelectedCustomer(c);
                setSearchTerm('');
                setDlScanResult(null);
              }}
            />
            </div>
          )}
        </div>

        {/* Right: Equipment or Cart */}
        {!selectedCustomer ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-center p-4">
            <div>
              <div className="text-lg font-medium mb-2">Select a customer to start</div>
              <div className="text-sm text-gray-400">Search on the left to find or create</div>
            </div>
          </div>
        ) : (
          <RentalCartPanel
            cart={cart}
            customer={selectedCustomer}
            branch={branch}
            branchSettings={branchSettings}
            companySettings={companySettings}
            allEquipment={equipment}
            onRemoveItem={handleRemoveFromCart}
            onCompleteRental={handleCompleteRental}
          />
        )}
      </div>
    </div>
  );
}