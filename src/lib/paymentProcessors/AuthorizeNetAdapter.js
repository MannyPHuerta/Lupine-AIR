import { PaymentProcessor } from './PaymentProcessor';

export class AuthorizeNetAdapter extends PaymentProcessor {
  constructor() {
    super();
    this.apiLoginId = null;
  }

  async init(config) {
    this.apiLoginId = config.authorizeNetApiLoginId;
    return { success: true };
  }

  async createPayment(params) {
    const { amount, currency = 'USD', customerId, description, metadata = {} } = params;

    try {
      const response = await fetch('/api/payments/authorize-net/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
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
        transactionId: data.transactionId,
        status: 'pending',
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async confirmPayment(transactionId, params) {
    try {
      const response = await fetch('/api/payments/authorize-net/prior-auth-capture', {
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
        transactionId: data.transactionId,
        status: data.status,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async refundPayment(transactionId, amount) {
    try {
      const response = await fetch('/api/payments/authorize-net/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          amount,
        }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error, status: 'failed' };
      }

      return {
        refundId: data.transactionId,
        status: data.status,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const response = await fetch(`/api/payments/authorize-net/status/${transactionId}`);
      const data = await response.json();

      if (data.error) {
        return { error: data.error };
      }

      return {
        transactionId: data.transactionId,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
      };
    } catch (err) {
      return { error: err.message };
    }
  }

  async createCustomer(params) {
    const { email, name, phone } = params;

    try {
      const response = await fetch('/api/payments/authorize-net/create-customer-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, phone }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error };
      }

      return { customerId: data.customerProfileId };
    } catch (err) {
      return { error: err.message };
    }
  }
}