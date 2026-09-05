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
