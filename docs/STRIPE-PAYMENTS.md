# Stripe payments

Real Stripe payments behind the existing payment-provider boundary. **The webhook
is the only source of truth for PAID** — success redirects are never trusted.

## Provider architecture (`billing/gateway.ts`)

One `PaymentGateway` interface, two implementations:
- **StubGateway** (`stub`, dev/test default) — checkout points at our own `/pay`
  page; webhooks are HMAC-signed. No keys, no network.
- **StripeGateway** (`stripe`, staging/prod) — real Checkout Sessions + Stripe
  webhook signature verification, implemented over `node:https` + `node:crypto`
  (**no SDK dependency**, so tests stay hermetic).

Capabilities: `createCheckoutSession`, `verifyAndParseWebhook`, `retrievePaymentStatus`, `refund`.
Factories: `checkoutGateway()` (config-selected, used by the checkout route) and
`stripeGateway()` (always Stripe; used by the Stripe webhook route so the endpoint
is testable regardless of `PAYMENTS_PROVIDER`).

## Flow

```
OWNER opens invoice → Pay → POST /v1/portal/invoices/:id/checkout
  → server validates (org-scoped, payable, not paid; amount+currency from DB)
  → gateway.createCheckoutSession → PENDING Payment recorded + audit
  → client redirected to Stripe (or the stub /pay page)
  → Stripe → POST /v1/webhooks/stripe (raw-body Stripe-Signature verified)
  → processProviderWebhook: replay-guard → amount check → Payment PAID
  → markInvoicePaid (idempotent): Invoice PAID once + audit + client & staff
    notifications + confirmation email
  → portal reflects paid (?paid=1 banner + refetch)
```

## Routes

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/portal/invoices/:id/checkout` | OWNER-only (`invoice:pay`); creates session + PENDING Payment |
| POST | `/v1/webhooks/stripe` | raw-body `Stripe-Signature`; authoritative settlement |
| POST | `/v1/webhooks/payments` | legacy stub HMAC (`x-innovatix-signature`) — unchanged |

## Database (migration `20260716180207_add_payments_and_webhook_ledger`)

- **Payment** — provider, providerCustomerId, checkoutSessionId, paymentIntentId,
  providerEventId, amountCents, currency, status (PENDING/PAID/FAILED/CANCELED/
  REFUNDED), paidAt, failureReason, refundStatus, invoiceId, **tenantId + clientOrgId**.
- **ProcessedWebhookEvent** — `@@unique([provider, providerEventId])` replay ledger.
- Additive only; no changes to existing tables.

## Webhook security & idempotency

- Raw-body `Stripe-Signature` verification: HMAC-SHA256 over `${t}.${payload}`,
  constant-time compare, **5-min timestamp tolerance** (replay window).
- **Replay protection**: unique `(provider, providerEventId)` — duplicate delivery
  → fast `duplicate` no-op.
- **Idempotent settlement**: `markInvoicePaid` only transitions/notifies once.
- **Amount integrity**: a `succeeded` event whose amount or currency disagrees with
  the server-side invoice is **rejected** (invoice stays unpaid, Payment → FAILED,
  audit written). Amounts never come from the browser.
- Handled event types: `checkout.session.completed` (payment_status=paid),
  `checkout.session.async_payment_succeeded` / `payment_intent.succeeded`,
  `checkout.session.async_payment_failed` / `payment_intent.payment_failed`,
  `checkout.session.expired` / `payment_intent.canceled`.

## Stripe environment requirements

- `PAYMENTS_PROVIDER=stripe`
- `STRIPE_SECRET_KEY` (test mode first: `sk_test_…`)
- `STRIPE_WEBHOOK_SECRET` (`whsec_…`) — from the Stripe dashboard webhook endpoint
  pointed at `/v1/webhooks/stripe`.

Production boot **fails fast** if either secret is missing when
`PAYMENTS_PROVIDER=stripe` (see `config-validation.ts`). Never hardcode keys or
product ids — line items are built from the invoice at request time.

## Tests

- `test/integration/payments.test.ts` — OWNER can checkout / MEMBER 403 / cross-org
  404 / amount+currency from DB / already-paid + DRAFT rejected / tenant-org scoped.
- `test/integration/stripe-webhook.test.ts` — signed fixtures: valid→PAID, invalid
  sig→401, missing sig→401, duplicate ignored (paid+audited once), failed records
  failure, canceled leaves unpaid, mismatched amount/currency rejected, unknown
  acked.
- Stub webhook + legacy path still green (`webhooks.test.ts`).
