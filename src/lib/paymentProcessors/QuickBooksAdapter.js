import { PaymentProcessor } from './PaymentProcessor';

export class QuickBooksAdapter extends PaymentProcessor {
  constructor() {
    super();
    this.realmId = null;
  }

  async init(config) {
    this.realmId = config.quickbooksRealmId;
    // QB OAuth tokens are managed server-side for security
    return { success: true };
  }

  async createPayment(params) {
    const { amount, currency = 'USD', customerId, description, metadata = {} } = params;

    try {
      // Backend function will handle QB API calls with encrypted refresh token
      const response = await fetch('/api/payments/quickbooks/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmId: this.realmId,
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
        transactionId: data.id,
        status: 'pending',
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async confirmPayment(transactionId, params) {
    try {
      const response = await fetch('/api/payments/quickbooks/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmId: this.realmId,
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
      const response = await fetch('/api/payments/quickbooks/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmId: this.realmId,
          transactionId,
          amount,
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
      const response = await fetch(`/api/payments/quickbooks/status/${transactionId}?realmId=${this.realmId}`);
      const data = await response.json();

      if (data.error) {
        return { error: data.error };
      }

      return {
        transactionId: data.id,
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
      const response = await fetch('/api/payments/quickbooks/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmId: this.realmId,
          email,
          name,
          phone,
        }),
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