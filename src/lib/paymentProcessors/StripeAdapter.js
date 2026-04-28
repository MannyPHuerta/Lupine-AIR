import { PaymentProcessor } from './PaymentProcessor';

export class StripeAdapter extends PaymentProcessor {
  constructor() {
    super();
    this.stripe = null;
  }

  async init(config) {
    // Stripe will be initialized on backend/function level with API key
    // Frontend gets publishable key only
    this.publishableKey = config.stripePublishableKey;
    return { success: true };
  }

  async createPayment(params) {
    const { amount, currency = 'usd', customerId, description, metadata = {} } = params;

    try {
      // This would be called via a backend function that has access to Stripe secret key
      // Frontend should invoke: base44.functions.invoke('stripeCreatePaymentIntent', { ... })
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Convert to cents
          currency,
          customerId,
          description,
          metadata,
        }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error, status: 'failed' };
      }

      return {
        transactionId: data.id,
        status: 'pending',
        clientSecret: data.client_secret,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async confirmPayment(transactionId, params) {
    try {
      const response = await fetch('/api/payments/stripe/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: transactionId,
          ...params,
        }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error, status: 'failed' };
      }

      return {
        transactionId: data.id,
        status: data.status,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async refundPayment(transactionId, amount) {
    try {
      const response = await fetch('/api/payments/stripe/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: transactionId,
          amount: amount ? Math.round(amount * 100) : undefined,
        }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error, status: 'failed' };
      }

      return {
        refundId: data.id,
        status: data.status,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const response = await fetch(`/api/payments/stripe/status/${transactionId}`);
      const data = await response.json();

      if (data.error) {
        return { error: data.error };
      }

      return {
        transactionId: data.id,
        status: data.status,
        amount: data.amount / 100,
        currency: data.currency,
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  async createCustomer(params) {
    const { email, name, phone } = params;

    try {
      const response = await fetch('/api/payments/stripe/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, phone }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error };
      }

      return { customerId: data.id };
    } catch (err) {
      return { error: err.message };
    }
  }
}