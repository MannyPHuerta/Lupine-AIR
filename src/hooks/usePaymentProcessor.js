import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { PaymentProcessorFactory } from '@/lib/paymentProcessors/PaymentProcessorFactory';

/**
 * Hook to get the active payment processor
 * Usage:
 *   const { processor, loading, error } = usePaymentProcessor();
 *   if (processor) {
 *     const result = await processor.createPayment({ amount: 100, ... });
 *   }
 */
export function usePaymentProcessor() {
  const [processor, setProcessor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.entities.PaymentSettings.list()
      .then(async (records) => {
        if (records.length > 0) {
          const settings = records[0];
          const activeProcessor = await PaymentProcessorFactory.getActiveProcessor(settings);
          setProcessor(activeProcessor);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { processor, loading, error };
}