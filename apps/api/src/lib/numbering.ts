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
  pad = 4,
): Promise<string> {
  const row = await tx.documentCounter.upsert({
    where: { tenantId_kind: { tenantId, kind } },
    update: { value: { increment: 1 } },
    create: { tenantId, kind, value: 1 },
  });
  // Existing callers keep the 4-digit house style (PROP-0001); tickets pass pad=6 (TKT-000001).
  // Either way it widens past the pad width, still unique.
  return `${prefix}-${String(row.value).padStart(pad, '0')}`;
}
