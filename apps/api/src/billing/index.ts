// Billing provider factory. Selects the payment provider by config; today only
// the stub exists (StripePaymentProvider slots in here behind the same iface).
import { config } from '../config';
import { StubPaymentProvider, type PaymentProvider } from './payments';

let cached: PaymentProvider | null = null;

export function payments(): PaymentProvider {
  if (cached) return cached;
  // config.PAYMENTS_PROVIDER is 'stub' by default; 'stripe' would construct the
  // real provider once implemented.
  cached = new StubPaymentProvider();
  return cached;
}

export { renderInvoicePdf, renderInvoicePdfFrom } from './pdf';
export { signPaymentWebhook } from './payments';
export type { PaymentProvider, PaymentEvent } from './payments';
