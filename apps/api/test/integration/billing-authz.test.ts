/**
 * P3.3 — Client Billing surface authorization + RETAINER visibility + Care Plan selection.
 *
 * Proves, server-side (the UI only mirrors this):
 *   • Billing is OWNER-only: a MEMBER gets NO billing block on /portal/project and is 403'd on
 *     invoice detail / PDF / checkout — even on a direct URL.
 *   • Org-scoped RETAINER invoices (projectId null) are readable/payable by their org's owner,
 *     appear in the billing list, and are isolated across org AND tenant.
 *   • selectClientCarePlan is deterministic: live (ACTIVE/PAUSED/PAST_DUE) wins; else most-recent
 *     terminal (COMPLETED/CANCELED) shows as Ended; DRAFT is NEVER exposed; only client-safe fields.
 *
 * Run:  NODE_ENV=test npx tsx --test test/integration/billing-authz.test.ts
 */
import '../_setup'; // MUST be first — points DATABASE_URL at the isolated test DB
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signSession } from '../../src/portal/auth';
import { selectClientCarePlan } from '../../src/lib/care-plan';

const uid = () => randomUUID().slice(0, 8);
const noon = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
// The P3.2 retainer worker's sweep is GLOBAL (every ACTIVE plan with nextInvoiceAt <= now) and runs in a
// SEPARATE test file that node executes CONCURRENTLY with this one. If our ACTIVE fixtures had a due
// cursor, that sweep would enqueue jobs for them and corrupt the worker file's counts. Pinning every
// ACTIVE fixture's cursor far into the future keeps our plans invisible to any real-dated sweep.
const FAR_FUTURE = noon('2099-01-15');

let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let tenantB: string;
let orgA: { id: string };
let ownerA: { id: string; clientOrgId: string; email: string };
let memberA: { id: string; clientOrgId: string; email: string };
let projectA: { id: string };

const mkUser = (clientOrgId: string, role: 'OWNER' | 'MEMBER', tenant = tenantId) => {
  const email = `${role.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId: tenant, clientOrgId, email, normalizedEmail: email, passwordHash: 'x', role } });
};
const mkOrg = (tenant = tenantId) => prisma.clientOrg.create({ data: { tenantId: tenant, name: `Org ${uid()}`, slug: `org-${uid()}` } });
const mkCarePlan = (clientOrgId: string, status: string, extra: Record<string, unknown> = {}, tenant = tenantId) =>
  prisma.carePlan.create({
    data: {
      tenantId: tenant, clientOrgId, name: `Care ${uid()}`, monthlyAmountCents: 250000, currency: 'USD', status: status as any,
      // ACTIVE fixtures get a far-future cursor by default (see FAR_FUTURE) so the concurrent global sweep never grabs them.
      nextInvoiceAt: status === 'ACTIVE' ? FAR_FUTURE : null,
      ...extra,
    },
  });
const mkRetainerInvoice = (clientOrgId: string, carePlanId: string, periodStartIso: string, status = 'SENT', tenant = tenantId) =>
  prisma.invoice.create({
    data: {
      tenantId: tenant, clientOrgId, carePlanId, projectId: null, kind: 'RETAINER',
      number: `REC-${uid()}`, amountCents: 250000, currency: 'USD', status: status as any,
      issuedAt: noon(periodStartIso), billingPeriodStart: noon(periodStartIso), billingPeriodEnd: noon(periodStartIso.replace(/-\d\d$/, '-28')),
    },
  });
const mkProjectInvoice = (projectId: string) =>
  prisma.invoice.create({ data: { tenantId, projectId, number: `INV-${uid()}`, amountCents: 100000, status: 'SENT' } });

const auth = (u: { id: string; clientOrgId: string; email: string }, tenant = tenantId) => ({
  authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant, email: u.email })}`,
  'content-type': 'application/json',
});
const GET = (url: string, u: any, tenant = tenantId) => app.inject({ method: 'GET', url, headers: auth(u, tenant) });
const POST = (url: string, u: any, tenant = tenantId) => app.inject({ method: 'POST', url, headers: auth(u, tenant), payload: '{}' });

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  tenantB = (await prisma.tenant.create({ data: { slug: `tenant-b-${uid()}`, name: 'Tenant B' } })).id;
  orgA = await mkOrg();
  ownerA = await mkUser(orgA.id, 'OWNER');
  memberA = await mkUser(orgA.id, 'MEMBER');
  projectA = await prisma.project.create({ data: { tenantId, clientOrgId: orgA.id, name: 'Proj A' } });
});

after(async () => {
  await app.close();
  await prisma.$disconnect();
});

// ── /portal/project billing block is OWNER-only ──────────────────────────────
test('OWNER receives a billing block; MEMBER receives billing: null', async () => {
  const ownerRes = await GET('/v1/portal/project', ownerA);
  assert.equal(ownerRes.statusCode, 200);
  assert.notEqual(JSON.parse(ownerRes.body).billing, null, 'owner must get a billing block');

  const memberRes = await GET('/v1/portal/project', memberA);
  assert.equal(memberRes.statusCode, 200);
  assert.equal(JSON.parse(memberRes.body).billing, null, 'member must get NO billing data');
});

// ── RETAINER invoice: readable by owner, in the list, isolated across org/tenant ──
test('OWNER can read an org-scoped RETAINER invoice; it appears in the billing list', async () => {
  const plan = await mkCarePlan(orgA.id, 'ACTIVE');
  const inv = await mkRetainerInvoice(orgA.id, plan.id, '2026-09-15');

  const detail = await GET(`/v1/portal/invoices/${inv.id}`, ownerA);
  assert.equal(detail.statusCode, 200);
  const body = JSON.parse(detail.body).invoice;
  assert.equal(body.kind, 'RETAINER');
  assert.ok(body.billingPeriodStart, 'retainer detail exposes billing period');

  const list = JSON.parse((await GET('/v1/portal/project', ownerA)).body).billing.invoices;
  assert.ok(list.some((i: any) => i.id === inv.id && i.kind === 'RETAINER'), 'retainer invoice must be in the billing list');
});

test('MEMBER is 403 on RETAINER invoice detail, PDF, and checkout (direct URL)', async () => {
  // Fresh org: the one-live-plan-per-org index means each live plan needs its own org.
  const org = await mkOrg();
  const plan = await mkCarePlan(org.id, 'ACTIVE');
  const inv = await mkRetainerInvoice(org.id, plan.id, '2026-08-15');
  // The role gate (invoice:read is OWNER-only) fires before org-scoping, so a member is 403'd on any billing route.
  assert.equal((await GET(`/v1/portal/invoices/${inv.id}`, memberA)).statusCode, 403);
  assert.equal((await GET(`/v1/portal/invoices/${inv.id}/pdf`, memberA)).statusCode, 403);
  assert.equal((await POST(`/v1/portal/invoices/${inv.id}/checkout`, memberA)).statusCode, 403);
});

test('MEMBER is 403 on a normal PROJECT invoice detail + PDF too', async () => {
  const inv = await mkProjectInvoice(projectA.id);
  assert.equal((await GET(`/v1/portal/invoices/${inv.id}`, memberA)).statusCode, 403);
  assert.equal((await GET(`/v1/portal/invoices/${inv.id}/pdf`, memberA)).statusCode, 403);
});

test('cross-org OWNER cannot read another org RETAINER invoice (404)', async () => {
  const orgX = await mkOrg();
  const orgB = await mkOrg();
  const ownerB = await mkUser(orgB.id, 'OWNER');
  const planX = await mkCarePlan(orgX.id, 'ACTIVE');
  const invX = await mkRetainerInvoice(orgX.id, planX.id, '2026-10-15');
  // ownerB is an OWNER (role gate passes) but the invoice belongs to another org → org scope → 404, not 403.
  assert.equal((await GET(`/v1/portal/invoices/${invX.id}`, ownerB)).statusCode, 404);
  assert.equal((await GET(`/v1/portal/invoices/${invX.id}/pdf`, ownerB)).statusCode, 404);
});

test('cross-tenant OWNER cannot read a RETAINER invoice from another tenant (404)', async () => {
  const orgTB = await mkOrg(tenantB);
  const planTB = await mkCarePlan(orgTB.id, 'ACTIVE', {}, tenantB);
  const invTB = await mkRetainerInvoice(orgTB.id, planTB.id, '2026-09-15', 'SENT', tenantB);
  // ownerA (tenant A) presents a token scoped to tenant A — the id belongs to tenant B → 404.
  assert.equal((await GET(`/v1/portal/invoices/${invTB.id}`, ownerA)).statusCode, 404);
});

test('OWNER can pay an org-scoped RETAINER invoice (pay-demo, stub only)', async () => {
  const org = await mkOrg();
  const owner = await mkUser(org.id, 'OWNER');
  const plan = await mkCarePlan(org.id, 'ACTIVE');
  const inv = await mkRetainerInvoice(org.id, plan.id, '2026-12-15');
  const res = await POST(`/v1/portal/invoices/${inv.id}/pay-demo`, owner);
  assert.equal(res.statusCode, 200);
  assert.equal((await prisma.invoice.findUnique({ where: { id: inv.id } }))?.status, 'PAID');
});

test('a DRAFT invoice PDF is never exposed, even to the OWNER (404)', async () => {
  const inv = await prisma.invoice.create({ data: { tenantId, projectId: projectA.id, number: `INV-${uid()}`, amountCents: 5000, status: 'DRAFT' } });
  assert.equal((await GET(`/v1/portal/invoices/${inv.id}/pdf`, ownerA)).statusCode, 404);
});

// ── selectClientCarePlan — deterministic state selection ─────────────────────
test('care plan selection: ACTIVE is returned, with only client-safe fields', async () => {
  const org = await mkOrg();
  await mkCarePlan(org.id, 'ACTIVE', { includedSummary: '10 hrs/mo', autoPay: true, stripeCustomerId: 'cus_secret' });
  const sel = await selectClientCarePlan(prisma, tenantId, org.id);
  assert.equal(sel?.status, 'ACTIVE');
  assert.equal(sel?.includedSummary, '10 hrs/mo');
  // Client-safe: internal/Stripe/anchor fields must NOT leak.
  assert.deepEqual(Object.keys(sel ?? {}).sort(), ['currency', 'includedSummary', 'monthlyAmountCents', 'name', 'nextInvoiceAt', 'status']);
});

test('care plan selection: PAUSED and PAST_DUE are returned (live states)', async () => {
  const orgP = await mkOrg();
  await mkCarePlan(orgP.id, 'PAUSED');
  assert.equal((await selectClientCarePlan(prisma, tenantId, orgP.id))?.status, 'PAUSED');

  const orgD = await mkOrg();
  await mkCarePlan(orgD.id, 'PAST_DUE');
  assert.equal((await selectClientCarePlan(prisma, tenantId, orgD.id))?.status, 'PAST_DUE');
});

test('care plan selection: a DRAFT-only org yields NO care plan (null)', async () => {
  const org = await mkOrg();
  await mkCarePlan(org.id, 'DRAFT');
  assert.equal(await selectClientCarePlan(prisma, tenantId, org.id), null);
});

test('care plan selection: old terminal + newer DRAFT → the terminal shows, DRAFT stays hidden', async () => {
  const org = await mkOrg();
  await mkCarePlan(org.id, 'CANCELED'); // older
  await mkCarePlan(org.id, 'DRAFT');    // newer — must NOT be selected
  const sel = await selectClientCarePlan(prisma, tenantId, org.id);
  assert.equal(sel?.status, 'CANCELED');
});

test('care plan selection: most-recent terminal wins when there is no live plan', async () => {
  const org = await mkOrg();
  await mkCarePlan(org.id, 'COMPLETED'); // older
  await mkCarePlan(org.id, 'CANCELED');  // newer
  assert.equal((await selectClientCarePlan(prisma, tenantId, org.id))?.status, 'CANCELED');
});

test('care plan selection: a live plan wins over a terminal one', async () => {
  const org = await mkOrg();
  await mkCarePlan(org.id, 'COMPLETED');
  await mkCarePlan(org.id, 'ACTIVE');
  assert.equal((await selectClientCarePlan(prisma, tenantId, org.id))?.status, 'ACTIVE');
});

// ── /portal/overview — the payable-invoice summary is OWNER-only (P3.3) ───────
const mkSentInvoice = (projectId: string, amountCents: number, tenant = tenantId) =>
  prisma.invoice.create({ data: { tenantId: tenant, projectId, number: `INV-${uid()}`, amountCents, status: 'SENT' } });
const mkProject = (clientOrgId: string, tenant = tenantId) =>
  prisma.project.create({ data: { tenantId: tenant, clientOrgId, name: `Ovw ${uid()}` } });

test('overview: OWNER receives payableInvoice; MEMBER receives none', async () => {
  const org = await mkOrg();
  const owner = await mkUser(org.id, 'OWNER');
  const member = await mkUser(org.id, 'MEMBER');
  const project = await mkProject(org.id);
  await mkSentInvoice(project.id, 120000);

  const ownerOvw = JSON.parse((await GET('/v1/portal/overview', owner)).body).project;
  assert.ok(ownerOvw?.payableInvoice, 'owner must receive payableInvoice');
  assert.equal(ownerOvw.payableInvoice.amountCents, 120000);

  const memberOvw = JSON.parse((await GET('/v1/portal/overview', member)).body).project;
  assert.equal(memberOvw?.payableInvoice, null, 'member must NOT receive payableInvoice data');
});

test('overview: payableInvoice never crosses orgs (an owner sees only their own org)', async () => {
  const orgWith = await mkOrg();
  const projWith = await mkProject(orgWith.id);
  await mkSentInvoice(projWith.id, 777);

  const orgWithout = await mkOrg();
  const ownerWithout = await mkUser(orgWithout.id, 'OWNER');
  await mkProject(orgWithout.id); // this org has NO SENT invoice
  const ovw = JSON.parse((await GET('/v1/portal/overview', ownerWithout)).body).project;
  assert.equal(ovw?.payableInvoice, null, 'an owner must never see another org’s payable invoice');
});

test('overview: a non-default-tenant session is rejected (401) — cross-tenant enforced at auth', async () => {
  // requireSession pins every portal call to the default tenant, so a session minted for another
  // tenant never authenticates — a tenant-B caller can never reach the overview or its payable-invoice
  // summary at all. (Query-level cross-tenant scoping is separately proven by the RETAINER 404 test.)
  const orgTB = await mkOrg(tenantB);
  const ownerTB = await mkUser(orgTB.id, 'OWNER', tenantB);
  const projTB = await mkProject(orgTB.id, tenantB);
  await mkSentInvoice(projTB.id, 4242, tenantB);
  assert.equal((await GET('/v1/portal/overview', ownerTB, tenantB)).statusCode, 401);
});
