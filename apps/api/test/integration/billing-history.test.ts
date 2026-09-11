/**
 * Slice 6 — relationship-wide client Billing History (GET /portal/billing) + the converged /portal/project
 * block. Proves the three headline guarantees (multi-project → all invoices; DRAFT never; cross-org never),
 * plus retainer-once, mixed-currency aggregates, VOIDED $0, overdue semantics (stored OVERDUE + SENT
 * past-due), foreign-project filtering, equal-timestamp keyset pagination, OWNER/MEMBER isolation,
 * shared-helper parity, older-project detail/PDF/pay, and a zero-write assertion. Read-only slice.
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
let tenantId: string, TB: string;
let orgA: string, orgB: string;
let projA1: string, projA2: string, projB: string;
let ownerA: { id: string; clientOrgId: string; email: string };
let memberA: { id: string; clientOrgId: string; email: string };
let ownerB: { id: string; clientOrgId: string; email: string };
// known orgA invoice ids
const I: Record<string, string> = {};

const auth = (u: { id: string; clientOrgId: string; email: string }, tenant = tenantId) => ({ authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant, email: u.email })}` });
const GET = (url: string, u: { id: string; clientOrgId: string; email: string }, tenant = tenantId) => app.inject({ method: 'GET', url, headers: auth(u, tenant) });
const bill = async (u: typeof ownerA, qs = '') => { const r = await GET(`/v1/portal/billing${qs}`, u); return { s: r.statusCode, b: JSON.parse(r.body || '{}') }; };
const ids = (b: { invoices?: { id: string }[] }) => (b.invoices ?? []).map((i) => i.id);

type Inv = { org?: string; projectId?: string | null; tenant?: string; kind?: string; status: string; amountCents: number; currency?: string; dueAt?: Date | null; paidAt?: Date | null; createdAt?: Date; carePlanId?: string | null; billingPeriodStart?: Date | null; billingPeriodEnd?: Date | null };
async function mkInvoice(o: Inv): Promise<string> {
  const inv = await prisma.invoice.create({ data: {
    tenantId: o.tenant ?? tenantId, projectId: o.projectId ?? null, clientOrgId: o.projectId ? null : (o.org ?? null),
    number: `INV-${uid()}`, kind: (o.kind ?? 'STANDARD') as never, status: o.status as never,
    amountCents: o.amountCents, currency: o.currency ?? 'USD',
    issuedAt: new Date(), dueAt: o.dueAt ?? null, paidAt: o.paidAt ?? null,
    ...(o.createdAt ? { createdAt: o.createdAt } : {}),
    carePlanId: o.carePlanId ?? null, billingPeriodStart: o.billingPeriodStart ?? null, billingPeriodEnd: o.billingPeriodEnd ?? null,
  } });
  return inv.id;
}
const PAST = new Date(Date.now() - 86400000);
const FUTURE = new Date(Date.now() + 30 * 86400000);

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  TB = (await prisma.tenant.create({ data: { slug: `bh-tb-${uid()}`, name: 'TB' } })).id;
  const mkOrg = (t = tenantId) => prisma.clientOrg.create({ data: { tenantId: t, name: `bh ${uid()}`, slug: `bh-${uid()}` } }).then((o) => o.id);
  const mkClient = async (o: string, role: 'OWNER' | 'MEMBER', t = tenantId) => { const e = `bh-${uid()}@ex.com`; const u = await prisma.clientUser.create({ data: { tenantId: t, clientOrgId: o, email: e, normalizedEmail: e, passwordHash: 'x', role, active: true } }); return { id: u.id, clientOrgId: o, email: e }; };
  orgA = await mkOrg(); orgB = await mkOrg();
  const orgTB = await mkOrg(TB);
  projA1 = (await prisma.project.create({ data: { tenantId, clientOrgId: orgA, name: 'A1 (older)' } })).id;
  projA2 = (await prisma.project.create({ data: { tenantId, clientOrgId: orgA, name: 'A2 (newer)' } })).id;
  projB = (await prisma.project.create({ data: { tenantId, clientOrgId: orgB, name: 'B' } })).id;
  ownerA = await mkClient(orgA, 'OWNER'); memberA = await mkClient(orgA, 'MEMBER'); ownerB = await mkClient(orgB, 'OWNER');
  await prisma.carePlan.create({ data: { tenantId, clientOrgId: orgA, name: 'Care', monthlyAmountCents: 8000, currency: 'USD', status: 'ACTIVE' } });

  // orgA invoice fixtures (known amounts):
  I.a1_sent = await mkInvoice({ projectId: projA1, status: 'SENT', amountCents: 10000, dueAt: FUTURE });          // older project, unpaid
  I.a2_paid = await mkInvoice({ projectId: projA2, status: 'PAID', amountCents: 20000, paidAt: new Date() });     // newer project, paid
  I.a2_draft = await mkInvoice({ projectId: projA2, status: 'DRAFT', amountCents: 5000 });                        // must NEVER appear
  I.a1_void = await mkInvoice({ projectId: projA1, status: 'VOIDED', amountCents: 3000 });                        // shown, $0 to totals
  I.retainer = await mkInvoice({ org: orgA, projectId: null, kind: 'RETAINER', status: 'SENT', amountCents: 8000, dueAt: FUTURE, billingPeriodStart: PAST, billingPeriodEnd: FUTURE }); // org-level, once
  I.sent_overdue = await mkInvoice({ projectId: projA1, status: 'SENT', amountCents: 4000, dueAt: PAST });        // derived-overdue
  I.stored_overdue = await mkInvoice({ projectId: projA2, status: 'OVERDUE', amountCents: 6000 });                // stored OVERDUE
  I.cad = await mkInvoice({ projectId: projA1, status: 'SENT', amountCents: 7000, currency: 'CAD', dueAt: FUTURE }); // mixed currency
  // isolation fixtures:
  I.b_sent = await mkInvoice({ projectId: projB, status: 'SENT', amountCents: 99999 });                           // cross-org (orgB)
  I.b_overdue = await mkInvoice({ projectId: projB, status: 'SENT', amountCents: 88888, dueAt: PAST });           // cross-org OVERDUE (the OR-clobber path)
  await mkInvoice({ tenant: TB, org: orgTB, projectId: null, status: 'SENT', amountCents: 12345 });               // cross-tenant
});
after(async () => { await app.close(); await prisma.$disconnect(); });

// ── The three headline guarantees ──
test('HEADLINE 1: multi-project org → OWNER sees invoices from ALL projects + org retainer', async () => {
  const { s, b } = await bill(ownerA);
  assert.equal(s, 200);
  const got = ids(b);
  assert.ok(got.includes(I.a1_sent), 'older project A1 invoice present');
  assert.ok(got.includes(I.a2_paid), 'newer project A2 invoice present');
  assert.ok(got.includes(I.retainer), 'org-level retainer present');
  const projectIds = new Set((b.invoices as { projectId: string | null }[]).map((i) => i.projectId));
  assert.ok(projectIds.has(projA1) && projectIds.has(projA2), 'both projects represented');
});
test('HEADLINE 2: DRAFT never returned', async () => {
  assert.ok(!ids((await bill(ownerA)).b).includes(I.a2_draft));
  assert.ok(!ids((await bill(ownerA, '?status=all')).b).includes(I.a2_draft));
});
test('HEADLINE 3: cross-org + cross-tenant invoices never returned and never in aggregates', async () => {
  const { b } = await bill(ownerA);
  const got = ids(b);
  // orgB owner sees only orgB's one invoice; orgA's list contains none of orgB's / TB's.
  const bBody = (await bill(ownerB)).b;
  const bIds = new Set(ids(bBody));
  for (const id of got) assert.ok(!bIds.has(id), 'no orgA id leaks into orgB and vice versa');
  assert.equal(bBody.invoices.length, 2, 'orgB owner sees exactly their own 2 invoices');
  // aggregate proof: orgA USD paid = 20000 exactly (would inflate if orgB/TB leaked)
  assert.equal(b.aggregates.byCurrency.USD.lifetimePaidCents, 20000);
});

test('SECURITY: cross-org isolation holds on EVERY tab (incl. overdue — the OR-clobber regression)', async () => {
  for (const t of ['', '?status=all', '?status=unpaid', '?status=paid', '?status=overdue']) {
    const qs = `${t}${t.includes('?') ? '&' : '?'}limit=200`;
    const got = ids((await bill(ownerA, qs)).b);
    assert.ok(!got.includes(I.b_sent), `orgB SENT leaked on tab '${t || 'default'}'`);
    assert.ok(!got.includes(I.b_overdue), `orgB OVERDUE leaked on tab '${t || 'default'}'`);
  }
});

// ── Retainer once + currency + VOIDED + overdue + aggregates ──
test('retainer (projectId null) appears exactly once', async () => {
  const got = ids((await bill(ownerA, '?limit=200')).b);
  assert.equal(got.filter((x) => x === I.retainer).length, 1);
});
test('aggregates: per-currency, lifetimePaid=PAID, outstanding=SENT+OVERDUE, VOIDED/DRAFT $0', async () => {
  const a = (await bill(ownerA)).b.aggregates.byCurrency;
  // USD: paid=20000; outstanding = SENT(10000+8000 retainer+4000 overdue-sent) + OVERDUE(6000) = 28000; voided 3000 excluded, draft 5000 excluded
  assert.equal(a.USD.lifetimePaidCents, 20000);
  assert.equal(a.USD.outstandingCents, 28000);
  assert.equal(a.USD.counts.voided, 1);
  // CAD kept SEPARATE (never combined): outstanding 7000, paid 0
  assert.equal(a.CAD.outstandingCents, 7000);
  assert.equal(a.CAD.lifetimePaidCents, 0);
  assert.notEqual(a.USD.outstandingCents, a.USD.outstandingCents + a.CAD.outstandingCents);
});
test('overdue semantics: stored OVERDUE + SENT-past-due both count; future-due does not', async () => {
  const overdue = ids((await bill(ownerA, '?status=overdue&limit=200')).b);
  assert.ok(overdue.includes(I.sent_overdue) && overdue.includes(I.stored_overdue));
  assert.ok(!overdue.includes(I.a1_sent), 'future-due SENT is not overdue');
  assert.ok(!overdue.includes(I.a2_paid) && !overdue.includes(I.a1_void));
  assert.equal((await bill(ownerA)).b.aggregates.byCurrency.USD.overdueCount, 2);
});
test('VOIDED shown in list but $0 to lifetime + outstanding', async () => {
  const got = ids((await bill(ownerA, '?limit=200')).b);
  assert.ok(got.includes(I.a1_void), 'VOIDED appears in the list');
  // proven $0 by the USD totals above (28000 outstanding excludes the 3000 voided; 20000 paid excludes it)
});
test('tabs: Unpaid=SENT+OVERDUE, Paid=PAID, All=non-DRAFT', async () => {
  const unpaid = ids((await bill(ownerA, '?status=unpaid&limit=200')).b);
  assert.ok([I.a1_sent, I.sent_overdue, I.stored_overdue, I.retainer, I.cad].every((x) => unpaid.includes(x)));
  assert.ok(!unpaid.includes(I.a2_paid) && !unpaid.includes(I.a1_void) && !unpaid.includes(I.a2_draft));
  const paid = ids((await bill(ownerA, '?status=paid&limit=200')).b);
  assert.deepEqual(paid, [I.a2_paid]);
});

// ── Foreign-project filtering ──
test('project filter: own project narrows (retainers dropped); a FOREIGN projectId yields empty', async () => {
  const own = ids((await bill(ownerA, `?projectId=${projA1}&limit=200`)).b);
  assert.ok(own.includes(I.a1_sent) && own.includes(I.cad) && !own.includes(I.retainer) && !own.includes(I.a2_paid));
  const foreign = await bill(ownerA, `?projectId=${projB}`); // orgB's project
  assert.equal(foreign.s, 200);
  assert.equal(foreign.b.invoices.length, 0, 'foreign projectId leaks nothing');
});

// ── Equal-timestamp keyset pagination ──
test('keyset pagination is stable across EQUAL createdAt rows (no dup / no skip)', async () => {
  const orgK = (await prisma.clientOrg.create({ data: { tenantId, name: `bhk ${uid()}`, slug: `bhk-${uid()}` } })).id;
  const projK = (await prisma.project.create({ data: { tenantId, clientOrgId: orgK, name: 'K' } })).id;
  const e = `bhk-${uid()}@ex.com`;
  const ownerK = { id: (await prisma.clientUser.create({ data: { tenantId, clientOrgId: orgK, email: e, normalizedEmail: e, passwordHash: 'x', role: 'OWNER', active: true } })).id, clientOrgId: orgK, email: e };
  const same = new Date('2099-06-01T00:00:00.000Z');
  const made = new Set<string>();
  for (let i = 0; i < 5; i++) made.add(await mkInvoice({ projectId: projK, status: 'SENT', amountCents: 1000 + i, createdAt: same }));
  const seen: string[] = []; let cursor: string | null = null;
  for (let p = 0; p < 6; p++) {
    const r = (await bill(ownerK, `?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)).b;
    seen.push(...ids(r)); cursor = r.nextCursor; if (!cursor) break;
  }
  assert.equal(seen.length, 5);
  assert.equal(new Set(seen).size, 5, 'no duplicates');
  assert.ok([...made].every((id) => seen.includes(id)), 'no skipped rows');
});

// ── OWNER / MEMBER / deactivated isolation ──
test('OWNER 200; MEMBER 403; deactivated → 401', async () => {
  assert.equal((await GET('/v1/portal/billing', ownerA)).statusCode, 200);
  assert.equal((await GET('/v1/portal/billing', memberA)).statusCode, 403);
  const e = `bhd-${uid()}@ex.com`;
  const dead = { id: (await prisma.clientUser.create({ data: { tenantId, clientOrgId: orgA, email: e, normalizedEmail: e, passwordHash: 'x', role: 'OWNER', active: true } })).id, clientOrgId: orgA, email: e };
  assert.equal((await GET('/v1/portal/billing', dead)).statusCode, 200);
  await prisma.clientUser.update({ where: { id: dead.id }, data: { active: false } });
  assert.equal((await GET('/v1/portal/billing', dead)).statusCode, 401);
});

// ── Shared-helper parity: legacy /portal/project block == GET /portal/billing ──
test('shared-helper parity: /portal/project.billing invoices == /portal/billing (all-projects, DRAFT-excluded)', async () => {
  const proj = JSON.parse((await GET('/v1/portal/project', ownerA)).body);
  const legacyIds = (proj.billing.invoices as { id: string }[]).map((i) => i.id).sort();
  const newIds = ids((await bill(ownerA, '?limit=200')).b).sort();
  assert.deepEqual(legacyIds, newIds);
  assert.ok(!legacyIds.includes(I.a2_draft), 'legacy block now also excludes DRAFT');
});

// ── Older-project invoice detail / PDF / pay still work (org-wide resolvers untouched) ──
test('older-project invoice detail + PDF + pay-demo still work (surfaced by the all-projects list)', async () => {
  assert.equal((await GET(`/v1/portal/invoices/${I.a1_sent}`, ownerA)).statusCode, 200);   // detail
  assert.equal((await GET(`/v1/portal/invoices/${I.a1_sent}/pdf`, ownerA)).statusCode, 200); // PDF
  // pay-demo on a dedicated older-project invoice (proves the pay flow resolves org-wide)
  const payId = await mkInvoice({ projectId: projA1, status: 'SENT', amountCents: 2500, dueAt: FUTURE });
  const pay = await app.inject({ method: 'POST', url: `/v1/portal/invoices/${payId}/pay-demo`, headers: auth(ownerA) });
  assert.equal(pay.statusCode, 200);
  assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: payId } })).status, 'PAID');
});

// ── Zero-write: GET /portal/billing mutates nothing ──
test('GET /portal/billing performs ZERO writes (invoice/payment rows + statuses unchanged)', async () => {
  const snap = async () => ({
    inv: (await prisma.invoice.findMany({ where: { tenantId }, select: { id: true, status: true, paidAt: true }, orderBy: { id: 'asc' } })),
    pay: await prisma.payment.count(),
  });
  const before = await snap();
  for (const q of ['', '?status=unpaid', '?status=paid', '?status=overdue', `?projectId=${projA1}`, '?limit=2']) await bill(ownerA, q);
  const afterS = await snap();
  assert.equal(afterS.pay, before.pay, 'no Payment rows created');
  assert.equal(JSON.stringify(afterS.inv), JSON.stringify(before.inv), 'no invoice row/status/paidAt change');
});
