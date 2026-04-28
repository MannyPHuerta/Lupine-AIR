/**
 * Abstract Payment Processor Interface
 * All payment processors must implement these methods
 */
export class PaymentProcessor {
  /**
   * Initialize processor with config
   * @param {object} config - Processor-specific configuration
   */
  async init(config) {
    throw new Error('init() must be implemented');
  }

  /**
   * Create a payment intent/charge
   * @param {object} params - { amount, currency, customerId, description, metadata }
   * @returns {object} - { transactionId, status, clientSecret?, error? }
   */
  async createPayment(params) {
    throw new Error('createPayment() must be implemented');
  }

  /**
   * Confirm/capture a payment
   * @param {string} transactionId
   * @param {object} params - Additional confirm params
   * @returns {object} - { transactionId, status, error? }
   */
  async confirmPayment(transactionId, params) {
    throw new Error('confirmPayment() must be implemented');
  }

  /**
   * Refund a payment
   * @param {string} transactionId
   * @param {number} amount - Optional partial refund
   * @returns {object} - { refundId, status, error? }
   */
  async refundPayment(transactionId, amount) {
    throw new Error('refundPayment() must be implemented');
  }

  /**
   * Get payment status
   * @param {string} transactionId
   * @returns {object} - { transactionId, status, amount, currency }
   */
  async getPaymentStatus(transactionId) {
    throw new Error('getPaymentStatus() must be implemented');
  }

  /**
   * Create or retrieve customer
   * @param {object} params - { email, name, phone }
   * @returns {object} - { customerId, error? }
   */
  async createCustomer(params) {
    throw new Error('createCustomer() must be implemented');
  }
}