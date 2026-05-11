/**
 * ⚠️ CRITICAL INVOICE COMPONENT
 * DO NOT MODIFY WITHOUT DISCUSSION
 * 
 * This is the main checkout panel that ties together:
 * - Cart management and item removal
 * - Promo codes and discounts
 * - Signature capture and final rental creation
 * - Communication preferences (email/SMS)
 * 
 * This is the final step in the counter app workflow.
 * Before editing: discuss with the team first.
 */

import { useState, useMemo, useEffect } from 'react';
import { Trash2, DollarSign, Loader2, Check, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AvailabilityCheck from './AvailabilityCheck';
import BundleNudges from './BundleNudges';
import DiscountCalc from './DiscountCalc';
import SignaturePad from './SignaturePad';
import PromoNudge from './PromoNudge';
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
  const [promoCode, setPromoCode] = useState('');
  const [signature, setSignature] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(customer?.smsOptIn || false);
  const [promoCodes, setPromoCodes] = useState([]);
  const [volumeRules, setVolumeRules] = useState([]);
  const [deliveryMethod, setDeliveryMethod] = useState('customer_pickup');
  const [returnMethod, setReturnMethod] = useState('customer_return');
  const [worksiteAddress, setWorksiteAddress] = useState('');
  const [worksiteCity, setWorksiteCity] = useState('');
  const [worksiteState, setWorksiteState] = useState('TX');
  const [worksiteZip, setWorksiteZip] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.PromoCode.list(),
      base44.entities.VolumeDiscountRule.list(),
    ]).then(([pc, vr]) => {
      setPromoCodes(pc);
      setVolumeRules(vr);
    });
  }, []);

  const days = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / 86400000);
  }, [startDate, endDate]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      let rate = item.dailyRate;
      if (days >= 7 && item.weeklyRate) rate = item.weeklyRate;
      if (days >= 30 && item.monthlyRate) rate = item.monthlyRate;
      return sum + (rate * days);
    }, 0);
  }, [cart, days]);

  const discountAmount = useMemo(() => {
    // If promo code entered, use that exclusively
    if (promoCode) {
      const promo = promoCodes.find(p => p.code.toLowerCase() === promoCode.toLowerCase() && p.active);
      if (promo) {
        return promo.discountType === 'percent'
          ? (subtotal * promo.discountValue / 100)
          : promo.discountValue;
      }
      return 0;
    }

    // Otherwise, pick best auto-discount (volume or duration)
    let amount = 0;
    
    // Volume discount
    volumeRules.forEach(rule => {
      const qty = cart.filter(c => c.category === rule.category || c.id === rule.equipmentId).length;
      if (qty >= rule.minimumQuantity) {
        const disc = rule.discountType === 'percent'
          ? (subtotal * rule.discountValue / 100)
          : (rule.discountValue * qty);
        amount = Math.max(amount, disc);
      }
    });

    // Duration discount (7+ days = 10%, 30+ days = 15%)
    if (days >= 30) {
      amount = Math.max(amount, subtotal * 0.15);
    } else if (days >= 7) {
      amount = Math.max(amount, subtotal * 0.10);
    }

    return amount;
  }, [subtotal, days, cart, promoCode, promoCodes, volumeRules]);

  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * 0.0825;
  const deposit = cart.reduce((sum, item) => sum + (item.depositRequired || 0), 0);
  const total = afterDiscount + tax;

  const handleComplete = async () => {
    if (!signature) {
      alert('Signature required');
      return;
    }

    setCompleting(true);
    try {
      const taxRateDecimal = 0.0825;
      const totalDays = days;
      let invoiceNumber = 'PRACTICE' + Date.now();
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

        // Create one rental record per cart item
        for (const item of cart) {
          const itemBase = item.dailyRate * days;
          const itemTax = itemBase * taxRateDecimal;
          const rental = await base44.entities.Rental.create({
            equipmentId: item.id,
            equipmentName: item.name,
            startDate,
            endDate,
            totalDays,
            customerName: customer.fullName,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            customerAddress: customer.address,
            customerCity: customer.city,
            customerState: customer.state,
            customerZip: customer.zip,
            customerId: customer.id,
            branch,
            baseAmount: itemBase,
            taxRate: taxRateDecimal,
            taxAmount: itemTax,
            deposit: item.depositRequired || 0,
            amountPaid: itemBase + itemTax,
            invoiceNumber,
            status: 'contract',
            deliveryMethod,
            returnMethod,
            worksiteAddress: deliveryMethod === 'company_delivery' ? worksiteAddress : '',
            worksiteCity: deliveryMethod === 'company_delivery' ? worksiteCity : '',
            worksiteState: deliveryMethod === 'company_delivery' ? worksiteState : '',
            worksiteZip: deliveryMethod === 'company_delivery' ? worksiteZip : '',
            signatureDataUrl: signature,
          });
          createdIds.push(rental.id);
        }

        // Send confirmation if applicable
        if (sendEmail && customer.email) {
          base44.functions.invoke('sendRentalConfirmation', {
            rentalIds: createdIds,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            invoiceNumber,
            autoSendCommunications: true,
          }).catch(() => {});
        }
      }

      // Build and print invoice for both real and practice modes
      const invoiceOrder = {
        id: invoiceNumber,
        createdAt: new Date().toISOString(),
        taxRate: taxRateDecimal * 100,
        discount: discountAmount,
        autoDiscount: 0,
        paymentMethod,
        deliveryMethod,
        returnMethod,
        customer: { name: customer.fullName, phone: customer.phone, email: customer.email, branch },
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
          rate: item.dailyRate,
          baseAmount: item.dailyRate * days,
          taxable: item.taxable !== false,
          deposit: item.depositRequired || 0,
          startDate,
          endDate,
        })),
      };

      const win = openInvoiceWindow();
      writeInvoiceToWindow(win, invoiceOrder, total, signature, practiceMode);

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
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Items */}
        <div className="space-y-2">
          {cart.map(item => (
            <div key={item.lineId} className="bg-white rounded border p-3 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{item.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  ${item.dailyRate}/day × {days} days = <strong>${(item.dailyRate * days).toFixed(2)}</strong>
                </div>
              </div>
              <button
                onClick={() => onRemoveItem(item.lineId)}
                className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Delivery & Return Method */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Delivery</label>
            <select
              value={deliveryMethod}
              onChange={e => setDeliveryMethod(e.target.value)}
              className="w-full h-8 border border-input rounded px-2 text-xs bg-white"
            >
              <option value="customer_pickup">Customer Pickup</option>
              <option value="company_delivery">Company Delivery</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Return</label>
            <select
              value={returnMethod}
              onChange={e => setReturnMethod(e.target.value)}
              className="w-full h-8 border border-input rounded px-2 text-xs bg-white"
            >
              <option value="customer_return">Customer Return</option>
              <option value="company_pickup">Company Pickup</option>
              <option value="customer_ships">Customer Ships</option>
            </select>
          </div>
        </div>

        {/* Worksite Address (only when company delivery selected) */}
        {deliveryMethod === 'company_delivery' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <div className="text-xs font-semibold text-amber-800">📍 Delivery / Worksite Address</div>
            <div className="text-xs text-amber-700 mb-1">Leave blank to use customer's home address on file.</div>
            <Input
              placeholder="Street address"
              value={worksiteAddress}
              onChange={e => setWorksiteAddress(e.target.value)}
              className="text-xs h-8"
            />
            <div className="grid grid-cols-3 gap-1">
              <Input
                placeholder="City"
                value={worksiteCity}
                onChange={e => setWorksiteCity(e.target.value)}
                className="text-xs h-8 col-span-1"
              />
              <Input
                placeholder="ST"
                value={worksiteState}
                onChange={e => setWorksiteState(e.target.value)}
                className="text-xs h-8"
                maxLength={2}
              />
              <Input
                placeholder="ZIP"
                value={worksiteZip}
                onChange={e => setWorksiteZip(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Start</label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">End</label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Availability Check */}
        {allEquipment && <AvailabilityCheck cart={cart} startDate={startDate} endDate={endDate} allEquipment={allEquipment} />}

        {/* Bundle Suggestions */}
        {<BundleNudges cart={cart} startDate={startDate} endDate={endDate} onAddBundle={(item) => console.log('Bundle not implemented yet')} />}

        {/* Promo Nudge */}
        <PromoNudge
          allPromoCodes={promoCodes}
          currentPromo={promoCode}
          onApplyPromo={setPromoCode}
          subtotal={subtotal}
        />

        {/* Discounts */}
        <DiscountCalc
          subtotal={subtotal}
          days={days}
          cart={cart}
          promoCode={promoCode}
          onPromoChange={setPromoCode}
          allPromoCodes={promoCodes}
          allVolumeRules={volumeRules}
        />

        {/* Pricing Summary */}
        <div className="space-y-1 text-xs bg-gray-50 p-3 rounded border">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-700 font-medium">
              <span>Discount</span>
              <span>-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          {deposit > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>Deposit</span>
              <span>${deposit.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-1 mt-1 flex justify-between font-bold text-gray-900">
            <span>Total Due</span>
            <span className="text-indigo-600">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={e => setPaymentMethod(e.target.value)}
            className="w-full h-8 border border-input rounded px-2 text-xs bg-white"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="check">Check</option>
            <option value="account">Account (Net 30)</option>
          </select>
        </div>

        {/* Communication Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={e => setSendEmail(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            <Mail className="w-3.5 h-3.5 text-gray-600" />
            Send confirmation email
          </label>
          {customer?.smsOptIn && (
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={sendSMS}
                onChange={e => setSendSMS(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <Phone className="w-3.5 h-3.5 text-gray-600" />
              Send return reminder SMS
            </label>
          )}
        </div>

        {/* Signature */}
        <SignaturePad onSignatureCapture={setSignature} />

        {/* Complete Button */}
        <Button
          onClick={handleComplete}
          disabled={completing || completed || !signature}
          className={`w-full gap-2 ${completed ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {completing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Creating…
            </>
          ) : completed ? (
            <>
              <Check className="w-4 h-4" /> Done!
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4" /> Complete Rental
            </>
          )}
        </Button>
      </div>
    </div>
  );
}