/**
 * Payment gateway boundary (checkout + webhooks). Two implementations behind one
 * interface so a provider can be swapped without touching callers:
 *   • StubGateway   — dev/test. Checkout points at our own /pay page; webhooks are
 *                     HMAC-signed. No external service, no keys.
 *   • StripeGateway — staging/prod. Real Stripe Checkout Sessions + Stripe webhook
 *                     signature verification. Implemented over node:https + crypto
 *                     (no SDK dependency), so tests stay hermetic.
 *
 * The gateway NEVER decides amounts — the caller passes the server-side invoice
 * amount. Success redirects are NOT trusted; the webhook is authoritative.
 */
import crypto from 'node:crypto';
import https from 'node:https';
import { config } from '../config';

export type CheckoutInput = {
  invoiceId: string;
  tenantId: string;
  number: string;
  amountCents: number;
  currency: string;
  portalOrigin: string;
  customerEmail?: string | null;
  idempotencyKey: string;
};
export type CheckoutResult = { url: string; sessionId: string; providerCustomerId?: string | null };

export type WebhookKind = 'succeeded' | 'failed' | 'canceled' | 'ignored';
export type ParsedWebhook = {
  ok: boolean; // signature valid?
  eventId?: string;
  kind?: WebhookKind;
  invoiceId?: string | null;
  sessionId?: string | null;
  paymentIntentId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  failureReason?: string | null;
};
export type PaymentStatusResult = { status: 'paid' | 'unpaid' | 'canceled' | 'unknown'; paymentIntentId?: string | null };
export type RefundResult = { ok: boolean; refundId?: string; reason?: string };

export interface PaymentGateway {
  readonly name: 'stub' | 'stripe';
  createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult>;
  verifyAndParseWebhook(rawBody: string, signatureHeader: string | undefined): ParsedWebhook;
  retrievePaymentStatus(sessionId: string): Promise<PaymentStatusResult>;
  refund(input: { paymentIntentId: string; amountCents?: number }): Promise<RefundResult>;
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// ── Stub HMAC helpers (dev/test) ─────────────────────────────────────────────
/** Sign a stub webhook body (dev tooling / tests). */
export function signStubWebhook(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export class StubGateway implements PaymentGateway {
  readonly name = 'stub' as const;

  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
    const sessionId = `cs_stub_${crypto.createHash('sha1').update(`${input.invoiceId}:${input.idempotencyKey}`).digest('hex').slice(0, 20)}`;
    const url = `${input.portalOrigin.replace(/\/$/, '')}/pay/${encodeURIComponent(input.invoiceId)}?ref=${sessionId}`;
    return { url, sessionId };
  }

  verifyAndParseWebhook(rawBody: string, signatureHeader: string | undefined): ParsedWebhook {
    if (!signatureHeader || !timingSafeEqualStr(signatureHeader, signStubWebhook(rawBody, config.PAYMENTS_WEBHOOK_SECRET))) {
      return { ok: false };
    }
    try {
      const j = JSON.parse(rawBody) as Record<string, unknown>;
      const type = String(j.type ?? '');
      const kind: WebhookKind =
        type === 'invoice.paid' || type === 'payment.succeeded' ? 'succeeded'
        : type === 'payment.failed' ? 'failed'
        : type === 'checkout.canceled' ? 'canceled'
        : 'ignored';
      return {
        ok: true,
        eventId: typeof j.eventId === 'string' && j.eventId ? j.eventId : crypto.createHash('sha256').update(rawBody).digest('hex'),
        kind,
        invoiceId: typeof j.invoiceId === 'string' ? j.invoiceId : null,
        sessionId: typeof j.sessionId === 'string' ? j.sessionId : null,
        paymentIntentId: typeof j.paymentIntentId === 'string' ? j.paymentIntentId : null,
        amountCents: typeof j.amountCents === 'number' ? j.amountCents : null,
        currency: typeof j.currency === 'string' ? j.currency : null,
      };
    } catch {
      return { ok: true, kind: 'ignored' };
    }
  }

  async retrievePaymentStatus(): Promise<PaymentStatusResult> {
    return { status: 'unknown' };
  }
  async refund(): Promise<RefundResult> {
    return { ok: true, refundId: `re_stub_${crypto.randomUUID().slice(0, 12)}` };
  }
}

// ── Stripe (real; node:https + crypto, no SDK) ───────────────────────────────
const STRIPE_SIG_TOLERANCE_SECONDS = 5 * 60;

/** Test/dev helper: produce a valid `Stripe-Signature` header for a raw body. */
export function signStripeWebhook(rawBody: string, secret: string, timestampSeconds: number): string {
  const sig = crypto.createHmac('sha256', secret).update(`${timestampSeconds}.${rawBody}`).digest('hex');
  return `t=${timestampSeconds},v1=${sig}`;
}

function stripeApiRequest(path: string, form: Record<string, string>, idempotencyKey?: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const body = new URLSearchParams(form).toString();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': String(Buffer.byteLength(body)),
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.stripe.com', path, method: 'POST', headers, timeout: 20000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, json: data ? JSON.parse(data) : {} });
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('stripe request timeout')));
    req.write(body);
    req.end();
  });
}

export class StripeGateway implements PaymentGateway {
  readonly name = 'stripe' as const;

  async createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
    const origin = input.portalOrigin.replace(/\/$/, '');
    const form: Record<string, string> = {
      mode: 'payment',
      // Success/cancel are UX only — the webhook is authoritative for PAID.
      success_url: `${origin}/invoices/${encodeURIComponent(input.invoiceId)}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/invoices/${encodeURIComponent(input.invoiceId)}?canceled=1`,
      client_reference_id: input.invoiceId,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': input.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(input.amountCents),
      'line_items[0][price_data][product_data][name]': `Invoice ${input.number}`,
      'metadata[invoiceId]': input.invoiceId,
      'metadata[tenantId]': input.tenantId,
      'payment_intent_data[metadata][invoiceId]': input.invoiceId,
    };
    if (input.customerEmail) form.customer_email = input.customerEmail;

    const res = await stripeApiRequest('/v1/checkout/sessions', form, input.idempotencyKey);
    if (res.status >= 400 || !res.json.id || !res.json.url) {
      const msg = ((res.json.error as { message?: string } | undefined)?.message) ?? `stripe error ${res.status}`;
      throw new Error(`stripe_checkout_failed: ${msg}`);
    }
    return {
      url: String(res.json.url),
      sessionId: String(res.json.id),
      providerCustomerId: res.json.customer ? String(res.json.customer) : null,
    };
  }

  verifyAndParseWebhook(rawBody: string, signatureHeader: string | undefined): ParsedWebhook {
    if (!signatureHeader) return { ok: false };
    // Parse `t=...,v1=...` (may carry multiple v1 schemes).
    const parts = signatureHeader.split(',').map((p) => p.trim());
    const t = parts.find((p) => p.startsWith('t='))?.slice(2);
    const v1s = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
    if (!t || v1s.length === 0) return { ok: false };
    const ts = Number(t);
    if (!Number.isFinite(ts)) return { ok: false };
    // Replay window: reject stale timestamps.
    if (Math.abs(Math.floor(Date.now() / 1000) - ts) > STRIPE_SIG_TOLERANCE_SECONDS) return { ok: false };
    const expected = crypto.createHmac('sha256', config.STRIPE_WEBHOOK_SECRET).update(`${ts}.${rawBody}`).digest('hex');
    if (!v1s.some((v) => timingSafeEqualStr(v, expected))) return { ok: false };

    try {
      const event = JSON.parse(rawBody) as { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
      const obj = event.data?.object ?? {};
      const type = event.type ?? '';
      const meta = (obj.metadata as Record<string, string> | undefined) ?? {};
      const invoiceId = (obj.client_reference_id as string | undefined) || meta.invoiceId || null;
      const base: ParsedWebhook = {
        ok: true,
        eventId: event.id ?? crypto.createHash('sha256').update(rawBody).digest('hex'),
        invoiceId,
        sessionId: (obj.id as string | undefined) ?? null,
        paymentIntentId: (obj.payment_intent as string | undefined) ?? (type.startsWith('payment_intent') ? (obj.id as string) : null),
        amountCents: typeof obj.amount_total === 'number' ? (obj.amount_total as number) : (typeof obj.amount === 'number' ? (obj.amount as number) : null),
        currency: typeof obj.currency === 'string' ? String(obj.currency).toUpperCase() : null,
      };
      if (type === 'checkout.session.completed') {
        // Only 'paid' payment_status is a real success (async methods can be 'unpaid').
        const paid = (obj.payment_status as string | undefined) === 'paid' || (obj.status as string | undefined) === 'complete';
        return { ...base, kind: paid ? 'succeeded' : 'ignored' };
      }
      if (type === 'checkout.session.async_payment_succeeded' || type === 'payment_intent.succeeded') return { ...base, kind: 'succeeded' };
      if (type === 'checkout.session.async_payment_failed' || type === 'payment_intent.payment_failed') {
        const err = (obj.last_payment_error as { message?: string } | undefined)?.message ?? 'payment failed';
        return { ...base, kind: 'failed', failureReason: err };
      }
      if (type === 'checkout.session.expired' || type === 'payment_intent.canceled') return { ...base, kind: 'canceled' };
      return { ...base, kind: 'ignored' };
    } catch {
      return { ok: true, kind: 'ignored' };
    }
  }

  async retrievePaymentStatus(sessionId: string): Promise<PaymentStatusResult> {
    // GET the session; reuse the request helper via a bespoke GET.
    return new Promise((resolve) => {
      const req = https.request(
        { hostname: 'api.stripe.com', path: `/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, method: 'GET', headers: { Authorization: `Bearer ${config.STRIPE_SECRET_KEY}` }, timeout: 20000 },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              const j = JSON.parse(data || '{}') as Record<string, unknown>;
              const ps = j.payment_status as string | undefined;
              const status: PaymentStatusResult['status'] = ps === 'paid' ? 'paid' : j.status === 'expired' ? 'canceled' : ps === 'unpaid' ? 'unpaid' : 'unknown';
              resolve({ status, paymentIntentId: (j.payment_intent as string | undefined) ?? null });
            } catch {
              resolve({ status: 'unknown' });
            }
          });
        },
      );
      req.on('error', () => resolve({ status: 'unknown' }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 'unknown' }); });
      req.end();
    });
  }

  async refund(input: { paymentIntentId: string; amountCents?: number }): Promise<RefundResult> {
    const form: Record<string, string> = { payment_intent: input.paymentIntentId };
    if (input.amountCents != null) form.amount = String(input.amountCents);
    try {
      const res = await stripeApiRequest('/v1/refunds', form, `refund_${input.paymentIntentId}`);
      if (res.status >= 400 || !res.json.id) {
        return { ok: false, reason: ((res.json.error as { message?: string } | undefined)?.message) ?? `stripe error ${res.status}` };
      }
      return { ok: true, refundId: String(res.json.id) };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : 'refund failed' };
    }
  }
}

// ── Factories ────────────────────────────────────────────────────────────────
let cachedCheckout: PaymentGateway | null = null;
/** The configured checkout gateway (stub by default; stripe when configured). */
export function checkoutGateway(): PaymentGateway {
  if (cachedCheckout) return cachedCheckout;
  cachedCheckout = config.PAYMENTS_PROVIDER === 'stripe' ? new StripeGateway() : new StubGateway();
  return cachedCheckout;
}

let cachedStripe: StripeGateway | null = null;
/** The Stripe gateway — always used by the /webhooks/stripe route for signature
 *  verification, regardless of PAYMENTS_PROVIDER (so the endpoint is testable). */
export function stripeGateway(): StripeGateway {
  if (!cachedStripe) cachedStripe = new StripeGateway();
  return cachedStripe;
}

/** Test seam: reset cached singletons. */
export function __resetGatewayCache(): void {
  cachedCheckout = null;
  cachedStripe = null;
}
