/**
 * Recurring Care Plan (retainer) invoice generation — Phase 3 / P3.2.
 *
 * ADDITIVE ONLY: touches nothing about deposit/milestone/standard/final billing. It only ever
 * creates kind=RETAINER invoices for an ACTIVE Care Plan.
 *
 * Two stages, both idempotent:
 *   1. sweepDueCarePlans — the worker tick finds ACTIVE plans whose nextInvoiceAt cursor is due and
 *      enqueues ONE period-keyed job per plan. The unique job idempotencyKey `${planId}:${period}`
 *      makes a repeated sweep (every couple seconds) a no-op.
 *   2. generateRetainerInvoice — the job handler creates the invoice AND advances the cursor in ONE
 *      transaction, so a failure can never advance the cursor (→ the job just retries). Double-billing
 *      a period is impossible on three independent guards: the job key, the cursor-still-at-this-period
 *      check, and the DB unique (carePlanId, billingPeriodStart).
 */
import type { PrismaClient, SideEffectJob } from '@prisma/client';
import { nextDocumentNumber } from '../lib/numbering';
import { periodLabel, etDayNoonUTC, nextCycleStart, periodEndFor } from '../lib/billing-period';

const RETAINER_JOB = 'GENERATE_RETAINER_INVOICE';
const LEASE_MS = 10 * 60 * 1000;       // a PROCESSING job older than this is presumed crashed → revive
const DEAD_RETRY_MS = 60 * 60 * 1000;  // re-try a DEAD generation job at most hourly (not every tick)

/** Enqueue a generation job for every ACTIVE Care Plan whose billing cursor is due — and SELF-HEAL a
 *  stranded job for that period, so a plan's billing can never silently, permanently halt:
 *    • PENDING / fresh PROCESSING → leave it (in flight).
 *    • PROCESSING older than the lease → a worker crashed after claiming → reset to PENDING.
 *    • DEAD (exhausted retries) → reset to PENDING at most hourly so a fixed/transient failure resumes.
 *  Returns how many jobs were newly enqueued or revived. */
export async function sweepDueCarePlans(prisma: PrismaClient, now: Date): Promise<number> {
  const due = await prisma.carePlan.findMany({
    where: { status: 'ACTIVE', nextInvoiceAt: { lte: now } },
    select: { id: true, tenantId: true, nextInvoiceAt: true },
  });
  let enqueued = 0;
  for (const plan of due) {
    if (!plan.nextInvoiceAt) continue;
    const period = periodLabel(plan.nextInvoiceAt);
    const key = `${plan.id}:${period}`;
    const existing = await prisma.sideEffectJob.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      const age = now.getTime() - existing.updatedAt.getTime();
      const revive =
        existing.status === 'DEAD' ? age >= DEAD_RETRY_MS :
        existing.status === 'PROCESSING' ? age >= LEASE_MS :
        false; // PENDING or SUCCEEDED → leave as-is
      if (revive) {
        await prisma.sideEffectJob.update({ where: { id: existing.id }, data: { status: 'PENDING', attempts: 0, lastError: null, nextAttemptAt: now } });
        enqueued++;
      }
      continue;
    }
    try {
      // Due at THIS sweep's `now` (not the wall-clock default) so the same tick drains it — and so an
      // accelerated-clock test drives generation deterministically.
      await prisma.sideEffectJob.create({ data: { tenantId: plan.tenantId, type: RETAINER_JOB, payload: { carePlanId: plan.id, period }, idempotencyKey: key, nextAttemptAt: now } });
      enqueued++;
    } catch (err) {
      if ((err as { code?: string }).code !== 'P2002') throw err; // lost a create race → another worker has it
    }
  }
  return enqueued;
}

/** Generate the RETAINER invoice for one job. Idempotent + atomic (see file header). */
export async function generateRetainerInvoice(prisma: PrismaClient, job: SideEffectJob): Promise<void> {
  const payload = (job.payload ?? {}) as { carePlanId?: string; period?: string };
  const plan = await prisma.carePlan.findUnique({ where: { id: String(payload.carePlanId ?? '') } });

  // Never bill a plan that isn't ACTIVE (paused/canceled/completed/draft/deleted), or whose cursor has
  // already advanced past this job's period (a prior run, possibly on another worker, already billed it).
  if (!plan || plan.status !== 'ACTIVE' || !plan.nextInvoiceAt) return;
  const period = periodLabel(plan.nextInvoiceAt);
  if (period !== String(payload.period)) return;

  const periodStart = etDayNoonUTC(plan.nextInvoiceAt);

  // Defence-in-depth against double-billing: never bill a period that OVERLAPS already-billed coverage
  // (e.g. a cursor somehow set into a paid period). Skip billing and fast-forward the cursor to the day
  // after the covered range. In normal flow periodStart is always the day after the last period's end,
  // so this never triggers; it only guards a mis-set cursor.
  const lastBilled = await prisma.invoice.findFirst({ where: { carePlanId: plan.id, kind: 'RETAINER' }, orderBy: { billingPeriodEnd: 'desc' }, select: { billingPeriodEnd: true } });
  if (lastBilled?.billingPeriodEnd && periodStart.getTime() <= lastBilled.billingPeriodEnd.getTime()) {
    await prisma.carePlan.update({ where: { id: plan.id }, data: { nextInvoiceAt: etDayNoonUTC(new Date(lastBilled.billingPeriodEnd.getTime() + 24 * 60 * 60 * 1000)) } });
    return;
  }

  const periodEnd = periodEndFor(periodStart, plan.billingAnchorDay);
  const nextCursor = nextCycleStart(periodStart, plan.billingAnchorDay);

  try {
    await prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, plan.tenantId, 'RETAINER_INVOICE', 'REC');
      const inv = await tx.invoice.create({
        data: {
          tenantId: plan.tenantId, clientOrgId: plan.clientOrgId, carePlanId: plan.id,
          kind: 'RETAINER', number, amountCents: plan.monthlyAmountCents, currency: plan.currency,
          status: 'SENT', issuedAt: new Date(), dueAt: periodEnd,
          billingPeriodStart: periodStart, billingPeriodEnd: periodEnd,
          lineItems: { create: [{ tenantId: plan.tenantId, description: `${plan.name} — care plan (${period} to ${periodLabel(periodEnd)})`, quantity: 1, unitCents: plan.monthlyAmountCents, amountCents: plan.monthlyAmountCents }] },
        },
      });
      await tx.auditEvent.create({ data: { tenantId: plan.tenantId, entityType: 'Invoice', entityId: inv.id, action: 'RETAINER_INVOICE_GENERATED', actorType: 'SYSTEM', data: { carePlanId: plan.id, period, amountCents: plan.monthlyAmountCents } } });
      // Advance the cursor ONLY here — in the SAME transaction, so any failure above rolls it back too.
      await tx.carePlan.update({ where: { id: plan.id }, data: { nextInvoiceAt: nextCursor } });
    });
  } catch (err) {
    // Another worker won the race and already billed this exact period (unique on
    // carePlanId+billingPeriodStart). Idempotent no-op — do not retry, do not double-bill.
    if ((err as { code?: string }).code === 'P2002') return;
    throw err; // real failure → the job retries with backoff, then dead-letters; cursor stays put.
  }
}
