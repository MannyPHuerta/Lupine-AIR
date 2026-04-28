import { PaymentProcessor } from './PaymentProcessor';

export class SquareAdapter extends PaymentProcessor {
  constructor() {
    super();
    this.applicationId = null;
  }

  async init(config) {
    this.applicationId = config.squareApplicationId;
    return { success: true };
  }

  async createPayment(params) {
    const { amount, currency = 'USD', customerId, description, metadata = {} } = params;

    try {
      const response = await fetch('/api/payments/square/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
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
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async confirmPayment(transactionId, params) {
    try {
      const response = await fetch('/api/payments/square/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
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
      const response = await fetch('/api/payments/square/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
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
      const response = await fetch(`/api/payments/square/status/${transactionId}`);
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
      const response = await fetch('/api/payments/square/create-customer', {
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