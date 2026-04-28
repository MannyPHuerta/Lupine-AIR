import { StripeAdapter } from './StripeAdapter';
import { QuickBooksAdapter } from './QuickBooksAdapter';

/**
 * Factory to create and manage payment processors
 * Handles processor selection and initialization
 */
export class PaymentProcessorFactory {
  static async create(activeProcessor, config) {
    let processor = null;

    switch (activeProcessor) {
      case 'stripe':
        processor = new StripeAdapter();
        break;
      case 'quickbooks':
        processor = new QuickBooksAdapter();
        break;
      case 'none':
        return null;
      default:
        throw new Error(`Unknown payment processor: ${activeProcessor}`);
    }

    await processor.init(config);
    return processor;
  }

  /**
   * Get the active payment processor from settings
   * @param {object} paymentSettings - From base44.entities.PaymentSettings
   * @returns {PaymentProcessor|null}
   */
  static async getActiveProcessor(paymentSettings) {
    if (!paymentSettings || paymentSettings.activeProcessor === 'none') {
      return null;
    }

    return this.create(paymentSettings.activeProcessor, paymentSettings);
  }
}