/**
 * P3.2 — recurring RETAINER invoice worker, full functional regression on the isolated test DB with
 * controlled/accelerated billing dates. Drives the REAL sweep + handler + durable-job engine.
 *
 * Covers: normal generation, amount/period/REC-numbering, cursor advance, repeated sweeps (idempotent),
 * duplicate enqueue (job key), duplicate/concurrent generation (DB unique), failure→retry→dead-letter,
 * failure→retry→succeed, cursor-not-advanced-on-failure, paused/terminal negatives, month-end anchors,
 * catch-up billing, reactivation-no-backfill, and existing project/milestone billing untouched.
 */
import '../_setup';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { sweepDueCarePlans, generateRetainerInvoice } from '../../src/billing/retainer';
import { processDueJobs } from '../../src/jobs/processor';
import { periodLabel } from '../../src/lib/billing-period';

const uid = () => randomUUID().slice(0, 8);
let tenantId: string;

type PlanOver = Partial<{ status: string; monthlyAmountCents: number; billingAnchorDay: number; nextInvoiceAt: Date; currency: string; name: string }>;
async function mkPlan(over: PlanOver = {}) {
  const org = await prisma.clientOrg.create({ data: { tenantId, name: `CP-${uid()}`, slug: `cp-${uid()}` } });
  return prisma.carePlan.create({
    data: {
      tenantId, clientOrgId: org.id,
      name: over.name ?? 'Care Plan — Growth',
      status: (over.status ?? 'ACTIVE') as never,
      monthlyAmountCents: over.monthlyAmountCents ?? 50000,
      currency: over.currency ?? 'USD',
      billingAnchorDay: over.billingAnchorDay ?? 15,
      nextInvoiceAt: over.nextInvoiceAt ?? new Date(),
    },
  });
}
const reloadPlan = (id: string) => prisma.carePlan.findUniqueOrThrow({ where: { id } });
const retainers = (carePlanId: string) => prisma.invoice.findMany({ where: { carePlanId }, orderBy: { billingPeriodStart: 'asc' } });
const run = async (now: Date) => { await sweepDueCarePlans(prisma, now); return processDueJobs(prisma, now); };

// A prisma whose $transaction always throws — injects a real (non-P2002) generation failure so we can
// exercise retry + dead-letter and prove the cursor never advances. Everything else is the real client.
function failingTx(): typeof prisma {
  return new Proxy(prisma, {
    get(target, prop, receiver) {
      if (prop === '$transaction') return async () => { throw new Error('injected generation failure'); };
      const v = Reflect.get(target, prop, receiver);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  }) as typeof prisma;
}

before(async () => { tenantId = (await resolveDefaultTenant(prisma)).id; });
after(async () => { await prisma.$disconnect(); });

// The sweep is GLOBAL (all ACTIVE plans), so wipe the retainer state between tests: no leftover plan
// is ever "due" for a later test's date, keeping per-test enqueue/invoice counts exact. Deleting a
// plan sets its invoices' carePlanId → null (FK ON DELETE SET NULL), so orphan invoices can't match a
// later test's per-plan query.
beforeEach(async () => {
  // processDueJobs drains the GLOBAL job queue (any type/tenant), so a leftover PENDING job from
  // ANY other test file — surfaced when the suite runs more than one file — would be claimed here and
  // pushed through the failing-tx proxy (a ~30s email/network timeout). Clear ALL side-effect jobs, not
  // just retainer ones, so this file only ever processes jobs it created. (Runner executes files
  // sequentially, so this never races another file's in-flight jobs.)
  await prisma.sideEffectJob.deleteMany({});
  await prisma.carePlan.deleteMany({});
});

test('normal: generates one RETAINER invoice, correct amount/period/REC-number, advances the cursor', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-01-15T12:00:00Z'), billingAnchorDay: 15, monthlyAmountCents: 75000 });
  const enq = await sweepDueCarePlans(prisma, new Date('2026-01-15T18:00:00Z'));
  assert.equal(enq, 1);
  const sum = await processDueJobs(prisma, new Date('2026-01-15T18:00:00Z'));
  assert.equal(sum.succeeded, 1);
  const invs = await retainers(plan.id);
  assert.equal(invs.length, 1);
  const inv = invs[0];
  assert.equal(inv.kind, 'RETAINER');
  assert.equal(inv.amountCents, 75000);
  assert.equal(inv.status, 'SENT');
  assert.match(inv.number, /^REC-\d{4,}$/);
  assert.equal(periodLabel(inv.billingPeriodStart!), '2026-01-15');
  assert.equal(periodLabel(inv.billingPeriodEnd!), '2026-02-14');
  const li = await prisma.invoiceLineItem.findMany({ where: { invoiceId: inv.id } });
  assert.equal(li.length, 1);
  assert.equal(li[0].amountCents, 75000);
  assert.equal(periodLabel((await reloadPlan(plan.id)).nextInvoiceAt!), '2026-02-15'); // cursor advanced
});

test('idempotent: repeated sweep+process at the same instant never double-bills a period', async () => {
  const now = new Date('2026-01-15T18:00:00Z');
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-01-15T12:00:00Z'), billingAnchorDay: 15 });
  await run(now);
  const enq2 = await sweepDueCarePlans(prisma, now); // cursor now Feb 15 > now → not due
  assert.equal(enq2, 0);
  await processDueJobs(prisma, now);
  assert.equal((await retainers(plan.id)).length, 1);
});

test('idempotent: a duplicate enqueue for the same period is a no-op (job idempotencyKey)', async () => {
  const now = new Date('2026-06-15T18:00:00Z');
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-06-15T12:00:00Z'), billingAnchorDay: 15 });
  const a = await sweepDueCarePlans(prisma, now);
  const b = await sweepDueCarePlans(prisma, now); // same period → key collision → skipped
  assert.equal(a, 1);
  assert.equal(b, 0);
  const jobs = await prisma.sideEffectJob.count({ where: { type: 'GENERATE_RETAINER_INVOICE', idempotencyKey: `${plan.id}:${periodLabel(plan.nextInvoiceAt!)}` } });
  assert.equal(jobs, 1);
  await processDueJobs(prisma, now);
  assert.equal((await retainers(plan.id)).length, 1);
});

test('DB guard: a second invoice for the same (carePlan, period) is rejected by the unique constraint', async () => {
  const now = new Date('2026-07-15T18:00:00Z');
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-07-15T12:00:00Z'), billingAnchorDay: 15 });
  await run(now);
  const inv1 = (await retainers(plan.id))[0];
  await assert.rejects(
    prisma.invoice.create({ data: { tenantId, clientOrgId: plan.clientOrgId, carePlanId: plan.id, kind: 'RETAINER', number: `REC-DUP-${uid()}`, amountCents: 1, currency: 'USD', status: 'SENT', billingPeriodStart: inv1.billingPeriodStart! } }),
    (e: unknown) => (e as { code?: string }).code === 'P2002',
  );
  assert.equal((await retainers(plan.id)).length, 1);
});

test('concurrent/stale: a second handler for an already-billed period is a P2002 no-op (no dup, no re-advance)', async () => {
  const now = new Date('2026-08-15T18:00:00Z');
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-08-15T12:00:00Z'), billingAnchorDay: 15 });
  await run(now);
  const advanced = await reloadPlan(plan.id);
  // Simulate a stale concurrent worker: rewind the cursor to the just-billed period and replay the job.
  await prisma.carePlan.update({ where: { id: plan.id }, data: { nextInvoiceAt: new Date('2026-08-15T12:00:00Z') } });
  const staleJob = await prisma.sideEffectJob.create({ data: { tenantId, type: 'GENERATE_RETAINER_INVOICE', payload: { carePlanId: plan.id, period: '2026-08-15' }, idempotencyKey: `${plan.id}:2026-08-15:stale` } });
  await generateRetainerInvoice(prisma, staleJob); // invoice exists → P2002 caught → no-op
  assert.equal((await retainers(plan.id)).length, 1); // still exactly one invoice
  // restore the advanced cursor for cleanliness
  await prisma.carePlan.update({ where: { id: plan.id }, data: { nextInvoiceAt: advanced.nextInvoiceAt } });
});

test('failure → retry → dead-letter; the cursor NEVER advances and NO invoice is written', async () => {
  const cursor = new Date('2026-09-15T12:00:00Z');
  const plan = await mkPlan({ nextInvoiceAt: cursor, billingAnchorDay: 15 });
  const job = await prisma.sideEffectJob.create({ data: { tenantId, type: 'GENERATE_RETAINER_INVOICE', payload: { carePlanId: plan.id, period: '2026-09-15' }, idempotencyKey: `${plan.id}:2026-09-15`, maxAttempts: 2 } });
  const t0 = new Date('2026-09-15T18:00:00Z');
  const s1 = await processDueJobs(failingTx(), t0);            // attempt 1 → fail → PENDING w/ backoff
  assert.equal(s1.failed, 1);
  const s2 = await processDueJobs(failingTx(), new Date(t0.getTime() + 10 * 60_000)); // attempt 2 → maxAttempts → DEAD
  assert.equal(s2.dead, 1);
  assert.equal((await prisma.sideEffectJob.findUniqueOrThrow({ where: { id: job.id } })).status, 'DEAD');
  assert.equal((await reloadPlan(plan.id)).nextInvoiceAt!.getTime(), cursor.getTime()); // cursor untouched
  assert.equal((await retainers(plan.id)).length, 0);                                    // no invoice
  // A lead-less DEAD job must NOT spawn the broken INTERNAL_NOTIFY dead-letter alert (it hard-requires a lead).
  assert.equal(await prisma.sideEffectJob.count({ where: { type: 'INTERNAL_NOTIFY' as never, idempotencyKey: `${job.id}:DEAD_ALERT` } }), 0);
});

test('overlap guard: the worker refuses to bill a period overlapping prior coverage — no double-bill, fast-forwards', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-04-15T12:00:00Z'), billingAnchorDay: 15 });
  await run(new Date('2026-04-15T18:00:00Z')); // bills Apr15 (covers Apr15–May14); cursor → May15
  assert.equal((await retainers(plan.id)).length, 1);
  // Simulate a cursor mis-set back INTO the paid period (Apr22, inside Apr15–May14).
  await prisma.carePlan.update({ where: { id: plan.id }, data: { nextInvoiceAt: new Date('2026-04-22T12:00:00Z') } });
  const job = await prisma.sideEffectJob.create({ data: { tenantId, type: 'GENERATE_RETAINER_INVOICE', payload: { carePlanId: plan.id, period: '2026-04-22' }, idempotencyKey: `${plan.id}:2026-04-22` } });
  await generateRetainerInvoice(prisma, job);
  assert.equal((await retainers(plan.id)).length, 1);                                    // NO second invoice
  assert.equal(periodLabel((await reloadPlan(plan.id)).nextInvoiceAt!), '2026-05-15');   // fast-forwarded past coverage
});

test('self-heal: the sweep revives a DEAD generation job (throttled) so a plan never permanently stops billing', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-01-15T12:00:00Z'), billingAnchorDay: 15 });
  const dead = await prisma.sideEffectJob.create({ data: { tenantId, type: 'GENERATE_RETAINER_INVOICE', payload: { carePlanId: plan.id, period: '2026-01-15' }, idempotencyKey: `${plan.id}:2026-01-15`, status: 'DEAD' as never, attempts: 6, lastError: 'boom' } });
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h past the job's (real) updatedAt → past the DEAD_RETRY throttle
  assert.ok((await sweepDueCarePlans(prisma, now)) >= 1);
  assert.equal((await prisma.sideEffectJob.findUniqueOrThrow({ where: { id: dead.id } })).status, 'PENDING');
  assert.ok((await processDueJobs(prisma, now)).succeeded >= 1);
  assert.equal((await retainers(plan.id)).length, 1); // billing resumed
});

test('self-heal: the sweep revives a crash-stranded PROCESSING job only after the lease expires', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-02-15T12:00:00Z'), billingAnchorDay: 15 });
  const stuck = await prisma.sideEffectJob.create({ data: { tenantId, type: 'GENERATE_RETAINER_INVOICE', payload: { carePlanId: plan.id, period: '2026-02-15' }, idempotencyKey: `${plan.id}:2026-02-15`, status: 'PROCESSING' as never, attempts: 1 } });
  // Fresh PROCESSING (age ~0) must NOT be revived (a live worker owns it).
  assert.equal(await sweepDueCarePlans(prisma, new Date(Date.now() + 1000)), 0);
  assert.equal((await prisma.sideEffectJob.findUniqueOrThrow({ where: { id: stuck.id } })).status, 'PROCESSING');
  // After the 10-minute lease, the stranded job IS revived.
  assert.ok((await sweepDueCarePlans(prisma, new Date(Date.now() + 15 * 60 * 1000))) >= 1);
  assert.equal((await prisma.sideEffectJob.findUniqueOrThrow({ where: { id: stuck.id } })).status, 'PENDING');
});

test('failure → retry → succeed; exactly one invoice, cursor advances once', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-10-15T12:00:00Z'), billingAnchorDay: 15 });
  const job = await prisma.sideEffectJob.create({ data: { tenantId, type: 'GENERATE_RETAINER_INVOICE', payload: { carePlanId: plan.id, period: '2026-10-15' }, idempotencyKey: `${plan.id}:2026-10-15`, maxAttempts: 5 } });
  const t0 = new Date('2026-10-15T18:00:00Z');
  await processDueJobs(failingTx(), t0);                             // attempt 1 fails → PENDING backoff
  const s2 = await processDueJobs(prisma, new Date(t0.getTime() + 10 * 60_000)); // attempt 2 succeeds
  assert.equal(s2.succeeded, 1);
  assert.equal((await prisma.sideEffectJob.findUniqueOrThrow({ where: { id: job.id } })).status, 'SUCCEEDED');
  assert.equal((await retainers(plan.id)).length, 1);
  assert.equal(periodLabel((await reloadPlan(plan.id)).nextInvoiceAt!), '2026-11-15');
});

test('negative: PAUSED / CANCELED / COMPLETED / DRAFT plans never generate an invoice', async () => {
  for (const status of ['PAUSED', 'CANCELED', 'COMPLETED', 'DRAFT'] as const) {
    const plan = await mkPlan({ status, nextInvoiceAt: new Date('2026-01-01T12:00:00Z'), billingAnchorDay: 15 });
    const now = new Date('2026-12-31T18:00:00Z');
    const enq = await sweepDueCarePlans(prisma, now); // sweep filters status=ACTIVE
    // Also assert the handler refuses even if a job is force-created (pause-in-flight race).
    const job = await prisma.sideEffectJob.create({ data: { tenantId, type: 'GENERATE_RETAINER_INVOICE', payload: { carePlanId: plan.id, period: '2026-01-01' }, idempotencyKey: `${plan.id}:force-${uid()}` } });
    await generateRetainerInvoice(prisma, job);
    assert.equal((await retainers(plan.id)).length, 0, `status ${status} must not generate`);
    void enq;
  }
});

test('month-end: activation on the 31st bills the capped anchor (28), never an invalid Feb date', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-01-31T18:00:00Z'), billingAnchorDay: 28, monthlyAmountCents: 30000 });
  await run(new Date('2026-01-31T18:00:00Z'));
  assert.equal(periodLabel((await reloadPlan(plan.id)).nextInvoiceAt!), '2026-02-28'); // not Feb 31
  await run(new Date('2026-02-28T18:00:00Z'));
  assert.equal(periodLabel((await reloadPlan(plan.id)).nextInvoiceAt!), '2026-03-28');
  const invs = await retainers(plan.id);
  assert.equal(invs.length, 2);
  assert.deepEqual(invs.map((i) => periodLabel(i.billingPeriodStart!)), ['2026-01-31', '2026-02-28']);
  assert.equal(periodLabel(invs[0].billingPeriodEnd!), '2026-02-27');
});

test('catch-up: a plan idle across boundaries bills each owed period exactly once, one per run', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2025-11-15T12:00:00Z'), billingAnchorDay: 15 });
  const now = new Date('2026-01-20T12:00:00Z'); // Nov, Dec, Jan are due; Feb 15 is not
  for (let i = 0; i < 6; i++) {
    if ((await reloadPlan(plan.id)).nextInvoiceAt!.getTime() > now.getTime()) break;
    await run(now);
  }
  const invs = await retainers(plan.id);
  assert.deepEqual(invs.map((i) => periodLabel(i.billingPeriodStart!)), ['2025-11-15', '2025-12-15', '2026-01-15']);
  assert.equal(periodLabel((await reloadPlan(plan.id)).nextInvoiceAt!), '2026-02-15');
});

test('reactivation: a reactivated plan (cursor reset to now) bills only the current period — no back-billing', async () => {
  // P3.1 sets nextInvoiceAt = now on (re)activation, so a paused stretch is never back-billed.
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-03-20T12:00:00Z'), billingAnchorDay: 20 });
  await run(new Date('2026-03-20T18:00:00Z'));
  const invs = await retainers(plan.id);
  assert.equal(invs.length, 1);
  assert.equal(periodLabel(invs[0].billingPeriodStart!), '2026-03-20');
});

test('additive: existing project/milestone invoices are completely untouched by retainer generation', async () => {
  const plan = await mkPlan({ nextInvoiceAt: new Date('2026-05-15T12:00:00Z'), billingAnchorDay: 15 });
  const project = await prisma.project.create({ data: { tenantId, clientOrgId: plan.clientOrgId, name: `P-${uid()}` } });
  const milestone = await prisma.invoice.create({ data: { tenantId, projectId: project.id, clientOrgId: plan.clientOrgId, kind: 'MILESTONE', number: `INV-${uid()}`, amountCents: 999, currency: 'USD', status: 'SENT' } });
  await run(new Date('2026-05-15T18:00:00Z'));
  const mi = await prisma.invoice.findUniqueOrThrow({ where: { id: milestone.id } });
  assert.equal(mi.kind, 'MILESTONE');
  assert.equal(mi.amountCents, 999);
  assert.equal(mi.carePlanId, null);         // never linked to a care plan
  assert.equal(mi.billingPeriodStart, null); // no billing period stamped on non-retainer invoices
  const rs = await retainers(plan.id);
  assert.equal(rs.length, 1);
  assert.equal(rs[0].projectId, null);       // retainer invoice is org-scoped, not project-scoped
});
