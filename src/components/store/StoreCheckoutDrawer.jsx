import { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, CheckCircle2, Loader2, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const today = () => new Date().toISOString().split('T')[0];
const addDays = (d, n) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
};

function calcDays(start, end) {
  if (!start || !end) return 0;
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.round(diff) + 1);
}

function calcPrice(equipment, days) {
  if (days >= 30 && equipment.monthlyRate) return { rate: equipment.monthlyRate, label: 'monthly rate', total: equipment.monthlyRate * Math.ceil(days / 30) };
  if (days >= 7 && equipment.weeklyRate) return { rate: equipment.weeklyRate, label: 'weekly rate', total: equipment.weeklyRate * Math.ceil(days / 7) };
  return { rate: equipment.dailyRate, label: 'daily rate', total: equipment.dailyRate * days };
}

// ─── Stripe Card Element loader ──────────────────────────────────────────────
function StripeCardStep({ equipment, days, pricing, deposit, delivery, startDate, endDate, currentUser, onSuccess, onBack }) {
  const cardRef = useRef(null);
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [publishableKey, setPublishableKey] = useState('');
  const [customerName, setCustomerName] = useState(currentUser?.full_name || '');
  const [customerEmail, setCustomerEmail] = useState(currentUser?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [loadingKeys, setLoadingKeys] = useState(true);
  const grandTotal = pricing.total + deposit;

  // Load publishable key from PaymentSettings
  useEffect(() => {
    base44.entities.PaymentSettings && base44.entities.PaymentSettings.list().then(rows => {
      if (rows.length > 0 && rows[0].stripePublishableKey) {
        setPublishableKey(rows[0].stripePublishableKey);
      }
      setLoadingKeys(false);
    }).catch(() => setLoadingKeys(false));
  }, []);

  // Mount Stripe Elements once publishable key is loaded
  useEffect(() => {
    if (!publishableKey || !cardRef.current) return;
    if (stripe) return; // already mounted

    const script = document.getElementById('stripe-js');
    const mount = () => {
      const s = window.Stripe(publishableKey);
      const els = s.elements();
      const card = els.create('card', {
        style: {
          base: {
            fontSize: '15px',
            color: '#1f2937',
            fontFamily: 'Inter, sans-serif',
            '::placeholder': { color: '#9ca3af' },
          },
          invalid: { color: '#ef4444' },
        },
      });
      card.mount(cardRef.current);
      card.on('change', e => setError(e.error ? e.error.message : ''));
      setStripe(s);
      setElements(els);
      setCardElement(card);
    };

    if (window.Stripe) {
      mount();
    } else {
      // Load Stripe.js dynamically
      const s = document.createElement('script');
      s.id = 'stripe-js';
      s.src = 'https://js.stripe.com/v3/';
      s.onload = mount;
      document.head.appendChild(s);
    }
  }, [publishableKey, cardRef.current]);

  const handleSubmit = async () => {
    if (!stripe || !cardElement) return;
    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please enter your name and email.');
      return;
    }
    setError('');
    setProcessing(true);

    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { name: customerName, email: customerEmail, phone: customerPhone || undefined },
    });

    if (pmError) {
      setError(pmError.message);
      setProcessing(false);
      return;
    }

    const res = await base44.functions.invoke('storeCreateReservation', {
      paymentMethodId: paymentMethod.id,
      equipment: { id: equipment.id, name: equipment.name },
      startDate,
      endDate,
      days,
      totalAmount: grandTotal,
      delivery,
      customerName,
      customerEmail,
      customerPhone,
    });

    if (res.data?.error) {
      setError(res.data.error);
      setProcessing(false);
      return;
    }

    onSuccess({ customerName, customerEmail, rentalId: res.data?.rentalId });
  };

  if (loadingKeys) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <div className="text-sm">Loading payment options…</div>
      </div>
    );
  }

  if (!publishableKey) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <div className="font-semibold mb-1">Payment not yet configured</div>
          <p>Online payments are being set up. Click below to submit your reservation request and our team will contact you to arrange payment.</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Equipment</span><span className="font-medium">{equipment.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Dates</span><span className="font-medium">{startDate} → {endDate}</span></div>
          <div className="flex justify-between font-bold border-t pt-2"><span>Estimated Total</span><span className="text-orange-600">${grandTotal.toFixed(2)}</span></div>
        </div>
        <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Your full name" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="Email address" type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={async () => {
            if (!customerName.trim() || !customerEmail.trim()) { setError('Please enter your name and email.'); return; }
            setProcessing(true);
            const res = await base44.functions.invoke('storeCreateReservation', {
              paymentMethodId: null,
              equipment: { id: equipment.id, name: equipment.name },
              startDate, endDate, days, totalAmount: grandTotal, delivery, customerName, customerEmail, customerPhone,
            });
            setProcessing(false);
            if (res.data?.error && !res.data?.rentalId) { setError(res.data.error); return; }
            onSuccess({ customerName, customerEmail, rentalId: res.data?.rentalId });
          }}
          disabled={processing}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
        >
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {processing ? 'Submitting…' : 'Request Reservation →'}
        </button>
        <button onClick={onBack} className="w-full text-gray-400 text-sm text-center hover:text-gray-600 transition">← Back</button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Order mini-summary */}
      <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center text-sm">
        <div>
          <div className="font-medium text-gray-900">{equipment.name}</div>
          <div className="text-xs text-gray-400">{startDate} → {endDate} · {days} day{days !== 1 ? 's' : ''}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-orange-600">${grandTotal.toFixed(2)}</div>
          <div className="text-xs text-gray-400">{pricing.label}</div>
        </div>
      </div>

      {/* Customer info */}
      <div className="space-y-2.5">
        <input
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          placeholder="Full name"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          value={customerEmail}
          onChange={e => setCustomerEmail(e.target.value)}
          placeholder="Email address"
          type="email"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)}
          placeholder="Phone (optional)"
          type="tel"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* Stripe card element */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2">
          <CreditCard className="w-3.5 h-3.5" /> Card Details
        </label>
        <div
          ref={cardRef}
          className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white focus-within:ring-2 focus-within:ring-orange-400 transition"
        />
        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      </div>

      {/* $1 auth notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2.5 items-start">
        <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800">
          <span className="font-semibold">$1.00 card verification hold</span> — We place a temporary $1 authorization to confirm your card is valid. This hold is <span className="font-semibold">not a charge</span> and releases automatically within 7 days. Final payment is arranged separately.
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={processing || !stripe}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-orange-200"
      >
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        {processing ? 'Processing…' : `Confirm Reservation · $1.00 hold`}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <Lock className="w-3 h-3" /> Secured by Stripe · SSL encrypted
      </div>

      <button onClick={onBack} className="w-full text-gray-400 text-sm text-center hover:text-gray-600 transition">← Back to review</button>
    </div>
  );
}

// ─── Main Drawer ─────────────────────────────────────────────────────────────
export default function StoreCheckoutDrawer({ equipment, currentUser, onClose }) {
  const [startDate, setStartDate] = useState(addDays(today(), 1));
  const [endDate, setEndDate] = useState(addDays(today(), 2));
  const [delivery, setDelivery] = useState('pickup');
  const [step, setStep] = useState('dates'); // dates | review | payment | confirmed
  const [confirmedData, setConfirmedData] = useState(null);

  const days = calcDays(startDate, endDate);
  const pricing = calcPrice(equipment, days);
  const deposit = equipment.depositRequired || 0;
  const grandTotal = pricing.total + deposit;

  const stepLabel = { dates: 'Select your rental dates', review: 'Review your order', payment: 'Secure checkout', confirmed: 'Reservation confirmed!' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="font-bold text-gray-900">{equipment.name}</div>
            <div className="text-xs text-gray-400">{stepLabel[step]}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {/* STEP: Dates */}
        {step === 'dates' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pick-up Date</label>
                <input type="date" value={startDate} min={addDays(today(), 1)}
                  onChange={e => { setStartDate(e.target.value); if (e.target.value >= endDate) setEndDate(addDays(e.target.value, 1)); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Return Date</label>
                <input type="date" value={endDate} min={addDays(startDate, 1)}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
              <div className="text-sm text-orange-800 font-medium">{days} day{days !== 1 ? 's' : ''} rental</div>
              <div className="text-sm font-bold text-orange-700">${pricing.total.toFixed(2)} <span className="font-normal text-xs text-orange-500">({pricing.label})</span></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">How will you get the equipment?</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:border-orange-300 transition">
                  <input type="radio" name="delivery" value="pickup" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} className="accent-orange-500" />
                  <div><div className="text-sm font-medium text-gray-800">I'll pick it up</div><div className="text-xs text-gray-400">No delivery fee</div></div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:border-orange-300 transition">
                  <input type="radio" name="delivery" value="delivery" checked={delivery === 'delivery'} onChange={() => setDelivery('delivery')} className="accent-orange-500" />
                  <div><div className="text-sm font-medium text-gray-800">Deliver to my site</div><div className="text-xs text-gray-400">Fee calculated at checkout</div></div>
                </label>
              </div>
            </div>
            <button onClick={() => setStep('review')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition">
              Review Order <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP: Review */}
        {step === 'review' && (
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-600">Equipment</span><span className="font-medium">{equipment.name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Dates</span><span className="font-medium">{startDate} → {endDate}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Duration</span><span className="font-medium">{days} day{days !== 1 ? 's' : ''}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">Rental ({pricing.label})</span><span className="font-medium">${pricing.total.toFixed(2)}</span></div>
              {deposit > 0 && <div className="flex justify-between text-sm"><span className="text-gray-600">Security Deposit</span><span className="font-medium">${deposit.toFixed(2)}</span></div>}
              {delivery === 'delivery' && <div className="flex justify-between text-sm"><span className="text-gray-600">Delivery Fee</span><span className="text-gray-400 text-xs">Calculated at checkout</span></div>}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Estimated Total</span>
                <span className="text-orange-600">${grandTotal.toFixed(2)}{delivery === 'delivery' ? ' + delivery' : ''}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('dates')} className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-2xl hover:bg-gray-50 transition">Edit Dates</button>
              <button onClick={() => setStep('payment')} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition">
                Pay & Confirm <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP: Payment */}
        {step === 'payment' && (
          <StripeCardStep
            equipment={equipment}
            days={days}
            pricing={pricing}
            deposit={deposit}
            delivery={delivery}
            startDate={startDate}
            endDate={endDate}
            currentUser={currentUser}
            onSuccess={(data) => { setConfirmedData(data); setStep('confirmed'); }}
            onBack={() => setStep('review')}
          />
        )}

        {/* STEP: Confirmed */}
        {step === 'confirmed' && (
          <div className="p-5 space-y-4">
            <div className="text-center py-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <div className="font-bold text-gray-900 text-xl mb-2">Reservation Confirmed!</div>
              <p className="text-sm text-gray-600 mb-1">
                Hi <span className="font-semibold">{confirmedData?.customerName}</span>! Your reservation for <span className="font-semibold">{equipment.name}</span> is confirmed.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                A confirmation has been sent to <span className="font-semibold">{confirmedData?.customerEmail}</span>.<br />
                Your card was verified with a $1 hold (not a charge) — it will release automatically.
              </p>
              {confirmedData?.rentalId && (
                <div className="mt-3 inline-block bg-gray-100 rounded-lg px-3 py-1 text-xs text-gray-500 font-mono">
                  Reservation #{confirmedData.rentalId.slice(-8).toUpperCase()}
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}