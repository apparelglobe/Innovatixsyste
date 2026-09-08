/**
 * Client-facing Care Plan selection (P3.3).
 *
 * Picks the ONE plan a client should see on their Billing surface and returns only
 * client-safe fields — never billingAnchorDay, autoPay, Stripe ids, or internal
 * timestamps. Selection is deterministic:
 *   1. The live plan (ACTIVE | PAUSED | PAST_DUE). A partial-unique DB index
 *      (care_plans_one_live_per_org) guarantees at most one live plan per org, so
 *      findFirst is unambiguous.
 *   2. Otherwise the most-recently-updated terminal plan (COMPLETED | CANCELED) → "Ended".
 *   3. DRAFT is NEVER selected — a stale terminal plan with a newer DRAFT still shows
 *      the terminal one as Ended; the DRAFT stays hidden. Only a DRAFT (nothing else)
 *      → null → no Care Plan card.
 */
import type { PrismaClient } from '@prisma/client';
import { MOMENT, MOMENT_MESSAGE } from './relationship-moments';
import { writeRelationshipActivity, systemActor } from './portal-activity';

/** Exactly the fields safe to expose to a client. */
const CLIENT_SAFE_SELECT = {
  name: true,
  monthlyAmountCents: true,
  currency: true,
  status: true,
  nextInvoiceAt: true,
  includedSummary: true,
} as const;

export type ClientCarePlan = {
  name: string;
  monthlyAmountCents: number;
  currency: string;
  status: 'ACTIVE' | 'PAUSED' | 'PAST_DUE' | 'COMPLETED' | 'CANCELED';
  nextInvoiceAt: Date | null;
  includedSummary: string | null;
};

export async function selectClientCarePlan(
  prisma: PrismaClient,
  tenantId: string,
  clientOrgId: string,
): Promise<ClientCarePlan | null> {
  const live = await prisma.carePlan.findFirst({
    where: { tenantId, clientOrgId, status: { in: ['ACTIVE', 'PAUSED', 'PAST_DUE'] } },
    select: CLIENT_SAFE_SELECT,
  });
  if (live) return live as ClientCarePlan;

  const terminal = await prisma.carePlan.findFirst({
    where: { tenantId, clientOrgId, status: { in: ['COMPLETED', 'CANCELED'] } },
    // Secondary key on id so two terminals sharing an updatedAt (e.g. migrated/backfilled rows) still
    // resolve to ONE deterministic pick rather than an arbitrary row.
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: CLIENT_SAFE_SELECT,
  });
  return (terminal as ClientCarePlan | null) ?? null; // DRAFT is never selected
}

/**
 * P3.4 — the MONEY-FREE relationship-status projection for the client workspace. This is deliberately
 * SEPARATE from selectClientCarePlan (which carries monthlyAmountCents and is OWNER-only): it returns
 * ONLY whether a Care Plan is live plus the next-report date, so it is safe to serve to EVERY client
 * role (owner + member) without regressing P3.3's owner-only billing.
 *
 * "active" is a COARSE boolean over the live-and-billing states (ACTIVE | PAST_DUE) — the raw status
 * enum NEVER leaves this function, so a member can't learn a plan is PAST_DUE (a payment-overdue fact).
 * PAUSED / DRAFT / terminal / no-plan all resolve to null → no workspace line (falls through to phase).
 * nextReportNote is intentionally NOT exposed (it is a staff field, not marked client-visible). The
 * partial-unique index guarantees ≤1 plan in {ACTIVE,PAST_DUE}, so findFirst is unambiguous.
 */
export async function selectClientCarePlanStatus(
  prisma: PrismaClient,
  tenantId: string,
  clientOrgId: string,
): Promise<{ active: boolean; nextReportAt: Date | null } | null> {
  if (!tenantId || !clientOrgId) return null; // defence-in-depth (Prisma treats undefined as no-filter)
  const plan = await prisma.carePlan.findFirst({
    where: { tenantId, clientOrgId, status: { in: ['ACTIVE', 'PAST_DUE'] } },
    select: { nextReportAt: true },
  });
  return plan ? { active: true, nextReportAt: plan.nextReportAt } : null;
}

/**
 * P3.4 — emit the curated RETAINER_ACTIVATED relationship-timeline moment, ATOMICALLY once per Care Plan.
 *
 * Concurrency-safety (not a raceable count-then-create): the PortalActivity row is written with a
 * DETERMINISTIC primary-key id `retainer-activated:<carePlanId>`. Postgres's primary-key unique index is
 * the guard — two concurrent activations both attempt this exact id, exactly ONE INSERT commits, and the
 * loser raises P2002 which we swallow as "already emitted". This also makes ordinary retries and a
 * PAUSED→ACTIVE reactivation of the same plan no-ops (same id). No new column/constraint → no migration.
 *
 * The moment message is STATIC and money-free (rendered to all roles on the client timeline). Slice 2:
 * a Care Plan is a RELATIONSHIP-level fact, so the row is written with projectId=null + the plan's org —
 * the pre-Slice-2 "attach to the org's most-recent project" heuristic is RETIRED. This now works for an
 * org with a live plan and ZERO projects (which previously recorded nothing), and never mis-attributes
 * the moment to an arbitrary project.
 */
export async function emitRetainerActivated(
  prisma: PrismaClient,
  plan: { id: string; tenantId: string; clientOrgId: string },
): Promise<void> {
  // Deterministic PK id makes concurrent activations / retries / a PAUSED→ACTIVE reactivation no-ops.
  await writeRelationshipActivity(
    prisma,
    { tenantId: plan.tenantId, clientOrgId: plan.clientOrgId },
    { id: `retainer-activated:${plan.id}`, type: MOMENT.RETAINER_ACTIVATED, message: MOMENT_MESSAGE[MOMENT.RETAINER_ACTIVATED], actor: systemActor() },
  );
}
