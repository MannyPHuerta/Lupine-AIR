import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PaymentForm({ amount, customerEmail, customerName, onSuccess, onCancel }) {
  const { processor, loading: processorLoading, error: processorError } = usePaymentProcessor();
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (processorLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (processorError || !processor) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Payment processor not configured</strong>
            <p className="mt-1 text-xs">Please configure a payment processor in Company Settings.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!cardNumber || !expMonth || !expYear || !cvc) {
      setError('Please fill in all card details');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        action: 'createPaymentIntent',
        payload: {
          amount,
          currency: 'usd',
          customerId: customerEmail,
          description: `Rental for ${customerName}`,
          metadata: { email: customerEmail, name: customerName },
        },
      };

      // Get payment handler function name from processor type
      const paymentSettings = await base44.entities.PaymentSettings.list();
      const settings = paymentSettings[0];
      const processorType = settings?.activeProcessor || 'stripe';

      let handlerName = 'stripePaymentHandler';
      if (processorType === 'square') handlerName = 'squarePaymentHandler';
      else if (processorType === 'paypal') handlerName = 'paypalPaymentHandler';
      else if (processorType === 'authorize_net') handlerName = 'authorizeNetPaymentHandler';
      else if (processorType === 'amazon_pay') handlerName = 'amazonPayPaymentHandler';
      else if (processorType === 'wise') handlerName = 'wisePaymentHandler';
      else if (processorType === 'quickbooks') handlerName = 'quickbooksPaymentHandler';

      const response = await base44.functions.invoke(handlerName, payload);
      
      if (response.data?.id) {
        setSuccess(true);
        setTimeout(() => onSuccess?.({ transactionId: response.data.id }), 1500);
      } else {
        setError(response.data?.error || 'Payment failed');
      }
    } catch (err) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <p className="text-green-800 font-semibold">Payment Successful</p>
        <p className="text-green-700 text-sm mt-1">Amount: ${amount.toFixed(2)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="text-sm text-gray-600 mb-4">
          <strong>Total to charge:</strong> ${amount.toFixed(2)}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Card Number</label>
            <Input
              type="text"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
              disabled={processing}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Exp Month</label>
              <Input
                type="text"
                placeholder="MM"
                value={expMonth}
                onChange={e => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                disabled={processing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Exp Year</label>
              <Input
                type="text"
                placeholder="YYYY"
                value={expYear}
                onChange={e => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                disabled={processing}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">CVC</label>
            <Input
              type="text"
              placeholder="123"
              value={cvc}
              onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              disabled={processing}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={processing}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processing…
            </>
          ) : (
            `Pay $${amount.toFixed(2)}`
          )}
        </Button>
      </div>
    </form>
  );
}