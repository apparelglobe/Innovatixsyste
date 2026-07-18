// Legacy stub payment provider — used ONLY by the dev/staging stub webhook path
// (`src/webhooks/payments.ts`, active when PAYMENTS_PROVIDER=stub). The real,
// production payment flow — BOTH client self-checkout AND staff-generated payment
// links — goes through `checkoutGateway()` in `./gateway.ts` (StripeGateway when
// PAYMENTS_PROVIDER=stripe, verified via `/v1/webhooks/stripe`). This factory is
// intentionally not wired to Stripe; do not route production links through it.
import { StubPaymentProvider, type PaymentProvider } from './payments';

let cached: PaymentProvider | null = null;

export function payments(): PaymentProvider {
  if (cached) return cached;
  cached = new StubPaymentProvider();
  return cached;
}

export { renderInvoicePdf, renderInvoicePdfFrom } from './pdf';
export { signPaymentWebhook } from './payments';
export type { PaymentProvider, PaymentEvent } from './payments';
