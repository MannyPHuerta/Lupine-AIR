import { useState, useMemo, useEffect } from 'react';
import { Trash2, DollarSign, Loader2, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import SignaturePad from './SignaturePad';
import { openInvoiceWindow, writeInvoiceToWindow } from '@/lib/buildInvoiceHTML';

export default function RentalCartPanel({
  cart,
  customer,
  branch,
  branchSettings,
  companySettings,
  allEquipment,
  onRemoveItem,
  onCompleteRental,
  practiceMode = false,
}) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [signature, setSignature] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('customer_pickup');
  const [returnMethod, setReturnMethod] = useState('customer_return');

  const days = useMemo(() => {
    const d = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000);
    return Math.max(d, 1);
  }, [startDate, endDate]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      let rate = item.dailyRate || 0;
      if (days >= 30 && item.monthlyRate) rate = item.monthlyRate / 30;
      else if (days >= 7 && item.weeklyRate) rate = item.weeklyRate / 7;
      return sum + (rate * days);
    }, 0);
  }, [cart, days]);

  const TAX_RATE = 0.0825;
  const deposit = cart.reduce((sum, item) => sum + (item.depositRequired || 0), 0);
  const tax = subtotal * TAX_RATE;
  // Total due = rental + tax. Deposit is collected separately and returned.
  const totalDue = subtotal + tax;
  const paid = parseFloat(amountPaid) || 0;
  const balance = totalDue - paid;

  const handleComplete = async () => {
    if (!signature) {
      alert('Signature required');
      return;
    }

    setCompleting(true);
    try {
      const totalDays = days;
      let invoiceNumber = 'PRACTICE-' + Date.now();
      const createdIds = [];

      if (!practiceMode) {
        // Fetch and increment invoice number
        const branchSettingsList = await base44.entities.BranchSettings.filter({ branch });
        const bs = branchSettingsList[0];
        if (bs) {
          const num = bs.nextInvoiceNumber || 1000;
          invoiceNumber = `${bs.invoicePrefix || ''}-${String(num).padStart(4, '0')}`;
          await base44.entities.BranchSettings.update(bs.id, { nextInvoiceNumber: num + 1 });
        }

        for (const item of cart) {
          const itemRate = (() => {
            if (days >= 30 && item.monthlyRate) return item.monthlyRate / 30;
            if (days >= 7 && item.weeklyRate) return item.weeklyRate / 7;
            return item.dailyRate || 0;
          })();
          const itemBase = itemRate * days;
          const itemTax = itemBase * TAX_RATE;
          const rental = await base44.entities.Rental.create({
            equipmentId: item.id,
            equipmentName: item.name,
            startDate,
            endDate,
            totalDays,
            customerName: customer.fullName,
            customerEmail: customer.email || '',
            customerPhone: customer.phone || '',
            customerId: customer.id !== 'walkin' ? customer.id : null,
            branch,
            baseAmount: itemBase,
            taxRate: TAX_RATE,
            taxAmount: itemTax,
            deposit: item.depositRequired || 0,
            amountPaid: paid,
            invoiceNumber,
            status: 'contract',
            deliveryMethod,
            returnMethod,
            signatureDataUrl: signature,
          });
          createdIds.push(rental.id);
        }
      }

      // Build and print invoice
      const invoiceOrder = {
        id: invoiceNumber,
        createdAt: new Date().toISOString(),
        taxRate: TAX_RATE * 100,
        discount: 0,
        autoDiscount: 0,
        paymentMethod,
        deliveryMethod,
        returnMethod,
        customer: { name: customer.fullName, phone: customer.phone || '', email: customer.email || '', branch },
        branchInfo: branchSettings
          ? { name: branchSettings.branch, address: branchSettings.address || '', phone: branchSettings.phone || '', email: branchSettings.email || '' }
          : { name: branch, address: '', phone: '', email: '' },
        companyInfo: companySettings
          ? { companyName: companySettings.companyName || '', logoUrl: companySettings.logoUrl || '', invoiceFooter: companySettings.invoiceFooter || '' }
          : {},
        lines: cart.map(item => {
          const rate = (() => {
            if (days >= 30 && item.monthlyRate) return item.monthlyRate / 30;
            if (days >= 7 && item.weeklyRate) return item.weeklyRate / 7;
            return item.dailyRate || 0;
          })();
          return {
            equipmentId: item.id,
            equipmentName: item.name,
            quantity: 1,
            rate,
            baseAmount: rate * days,
            taxable: item.taxable !== false,
            deposit: item.depositRequired || 0,
            startDate,
            endDate,
          };
        }),
      };

      const win = openInvoiceWindow();
      writeInvoiceToWindow(win, invoiceOrder, paid, signature, practiceMode);

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
          <div className="text-sm">Add equipment to build order</div>
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
            <div key={item.lineId} className="bg-white rounded border p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  ${(item.dailyRate || 0).toFixed(2)}/day × {days} day{days !== 1 ? 's' : ''} = <strong>${((item.dailyRate || 0) * days).toFixed(2)}</strong>
                </div>
              </div>
              <button onClick={() => onRemoveItem(item.lineId)} className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Start Date</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-xs" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">End Date</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-xs" />
          </div>
        </div>

        {/* Delivery & Return */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Delivery</label>
            <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value)} className="w-full h-8 border border-input rounded px-2 text-xs bg-white">
              <option value="customer_pickup">Customer Pickup</option>
              <option value="company_delivery">Company Delivery</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Return</label>
            <select value={returnMethod} onChange={e => setReturnMethod(e.target.value)} className="w-full h-8 border border-input rounded px-2 text-xs bg-white">
              <option value="customer_return">Customer Return</option>
              <option value="company_pickup">Company Pickup</option>
              <option value="customer_ships">Customer Ships</option>
            </select>
          </div>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-xs bg-white border rounded p-3">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal ({days} day{days !== 1 ? 's' : ''})</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Tax (8.25%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="border-t pt-1 mt-1 flex justify-between font-bold text-sm text-gray-900">
            <span>Total Due</span>
            <span className="text-indigo-600">${totalDue.toFixed(2)}</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-amber-700 text-xs pt-1 border-t mt-1">
              <span>Deposit (collected separately)</span>
              <span>${deposit.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Payment Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full h-8 border border-input rounded px-2 text-xs bg-white">
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Check">Check</option>
              <option value="Net 30">Net 30</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Amount Paid</label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                placeholder={totalDue.toFixed(2)}
                className="text-xs"
              />
            </div>
            {paid > 0 && (
              <div className={`text-xs mt-1 font-medium ${balance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Balance: ${balance.toFixed(2)}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAmountPaid(totalDue.toFixed(2))}
          className="text-xs text-indigo-600 underline"
        >
          Apply full amount
        </button>

        {/* Signature */}
        <SignaturePad onSignatureCapture={setSignature} />

        {/* Complete */}
        <Button
          onClick={handleComplete}
          disabled={completing || completed || !signature}
          className={`w-full gap-2 h-11 text-sm font-bold ${completed ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {completing ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
            : completed ? <><Check className="w-4 h-4" /> Done!</>
            : <><DollarSign className="w-4 h-4" /> Complete Rental &amp; Print</>}
        </Button>
      </div>
    </div>
  );
}