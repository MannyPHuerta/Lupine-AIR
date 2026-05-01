import { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CustomerSearchPanel from '@/components/counter/CustomerSearchPanel';
import EquipmentLineItem from '@/components/invoice/EquipmentLineItem';
import InvoiceTotals from '@/components/invoice/InvoiceTotals';
import SignaturePad from '@/components/counter/SignaturePad';

export default function Counter() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const qtyRefs = useRef({});

  // Data
  const [equipment, setEquipment] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [branchSettings, setBranchSettings] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [promoCodes, setPromoCodes] = useState([]);
  const [volumeRules, setVolumeRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [lines, setLines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [branch, setBranch] = useState('01 McAllen');
  const [signature, setSignature] = useState(null);
  const [completing, setCompleting] = useState(false);

  // Invoice state
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(8.25);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [autoSend, setAutoSend] = useState(true);
  const [appliedPromo, setAppliedPromo] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Equipment.list('-updated_date', 500),
      base44.entities.Customer.list('-updated_date', 500),
      base44.entities.Rental.list('-created_date', 200),
      base44.entities.BranchSettings.list(),
      base44.entities.CompanySettings.list(),
      base44.entities.PromoCode.list(),
      base44.entities.VolumeDiscountRule.list(),
    ]).then(([eq, cust, rent, bs, cs, pc, vr]) => {
      setEquipment(eq);
      setCustomers(cust);
      setRentals(rent);
      setBranchSettings(bs[0]);
      setCompanySettings(cs[0]);
      setPromoCodes(pc);
      setVolumeRules(vr);
      setLoading(false);
    });

    setTimeout(() => searchRef.current?.focus(), 100);
  }, []);

  const handleAddLine = () => {
    setLines([...lines, { lineId: Math.random() }]);
  };

  const handleUpdateLine = (lineId, updated) => {
    setLines(lines.map(l => l.lineId === lineId ? { ...updated, lineId } : l));
  };

  const handleRemoveLine = (lineId) => {
    setLines(lines.filter(l => l.lineId !== lineId));
  };

  const handleClearCart = () => {
    setLines([]);
    setSelectedCustomer(null);
    setSearchTerm('');
    setSignature(null);
    setDiscount(0);
    setTaxRate(8.25);
    setAmountPaid(0);
    setAppliedPromo(null);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleComplete = async () => {
    if (!signature) {
      alert('Signature required');
      return;
    }

    setCompleting(true);
    try {
      const rental = await base44.functions.invoke('createRental', {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.fullName,
        customerEmail: selectedCustomer.email,
        customerPhone: selectedCustomer.phone,
        customerAddress: selectedCustomer.address,
        customerCity: selectedCustomer.city,
        customerState: selectedCustomer.state,
        customerZip: selectedCustomer.zip,
        items: lines
          .filter(l => l.equipmentId)
          .map(l => ({
            equipmentId: l.equipmentId,
            equipmentName: l.equipmentName,
            quantity: l.quantity || 1,
            startDate: l.startDate,
            endDate: l.endDate,
            baseAmount: l.baseAmount || 0,
            deposit: l.deposit || 0,
          })),
        branch,
        discount: parseFloat(discount) || 0,
        taxRate: parseFloat(taxRate) || 8.25,
        paymentMethod,
        signatureDataUrl: signature,
        sendEmail: autoSend,
        sendSMS: autoSend && selectedCustomer.smsOptIn,
      });

      alert(`Rental created: ${rental.invoiceNumber}`);
      handleClearCart();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCompleting(false);
    }
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
        {/* Left: Customer */}
        <div className="w-1/3 border-r bg-white overflow-y-auto">
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

        {/* Right: Invoice */}
        {!selectedCustomer ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-center p-4">
            <div>
              <div className="text-lg font-medium mb-2">Select a customer to start</div>
              <div className="text-sm text-gray-400">Search on the left or create a new customer</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Line Items */}
            <div className="space-y-2">
              {lines.map((line, idx) => {
                if (!qtyRefs.current[line.lineId]) {
                  qtyRefs.current[line.lineId] = { current: null };
                }
                return (
                  <EquipmentLineItem
                    key={line.lineId}
                    line={line}
                    equipment={equipment}
                    rentals={rentals}
                    onUpdate={(updated) => handleUpdateLine(line.lineId, updated)}
                    onRemove={() => handleRemoveLine(line.lineId)}
                    qtyRef={qtyRefs.current[line.lineId]}
                    onAddLine={handleAddLine}
                  />
                );
              })}
            </div>

            {/* Add Line Button */}
            <Button
              onClick={handleAddLine}
              variant="outline"
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" /> Add Equipment
            </Button>

            {/* Pricing & Details */}
            {lines.length > 0 && (
              <div className="space-y-4">
                <InvoiceTotals
                  lines={lines.filter(l => l.equipmentId)}
                  discount={discount}
                  onDiscountChange={setDiscount}
                  taxRate={taxRate}
                  onTaxRateChange={setTaxRate}
                  amountPaid={amountPaid}
                  onAmountPaidChange={setAmountPaid}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  autoSendCommunications={autoSend}
                  onAutoSendChange={setAutoSend}
                  appliedPromo={appliedPromo}
                  onPromoApply={setAppliedPromo}
                  onPromoRemove={() => setAppliedPromo(null)}
                  equipment={equipment}
                  promoCodes={promoCodes}
                  volumeRules={volumeRules}
                />

                {/* Signature */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <SignaturePad onSignatureCapture={setSignature} />
                </div>

                {/* Complete Button */}
                <Button
                  onClick={handleComplete}
                  disabled={completing || !signature}
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg"
                >
                  {completing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    '✓ Complete Rental'
                  )}
                </Button>

                <Button
                  onClick={handleClearCart}
                  variant="outline"
                  className="w-full"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}