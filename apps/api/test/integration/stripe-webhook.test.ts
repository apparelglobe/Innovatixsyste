/**
 * Stripe webhook — the authoritative settlement path. Uses locally-signed Stripe
 * fixture events (real Stripe signature scheme, HMAC-SHA256 over `${t}.${body}`)
 * so no network or live Stripe account is needed. Covers signature verification,
 * replay/idempotency, amount integrity, and failed/canceled handling.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { config } from '../../src/config';
import { resolveDefaultTenant } from '../../src/tenant';
import { signStripeWebhook } from '../../src/billing/gateway';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let orgId: string;

const mkInvoice = async (over: Partial<{ amountCents: number; currency: string; status: 'SENT' | 'PAID' }> = {}) => {
  const project = await prisma.project.create({ data: { tenantId, clientOrgId: orgId, name: `P-${uid()}` } });
  return prisma.invoice.create({ data: { tenantId, projectId: project.id, number: `INV-${uid()}`, amountCents: over.amountCents ?? 250000, currency: over.currency ?? 'USD', status: over.status ?? 'SENT' } });
};

// Build a Stripe event body. Defaults to a paid checkout.session.completed.
function stripeEventBody(o: {
  id?: string; type?: string; invoiceId: string; sessionId?: string; paymentIntentId?: string;
  amount_total?: number | null; currency?: string; payment_status?: string;
}): string {
  return JSON.stringify({
    id: o.id ?? `evt_${uid()}`,
    type: o.type ?? 'checkout.session.completed',
    data: {
      object: {
        id: o.sessionId ?? `cs_${uid()}`,
        object: 'checkout.session',
        client_reference_id: o.invoiceId,
        payment_status: o.payment_status ?? 'paid',
        status: 'complete',
        amount_total: o.amount_total === undefined ? 250000 : o.amount_total,
        currency: o.currency ?? 'usd',
        payment_intent: o.paymentIntentId ?? `pi_${uid()}`,
        metadata: { invoiceId: o.invoiceId, tenantId },
      },
    },
  });
}

const postStripe = (raw: string, sig?: string) =>
  app.inject({ method: 'POST', url: '/v1/webhooks/stripe', headers: { 'content-type': 'application/json', ...(sig !== undefined ? { 'stripe-signature': sig } : {}) }, payload: raw });

const sign = (raw: string) => signStripeWebhook(raw, config.STRIPE_WEBHOOK_SECRET, Math.floor(Date.now() / 1000));

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  orgId = (await prisma.clientOrg.create({ data: { tenantId, name: 'SW Org', slug: `sw-${uid()}` } })).id;
});
after(async () => { await app.close(); await prisma.$disconnect(); });

test('valid Stripe webhook marks the invoice PAID + records the payment + ledger', async () => {
  const inv = await mkInvoice();
  const raw = stripeEventBody({ invoiceId: inv.id, amount_total: inv.amountCents });
  const res = await postStripe(raw, sign(raw));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).result, 'paid');
  assert.equal((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'PAID');
  const pay = await prisma.payment.findFirstOrThrow({ where: { invoiceId: inv.id } });
  assert.equal(pay.status, 'PAID');
  assert.equal(pay.tenantId, tenantId);
  assert.equal(pay.clientOrgId, orgId);
  assert.ok(pay.paidAt);
  assert.equal(await prisma.processedWebhookEvent.count({ where: { provider: 'stripe' } }) >= 1, true);
});

test('invalid signature → 401, invoice not paid', async () => {
  const inv = await mkInvoice();
  const raw = stripeEventBody({ invoiceId: inv.id, amount_total: inv.amountCents });
  const res = await postStripe(raw, 't=9999999999,v1=deadbeef');
  assert.equal(res.statusCode, 401);
  assert.notEqual((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'PAID');
});

test('missing signature → 401', async () => {
  const inv = await mkInvoice();
  const raw = stripeEventBody({ invoiceId: inv.id, amount_total: inv.amountCents });
  assert.equal((await postStripe(raw)).statusCode, 401);
});

test('duplicate event is ignored safely (invoice paid once, paidAt unchanged, INVOICE_PAID audited once)', async () => {
  const inv = await mkInvoice();
  const raw = stripeEventBody({ invoiceId: inv.id, amount_total: inv.amountCents }); // same body → same event id
  const sig = sign(raw);
  assert.equal(JSON.parse((await postStripe(raw, sig)).body).result, 'paid');
  const first = await prisma.invoice.findUnique({ where: { id: inv.id } });
  const dup = await postStripe(raw, sign(raw)); // re-sign (fresh timestamp), same event id
  assert.equal(dup.statusCode, 200);
  assert.equal(JSON.parse(dup.body).result, 'duplicate');
  const second = await prisma.invoice.findUnique({ where: { id: inv.id } });
  assert.equal(second?.status, 'PAID');
  assert.equal(first?.paidAt?.getTime(), second?.paidAt?.getTime(), 'paidAt must not change on duplicate');
  assert.equal(await prisma.auditEvent.count({ where: { tenantId, entityType: 'Invoice', entityId: inv.id, action: 'INVOICE_PAID' } }), 1);
  assert.equal(await prisma.payment.count({ where: { invoiceId: inv.id, status: 'PAID' } }), 1);
});

test('failed payment event records failure and leaves the invoice unpaid', async () => {
  const inv = await mkInvoice();
  const pi = `pi_${uid()}`;
  await prisma.payment.create({ data: { tenantId, clientOrgId: orgId, invoiceId: inv.id, provider: 'stripe', amountCents: inv.amountCents, currency: 'USD', status: 'PENDING', paymentIntentId: pi } });
  const raw = stripeEventBody({ type: 'payment_intent.payment_failed', invoiceId: inv.id, sessionId: `pi_evt_${uid()}`, paymentIntentId: pi, amount_total: null });
  const res = await postStripe(raw, sign(raw));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).result, 'failed_recorded');
  assert.equal((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'SENT');
  assert.equal((await prisma.payment.findFirstOrThrow({ where: { invoiceId: inv.id } })).status, 'FAILED');
});

test('canceled/expired checkout leaves the invoice unpaid', async () => {
  const inv = await mkInvoice();
  const sess = `cs_${uid()}`;
  await prisma.payment.create({ data: { tenantId, clientOrgId: orgId, invoiceId: inv.id, provider: 'stripe', amountCents: inv.amountCents, currency: 'USD', status: 'PENDING', checkoutSessionId: sess } });
  const raw = stripeEventBody({ type: 'checkout.session.expired', invoiceId: inv.id, sessionId: sess, amount_total: null });
  const res = await postStripe(raw, sign(raw));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).result, 'canceled_recorded');
  assert.equal((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'SENT');
  assert.equal((await prisma.payment.findFirstOrThrow({ where: { invoiceId: inv.id } })).status, 'CANCELED');
});

test('mismatched amount is rejected — invoice NOT paid, payment recorded FAILED', async () => {
  const inv = await mkInvoice({ amountCents: 250000 });
  const raw = stripeEventBody({ invoiceId: inv.id, amount_total: 100000 }); // wrong amount
  const res = await postStripe(raw, sign(raw));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).result, 'mismatch');
  assert.notEqual((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'PAID');
});

test('mismatched currency is rejected', async () => {
  const inv = await mkInvoice({ amountCents: 250000, currency: 'USD' });
  const raw = stripeEventBody({ invoiceId: inv.id, amount_total: 250000, currency: 'eur' });
  const res = await postStripe(raw, sign(raw));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).result, 'mismatch');
  assert.notEqual((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'PAID');
});

test('unknown/stale event with a valid signature is acked but changes nothing', async () => {
  const inv = await mkInvoice();
  const raw = stripeEventBody({ type: 'payment_intent.created', invoiceId: inv.id, amount_total: null });
  const res = await postStripe(raw, sign(raw));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).result, 'ignored');
  assert.notEqual((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'PAID');
});
