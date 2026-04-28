import { PaymentProcessor } from './PaymentProcessor';

export class PayPalAdapter extends PaymentProcessor {
  constructor() {
    super();
    this.clientId = null;
  }

  async init(config) {
    this.clientId = config.paypalClientId;
    return { success: true };
  }

  async createPayment(params) {
    const { amount, currency = 'USD', customerId, description, metadata = {} } = params;

    try {
      const response = await fetch('/api/payments/paypal/create-order', {
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
        transactionId: data.id,
        status: 'pending',
        approvalUrl: data.approvalUrl,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async confirmPayment(transactionId, params) {
    try {
      const response = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: transactionId,
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
      const response = await fetch('/api/payments/paypal/refund', {
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
        refundId: data.id,
        status: data.status,
      };
    } catch (err) {
      return { error: err.message, status: 'failed' };
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const response = await fetch(`/api/payments/paypal/status/${transactionId}`);
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
      const response = await fetch('/api/payments/paypal/create-customer', {
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