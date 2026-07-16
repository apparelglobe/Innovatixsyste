/**
 * Payment checkout — OWNER-only, org-scoped, amount-from-DB. Runs against the
 * built app on the test DB with the STUB gateway (default in test), so no network
 * or Stripe keys are touched. Stripe webhook settlement is covered separately in
 * stripe-webhook.test.ts.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signSession } from '../../src/portal/auth';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;

type U = { id: string; clientOrgId: string; email: string };
const mkUser = async (clientOrgId: string, role: 'OWNER' | 'MEMBER'): Promise<U> => {
  const email = `${role.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId, clientOrgId, email, normalizedEmail: email, passwordHash: 'x', role } });
};
const auth = (u: U) => ({ authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email })}`, 'content-type': 'application/json' });
const POST = (url: string, u: U, body?: object) => app.inject({ method: 'POST', url, headers: auth(u), payload: JSON.stringify(body ?? {}) });

const mkInvoice = async (orgId: string, over: Partial<{ amountCents: number; currency: string; status: 'DRAFT' | 'SENT' | 'PAID' }> = {}) => {
  const project = await prisma.project.create({ data: { tenantId, clientOrgId: orgId, name: `P-${uid()}` } });
  return prisma.invoice.create({ data: { tenantId, projectId: project.id, number: `INV-${uid()}`, amountCents: over.amountCents ?? 250000, currency: over.currency ?? 'USD', status: over.status ?? 'SENT' } });
};

let orgA: { id: string }, ownerA: U, memberA: U, ownerB: U;

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  orgA = await prisma.clientOrg.create({ data: { tenantId, name: 'Pay A', slug: `pay-a-${uid()}` } });
  const orgB = await prisma.clientOrg.create({ data: { tenantId, name: 'Pay B', slug: `pay-b-${uid()}` } });
  ownerA = await mkUser(orgA.id, 'OWNER');
  memberA = await mkUser(orgA.id, 'MEMBER');
  ownerB = await mkUser(orgB.id, 'OWNER');
});
after(async () => { await app.close(); await prisma.$disconnect(); });

test('OWNER can create a checkout session (stub → hosted /pay url) + records a PENDING payment', async () => {
  const inv = await mkInvoice(orgA.id);
  const res = await POST(`/v1/portal/invoices/${inv.id}/checkout`, ownerA);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.provider, 'stub');
  assert.match(body.url, new RegExp(`/pay/${inv.id}`)); // stub hosted page
  const pay = await prisma.payment.findFirstOrThrow({ where: { invoiceId: inv.id } });
  assert.equal(pay.status, 'PENDING');
  assert.equal(pay.provider, 'stub');
  assert.ok(pay.checkoutSessionId);
});

test('MEMBER cannot create a checkout session (403)', async () => {
  const inv = await mkInvoice(orgA.id);
  const res = await POST(`/v1/portal/invoices/${inv.id}/checkout`, memberA);
  assert.equal(res.statusCode, 403);
  assert.equal(await prisma.payment.count({ where: { invoiceId: inv.id } }), 0);
});

test('cross-org invoice returns 404 (no reveal)', async () => {
  const inv = await mkInvoice(orgA.id);
  const res = await POST(`/v1/portal/invoices/${inv.id}/checkout`, ownerB);
  assert.equal(res.statusCode, 404);
});

test('amount + currency come from the DB invoice, never the request body', async () => {
  const inv = await mkInvoice(orgA.id, { amountCents: 250000, currency: 'USD' });
  const res = await POST(`/v1/portal/invoices/${inv.id}/checkout`, ownerA, { amountCents: 1, currency: 'EUR', invoiceTotal: 1, status: 'PAID' });
  assert.equal(res.statusCode, 200);
  const pay = await prisma.payment.findFirstOrThrow({ where: { invoiceId: inv.id } });
  assert.equal(pay.amountCents, 250000, 'amount must be the server-side invoice amount');
  assert.equal(pay.currency, 'USD');
});

test('an already-paid invoice cannot create another payable checkout (409)', async () => {
  const inv = await mkInvoice(orgA.id, { status: 'PAID' });
  const res = await POST(`/v1/portal/invoices/${inv.id}/checkout`, ownerA);
  assert.equal(res.statusCode, 409);
});

test('a DRAFT invoice is not payable (409)', async () => {
  const inv = await mkInvoice(orgA.id, { status: 'DRAFT' });
  const res = await POST(`/v1/portal/invoices/${inv.id}/checkout`, ownerA);
  assert.equal(res.statusCode, 409);
});

test('payment records are tenant- and org-scoped', async () => {
  const inv = await mkInvoice(orgA.id);
  await POST(`/v1/portal/invoices/${inv.id}/checkout`, ownerA);
  const pay = await prisma.payment.findFirstOrThrow({ where: { invoiceId: inv.id } });
  assert.equal(pay.tenantId, tenantId);
  assert.equal(pay.clientOrgId, orgA.id);
});
