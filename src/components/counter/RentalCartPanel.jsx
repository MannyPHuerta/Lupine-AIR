import { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, DollarSign, Loader2, Check, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { openInvoiceWindow, writeInvoiceToWindow } from '@/lib/buildInvoiceHTML';
import DeliveryRecommendation from './DeliveryRecommendation';

export default function RentalCartPanel({
  cart,
  branch,
  branchSettings,
  companySettings,
  onRemoveItem,
  onCompleteRental,
  practiceMode = false,
}) {
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const paymentMethodRef = useRef(null);

  useEffect(() => {
    setTimeout(() => paymentMethodRef.current?.focus(), 100);
  }, []);
  const [showDelivery, setShowDelivery] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryAddress, setDeliveryAddress] = useState({ address: '', city: '', state: 'TX', zip: '' });

  const TAX_RATE = 0.0825;

  const subtotal = useMemo(() =>
    cart.reduce((sum, item) => sum + (item.dailyRate || 0), 0),
  [cart]);

  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const totalDue = Math.round((subtotal + tax + deliveryFee) * 100) / 100;
  const paid = parseFloat(amountPaid) || 0;
  const balance = Math.round((totalDue - paid) * 100) / 100;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      let invoiceNumber = 'PRACTICE-' + Date.now();
      const createdIds = [];

      if (!practiceMode) {
        const branchSettingsList = await base44.entities.BranchSettings.filter({ branch });
        const bs = branchSettingsList[0];
        if (bs) {
          const num = bs.nextInvoiceNumber || 1000;
          invoiceNumber = `${bs.invoicePrefix || ''}-${String(num).padStart(4, '0')}`;
          await base44.entities.BranchSettings.update(bs.id, { nextInvoiceNumber: num + 1 });
        }

        for (const item of cart) {
          const itemTax = (item.dailyRate || 0) * TAX_RATE;
          const rental = await base44.entities.Rental.create({
            equipmentId: item.id,
            equipmentName: item.name,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            totalDays: 1,
            customerName: 'Walk-in',
            branch,
            baseAmount: item.dailyRate || 0,
            taxRate: TAX_RATE,
            taxAmount: itemTax,
            deposit: 0,
            amountPaid: paid,
            invoiceNumber,
            status: 'completed',
            deliveryMethod: 'customer_pickup',
            returnMethod: 'customer_return',
          });
          createdIds.push(rental.id);
        }
      }

      // Print receipt
      const invoiceOrder = {
        id: invoiceNumber,
        createdAt: new Date().toISOString(),
        taxRate: TAX_RATE * 100,
        discount: 0,
        autoDiscount: 0,
        paymentMethod,
        isCounterSale: true,
        deliveryMethod: 'customer_pickup',
        returnMethod: 'customer_return',
        customer: { name: 'Walk-in', phone: '', email: '', branch },
        branchInfo: branchSettings
          ? { name: branchSettings.branch, address: branchSettings.address || '', phone: branchSettings.phone || '', email: branchSettings.email || '' }
          : { name: branch, address: '', phone: '', email: '' },
        companyInfo: companySettings
          ? { companyName: companySettings.companyName || '', logoUrl: companySettings.logoUrl || '', invoiceFooter: companySettings.invoiceFooter || '' }
          : {},
        lines: cart.map(item => ({
          equipmentId: item.id,
          equipmentName: item.name,
          quantity: 1,
          rate: item.dailyRate || 0,
          baseAmount: item.dailyRate || 0,
          taxable: item.taxable !== false,
          deposit: 0,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        })),
      };

      const win = openInvoiceWindow();
      writeInvoiceToWindow(win, invoiceOrder, paid, null, practiceMode);

      setCompleted(true);
      setTimeout(() => {
        onCompleteRental();
        setCompleted(false);
      }, 1500);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-center p-4">
        <div>
          <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div className="text-sm">Add consumable items from the left</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-4">

        {/* Cart items */}
        <div className="space-y-2">
          {cart.map(item => (
            <div key={item.lineId} className="bg-white rounded border p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">${(item.dailyRate || 0).toFixed(2)}</div>
              </div>
              <button onClick={() => onRemoveItem(item.lineId)} className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Delivery (optional) */}
        <div className="bg-white border rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-gray-700 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-indigo-500" /> Company Delivery?
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showDelivery}
                onChange={e => { setShowDelivery(e.target.checked); if (!e.target.checked) { setDeliveryFee(0); setDeliveryAddress({ address: '', city: '', state: 'TX', zip: '' }); }}}
                className="accent-indigo-600"
              />
              <span className="text-xs text-gray-600">Add delivery</span>
            </label>
          </div>
          {showDelivery && (
            <div className="space-y-1.5">
              <input
                className="w-full h-7 border border-input rounded px-2 text-xs bg-gray-50"
                placeholder="City"
                value={deliveryAddress.city}
                onChange={e => setDeliveryAddress(a => ({ ...a, city: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-1">
                <input
                  className="h-7 border border-input rounded px-2 text-xs bg-gray-50"
                  placeholder="State"
                  value={deliveryAddress.state}
                  onChange={e => setDeliveryAddress(a => ({ ...a, state: e.target.value }))}
                />
                <input
                  className="h-7 border border-input rounded px-2 text-xs bg-gray-50"
                  placeholder="ZIP"
                  value={deliveryAddress.zip}
                  onChange={e => setDeliveryAddress(a => ({ ...a, zip: e.target.value }))}
                />
              </div>
              <DeliveryRecommendation
                cartItems={cart}
                deliveryAddress={deliveryAddress}
                onAddDeliveryFee={(fee) => setDeliveryFee(fee)}
              />
              {deliveryFee > 0 && (
                <div className="flex items-center justify-between text-xs text-green-700">
                  <span>Delivery fee added</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">${deliveryFee.toFixed(2)}</span>
                    <button onClick={() => setDeliveryFee(0)} className="text-gray-400 hover:text-red-500 ml-1">✕</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-1 text-xs bg-white border rounded p-3">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Tax (8.25%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-1 mt-1 flex justify-between font-bold text-sm text-gray-900">
            <span>Total Due</span>
            <span className="text-indigo-600">${totalDue.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="space-y-1">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Payment Method</label>
              <select ref={paymentMethodRef} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full h-8 border border-input rounded px-2 text-xs bg-white">
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Check">Check</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => setAmountPaid(totalDue.toFixed(2))}
              className="h-8 text-xs font-semibold text-indigo-600 border border-indigo-300 rounded-md hover:bg-indigo-50 transition whitespace-nowrap"
            >
              Apply Exact
            </button>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Amount Paid</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder={totalDue.toFixed(2)}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm"
                />
              </div>
            </div>
          </div>
          {paid > 0 && (
            <div className={`text-xs font-medium text-center ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {balance <= 0 ? `Change: $${Math.abs(balance).toFixed(2)}` : `Balance: $${balance.toFixed(2)}`}
            </div>
          )}
        </div>

        {/* Complete */}
        <Button
          onClick={handleComplete}
          disabled={completing || completed}
          className={`w-full gap-2 h-11 text-sm font-bold ${completed ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {completing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            : completed ? <><Check className="w-4 h-4" /> Done!</>
            : <><DollarSign className="w-4 h-4" /> Complete Sale &amp; Print Receipt</>}
        </Button>

      </div>
    </div>
  );
}