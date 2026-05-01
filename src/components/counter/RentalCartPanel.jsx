import { useState, useMemo, useEffect } from 'react';
import { Trash2, DollarSign, Loader2, Check, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AvailabilityCheck from './AvailabilityCheck';
import BundleNudges from './BundleNudges';
import DiscountCalc from './DiscountCalc';
import SignaturePad from './SignaturePad';

export default function RentalCartPanel({
  cart,
  customer,
  branch,
  branchSettings,
  companySettings,
  allEquipment,
  onRemoveItem,
  onCompleteRental,
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
    // Duration discount
    if (days >= 7) amount = Math.max(amount, subtotal * 0.15);
    // Promo code
    if (promoCode) {
      const promo = promoCodes.find(p => p.code.toLowerCase() === promoCode.toLowerCase() && p.active);
      if (promo) {
        const promoDisc = promo.discountType === 'percent'
          ? (subtotal * promo.discountValue / 100)
          : promo.discountValue;
        amount = Math.max(amount, promoDisc);
      }
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
      const invoice = await base44.functions.invoke('createRental', {
        customerId: customer.id,
        customerName: customer.fullName,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        customerCity: customer.city,
        customerState: customer.state,
        customerZip: customer.zip,
        items: cart.map(item => ({
          equipmentId: item.id,
          equipmentName: item.name,
        })),
        startDate,
        endDate,
        totalDays: days,
        baseAmount: subtotal,
        discountAmount,
        taxAmount: tax,
        deposit,
        branch,
        paymentMethod,
        signatureDataUrl: signature,
        sendEmail,
        sendSMS,
        deliveryMethod: 'customer_pickup',
        returnMethod: 'company_pickup',
      });

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