import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneCall, PhoneOff, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

// States: 'prompt' | 'calling' | 'success' | 'failed' | 'override'
export default function PhoneVerificationModal({ customer, onVerified, onFailed, onClose, currentUser }) {
  const [state, setState] = useState('prompt');
  const [callSid, setCallSid] = useState(null);
  const yesRef = useRef(null);

  useEffect(() => {
    // Auto-focus Yes button so Enter triggers it immediately
    setTimeout(() => yesRef.current?.focus(), 100);
  }, []);

  const handleCall = async () => {
    setState('calling');
    try {
      const result = await base44.functions.invoke('verifyCustomerPhone', {
        phoneNumber: customer.phone,
        customerId: customer.id,
        customerName: customer.fullName,
      });

      if (result.data?.error) throw new Error(result.data.error);

      setCallSid(result.data.callSid);
      // Poll for a few seconds then ask counter person to confirm
      setTimeout(() => setState('awaiting'), 8000);
    } catch (err) {
      console.error('Call failed:', err);
      setState('failed');
      logOutcome('call_error', err.message);
    }
  };

  const handleConfirmSuccess = async () => {
    await logOutcome('verified', 'Customer pressed 1 — verified by counter staff');
    // Update customer record
    await base44.entities.Customer.update(customer.id, {
      phone: customer.phone, // ensure saved
    }).catch(() => {});
    setState('success');
    setTimeout(() => onVerified(), 1200);
  };

  const handleConfirmFailed = async () => {
    await logOutcome('no_answer', 'Customer did not confirm — no answer or wrong number');
    setState('failed');
  };

  const handleProceedAnyway = async () => {
    await logOutcome('override', `Counter staff overrode failed verification — ${currentUser?.email || 'unknown'}`);
    onFailed({ override: true, by: currentUser?.email });
  };

  const handleSkipCall = async () => {
    await logOutcome('skipped', 'Counter staff skipped phone verification');
    onClose(); // Close without calling onVerified
  };

  const logOutcome = async (outcome, note) => {
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        action: `phone_verification_${outcome}`,
        entityName: 'Customer',
        entityId: customer.id || '',
        entityLabel: customer.fullName || '',
        performedBy: currentUser?.email || 'counter',
        performedAt: new Date().toISOString(),
        changes: { callSid, phone: customer.phone, outcome, note },
      });
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className={`px-5 pt-5 pb-3 flex items-center gap-3 ${
          state === 'failed' ? 'bg-red-50' : state === 'success' ? 'bg-green-50' : 'bg-indigo-50'
        }`}>
          <div className={`p-2 rounded-full ${
            state === 'failed' ? 'bg-red-100' : state === 'success' ? 'bg-green-100' : 'bg-indigo-100'
          }`}>
            {state === 'failed' ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : state === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Phone className="w-5 h-5 text-indigo-600" />
            )}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">Phone Verification</div>
            <div className="text-xs text-gray-500">{customer.fullName}</div>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Phone number display */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
            <div className="text-xs text-gray-500 mb-1">Primary number</div>
            <div className="text-lg font-bold text-gray-900 font-mono tracking-wide">{customer.phone}</div>
          </div>

          {/* PROMPT state */}
          {state === 'prompt' && (
            <>
              <p className="text-sm text-gray-600 text-center">
                Call this number now to verify the customer's identity?
              </p>
              <div className="flex gap-3">
                <Button
                  ref={yesRef}
                  onClick={handleCall}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
                  autoFocus
                >
                  <PhoneCall className="w-4 h-4" /> Yes — Call Now
                </Button>
                <Button
                  onClick={handleSkipCall}
                  variant="outline"
                  className="flex-1"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleSkipCall()}
                >
                  No — Skip
                </Button>
              </div>
            </>
          )}

          {/* CALLING state */}
          {state === 'calling' && (
            <div className="text-center space-y-3 py-2">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm text-gray-600">Placing call… please wait.</p>
            </div>
          )}

          {/* AWAITING confirmation from counter staff */}
          {state === 'awaiting' && (
            <>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-800 text-center">
                <PhoneCall className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                Call in progress — ask the customer: <strong>"Did you receive a call and press 1?"</strong>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleConfirmSuccess} className="flex-1 bg-green-600 hover:bg-green-700 gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Yes — Confirmed
                </Button>
                <Button onClick={handleConfirmFailed} variant="outline" className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-1">
                  <PhoneOff className="w-4 h-4" /> No Answer
                </Button>
              </div>
            </>
          )}

          {/* SUCCESS state */}
          {state === 'success' && (
            <div className="text-center space-y-2 py-2">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
              <p className="text-sm font-semibold text-green-700">Phone verified — proceeding.</p>
            </div>
          )}

          {/* FAILED state — red banner + override */}
          {state === 'failed' && (
            <>
              <div className="bg-red-50 border-2 border-red-400 rounded-lg px-4 py-3 text-sm text-red-800 text-center font-semibold">
                ⚠ Phone verification failed — rental is blocked.<br />
                <span className="font-normal text-xs mt-1 block">Ask the customer to provide a valid phone number, or management may override.</span>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleProceedAnyway}
                  variant="outline"
                  className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-50 text-xs"
                >
                  Proceed Anyway (log override)
                </Button>
                <Button onClick={onClose} className="flex-1 bg-red-600 hover:bg-red-700 text-xs">
                  Retry / Fix Number
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}