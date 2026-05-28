import { useState } from 'react';
import { X, Calendar, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
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

export default function StoreCheckoutDrawer({ equipment, currentUser, onClose }) {
  const [startDate, setStartDate] = useState(addDays(today(), 1));
  const [endDate, setEndDate] = useState(addDays(today(), 2));
  const [delivery, setDelivery] = useState('pickup');
  const [step, setStep] = useState('dates'); // dates | review | login | confirmed
  const [loggingIn, setLoggingIn] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const days = calcDays(startDate, endDate);
  const pricing = calcPrice(equipment, days);
  const deposit = equipment.depositRequired || 0;
  const grandTotal = pricing.total + deposit;

  const handleSendMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoggingIn(true);
    try {
      // Store rental intent in sessionStorage so we can resume after login
      sessionStorage.setItem('storeRentalIntent', JSON.stringify({
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        startDate,
        endDate,
        delivery,
        days,
        total: grandTotal,
      }));
      await base44.functions.invoke('sendMagicLink', { email, redirectUrl: '/store' });
      setEmailSent(true);
    } catch (e) {
      setError('Could not send login link. Please try again.');
    }
    setLoggingIn(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <div className="font-bold text-gray-900">{equipment.name}</div>
            <div className="text-xs text-gray-400">{step === 'dates' ? 'Select your rental dates' : step === 'review' ? 'Review your order' : step === 'confirmed' ? 'Request submitted' : 'Sign in to continue'}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP: Dates */}
        {step === 'dates' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pick-up Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={addDays(today(), 1)}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (e.target.value >= endDate) setEndDate(addDays(e.target.value, 1));
                  }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Return Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={addDays(startDate, 1)}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Duration badge */}
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
              <div className="text-sm text-orange-800 font-medium">{days} day{days !== 1 ? 's' : ''} rental</div>
              <div className="text-sm font-bold text-orange-700">${pricing.total.toFixed(2)} <span className="font-normal text-xs text-orange-500">({pricing.label})</span></div>
            </div>

            {/* Delivery */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">How will you get the equipment?</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:border-orange-300 transition">
                  <input type="radio" name="delivery" value="pickup" checked={delivery === 'pickup'} onChange={() => setDelivery('pickup')} className="accent-orange-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">I'll pick it up</div>
                    <div className="text-xs text-gray-400">No delivery fee</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:border-orange-300 transition">
                  <input type="radio" name="delivery" value="delivery" checked={delivery === 'delivery'} onChange={() => setDelivery('delivery')} className="accent-orange-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">Deliver to my site</div>
                    <div className="text-xs text-gray-400">Fee calculated at checkout</div>
                  </div>
                </label>
              </div>
            </div>

            <button
              onClick={() => setStep('review')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
            >
              Review Order <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP: Review */}
        {step === 'review' && (
          <div className="p-5 space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Equipment</span>
                <span className="font-medium">{equipment.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Dates</span>
                <span className="font-medium">{startDate} → {endDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{days} day{days !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Rental ({pricing.label})</span>
                <span className="font-medium">${pricing.total.toFixed(2)}</span>
              </div>
              {deposit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Security Deposit</span>
                  <span className="font-medium">${deposit.toFixed(2)}</span>
                </div>
              )}
              {delivery === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-400 text-xs">Calculated at checkout</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total Due Today</span>
                <span className="text-orange-600">${grandTotal.toFixed(2)}{delivery === 'delivery' ? ' + delivery' : ''}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('dates')}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-3 rounded-2xl hover:bg-gray-50 transition"
              >
                Edit Dates
              </button>
              <button
                onClick={() => {
                  // If already logged in, skip login step
                  if (currentUser) {
                    setStep('confirmed');
                  } else {
                    setStep('login');
                  }
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP: Confirmed (logged-in users) */}
        {step === 'confirmed' && (
          <div className="p-5 space-y-4">
            <div className="text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
              <div className="font-bold text-gray-900 text-lg mb-1">Reservation Requested!</div>
              <p className="text-sm text-gray-500">
                Hi <span className="font-semibold">{currentUser?.full_name || currentUser?.email}</span>! Your request for <span className="font-semibold">{equipment.name}</span> ({days} day{days !== 1 ? 's' : ''}) has been received.
              </p>
              <p className="text-xs text-gray-400 mt-2">Our team will confirm availability and send payment details to <span className="font-semibold">{currentUser?.email}</span>.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition"
            >
              Done
            </button>
          </div>
        )}

        {/* STEP: Login */}
        {step === 'login' && (
          <div className="p-5 space-y-4">
            {emailSent ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
                <div className="font-bold text-gray-900 text-lg">Check your email!</div>
                <p className="text-sm text-gray-500">
                  We sent a magic sign-in link to <span className="font-semibold text-gray-700">{email}</span>.
                  Click it to complete your reservation.
                </p>
                <p className="text-xs text-gray-400 mt-2">Your rental details have been saved and will resume after you sign in.</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-2">
                  <div className="text-base font-semibold text-gray-900 mb-1">Sign in to complete your reservation</div>
                  <p className="text-sm text-gray-500">No password needed — we'll send you a secure login link.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    onKeyDown={e => e.key === 'Enter' && handleSendMagicLink()}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>

                <button
                  onClick={handleSendMagicLink}
                  disabled={loggingIn}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loggingIn ? 'Sending…' : 'Send Login Link'}
                </button>

                <button
                  onClick={() => setStep('review')}
                  className="w-full text-gray-500 text-sm text-center hover:text-gray-700 transition"
                >
                  ← Back to order review
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}