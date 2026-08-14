import type { Prisma } from '@prisma/client';

/**
 * Allocate the next human-facing document number for a (tenant, kind), atomically.
 * Mirrors the race-safe upsert+increment the rate limiter uses: concurrent allocations
 * serialize on the (tenantId, kind) primary key, so numbers never collide. Call INSIDE a
 * `$transaction` so a failed record-create rolls the increment back (gap-free numbering).
 * `@@unique` on the target's number column remains the ultimate backstop.
 */
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  kind: string,
  prefix: string,
): Promise<string> {
  const row = await tx.documentCounter.upsert({
    where: { tenantId_kind: { tenantId, kind } },
    update: { value: { increment: 1 } },
    create: { tenantId, kind, value: 1 },
  });
  return `${prefix}-${String(row.value).padStart(4, '0')}`; // PROP-0001; widens past 9999, still unique
}
