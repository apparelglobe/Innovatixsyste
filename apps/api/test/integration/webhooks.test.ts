/**
 * Payment webhook — signature verification + idempotent replay.
 * (Cal.com webhook signature cases live in leads.test.ts.)
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { config } from '../../src/config';
import { resolveDefaultTenant } from '../../src/tenant';
import { signPaymentWebhook } from '../../src/billing/payments';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;

const mkInvoice = async () => {
  const org = await prisma.clientOrg.create({ data: { tenantId, name: 'WH Org', slug: `wh-${uid()}` } });
  const project = await prisma.project.create({ data: { tenantId, clientOrgId: org.id, name: 'WH Proj' } });
  return prisma.invoice.create({ data: { tenantId, projectId: project.id, number: `INV-${uid()}`, amountCents: 5000, status: 'SENT' } });
};
const webhook = (raw: string, sig?: string) =>
  app.inject({
    method: 'POST',
    url: '/v1/webhooks/payments',
    headers: { 'content-type': 'application/json', ...(sig ? { 'x-innovatix-signature': sig } : {}) },
    payload: raw,
  });

before(async () => {
  app = await buildApp();
  const t = await resolveDefaultTenant(prisma);
  tenantId = t.id;
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});

test('invalid signature → 401, invoice not paid', async () => {
  const inv = await mkInvoice();
  const raw = JSON.stringify({ type: 'invoice.paid', invoiceId: inv.id });
  const res = await webhook(raw, 'deadbeef');
  assert.equal(res.statusCode, 401);
  const after = await prisma.invoice.findUnique({ where: { id: inv.id } });
  assert.notEqual(after?.status, 'PAID');
});

test('missing signature → 401', async () => {
  const inv = await mkInvoice();
  const res = await webhook(JSON.stringify({ type: 'invoice.paid', invoiceId: inv.id }));
  assert.equal(res.statusCode, 401);
});

test('valid signature → 200, invoice PAID', async () => {
  const inv = await mkInvoice();
  const raw = JSON.stringify({ type: 'invoice.paid', invoiceId: inv.id });
  const res = await webhook(raw, signPaymentWebhook(raw, config.PAYMENTS_WEBHOOK_SECRET));
  assert.equal(res.statusCode, 200);
  assert.equal((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'PAID');
});

test('replayed valid event → idempotent (still PAID, paidAt unchanged)', async () => {
  const inv = await mkInvoice();
  const raw = JSON.stringify({ type: 'invoice.paid', invoiceId: inv.id });
  const sig = signPaymentWebhook(raw, config.PAYMENTS_WEBHOOK_SECRET);
  assert.equal((await webhook(raw, sig)).statusCode, 200);
  const first = await prisma.invoice.findUnique({ where: { id: inv.id } });
  assert.equal((await webhook(raw, sig)).statusCode, 200); // replay
  const second = await prisma.invoice.findUnique({ where: { id: inv.id } });
  assert.equal(second?.status, 'PAID');
  assert.equal(first?.paidAt?.getTime(), second?.paidAt?.getTime(), 'replay must not change paidAt');
});
