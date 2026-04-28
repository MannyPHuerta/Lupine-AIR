import { PaymentProcessor } from './PaymentProcessor';

export class WiseAdapter extends PaymentProcessor {
  constructor() {
    super();
  }

  async init(config) {
    // Wise token managed server-side
    return { success: true };
  }

  async createPayment(params) {
    const { amount, currency = 'USD', customerId, description, metadata = {} } = params;

    try {
      const response = await fetch('/api/payments/wise/create-transfer', {
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
        transactionId: data.transferId,
        status: 'pending',
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async confirmPayment(transactionId, params) {
    try {
      const response = await fetch('/api/payments/wise/confirm-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferId: transactionId,
          ...params,
        }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error, status: 'failed' };
      }

      return {
        transactionId: data.transferId,
        status: data.status,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async refundPayment(transactionId, amount) {
    try {
      const response = await fetch('/api/payments/wise/cancel-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferId: transactionId,
          amount,
        }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error, status: 'failed' };
      }

      return {
        refundId: data.cancelId,
        status: 'cancelled',
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const response = await fetch(`/api/payments/wise/status/${transactionId}`);
      const data = await response.json();

      if (data.error) {
        return { error: data.error };
      }

      return {
        transactionId: data.transferId,
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
      const response = await fetch('/api/payments/wise/create-recipient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, phone }),
      });

      const data = await response.json();
      if (data.error) {
        return { error: data.error };
      }

      return { customerId: data.recipientId };
    } catch (err) {
      return { error: err.message };
    }
  }
}