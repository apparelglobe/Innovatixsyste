// Payment provider boundary.
//
// StubPaymentProvider makes the billing loop work end-to-end in dev with no
// external service or keys (mirrors the storefront's Stripe-stub pattern): it
// mints a hosted-pay URL that points at our own /pay page and verifies webhooks
// with an HMAC shared secret. In production a StripePaymentProvider would
// implement the same interface (checkout session + Stripe signature check).
import crypto from 'node:crypto';

export type PaymentLink = { url: string; ref: string };
export type PaymentEvent = { type: 'invoice.paid'; invoiceId: string } | { type: 'unknown'; invoiceId: null };

export interface PaymentProvider {
  readonly name: string;
  createPaymentLink(input: { invoiceId: string; number: string; amountCents: number; currency: string; portalOrigin: string }): PaymentLink;
  verifyWebhook(rawBody: string, signature: string | undefined, secret: string): boolean;
  parseEvent(rawBody: string): PaymentEvent;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Sign a webhook body the same way the stub verifies it (used by dev tooling / tests). */
export function signPaymentWebhook(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export class StubPaymentProvider implements PaymentProvider {
  readonly name = 'stub';

  createPaymentLink(input: { invoiceId: string; number: string; amountCents: number; currency: string; portalOrigin: string }): PaymentLink {
    const ref = `pi_stub_${crypto.createHash('sha1').update(input.invoiceId).digest('hex').slice(0, 16)}`;
    // Points at our own portal /pay page — no external host in stub mode.
    const url = `${input.portalOrigin.replace(/\/$/, '')}/pay/${encodeURIComponent(input.invoiceId)}?ref=${ref}`;
    return { url, ref };
  }

  verifyWebhook(rawBody: string, signature: string | undefined, secret: string): boolean {
    if (!signature || !secret) return false;
    return timingSafeEqualHex(signature, signPaymentWebhook(rawBody, secret));
  }

  parseEvent(rawBody: string): PaymentEvent {
    try {
      const j = JSON.parse(rawBody) as { type?: string; invoiceId?: string };
      if (j.type === 'invoice.paid' && typeof j.invoiceId === 'string' && j.invoiceId) {
        return { type: 'invoice.paid', invoiceId: j.invoiceId };
      }
    } catch {
      /* fall through */
    }
    return { type: 'unknown', invoiceId: null };
  }
}
