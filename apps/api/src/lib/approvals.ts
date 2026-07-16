// Approval enrichment — resolve requester (staff) + approver (client user) names.
// Approval has no FK relations for requestedByStaffId / decidedByUserId (they cross the
// staff↔client boundary), so we batch-resolve names in code and attach them to the payload.
import type { PrismaClient } from '@prisma/client';

const fullName = (u: { firstName: string | null; lastName: string | null; email: string }) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email;

type ApprovalLike = {
  requestedByStaffId?: string | null;
  decidedByUserId?: string | null;
  [k: string]: unknown;
};

/** Returns a shallow copy of each approval with `requestedByName` and `decidedByName` added. */
export async function enrichApprovals<T extends ApprovalLike>(
  prisma: PrismaClient,
  approvals: T[],
): Promise<(T & { requestedByName: string | null; decidedByName: string | null })[]> {
  if (approvals.length === 0) return [];
  const staffIds = [...new Set(approvals.map((a) => a.requestedByStaffId).filter(Boolean) as string[])];
  const clientIds = [...new Set(approvals.map((a) => a.decidedByUserId).filter(Boolean) as string[])];

  const [staff, clients] = await Promise.all([
    staffIds.length
      ? prisma.staffUser.findMany({ where: { id: { in: staffIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : Promise.resolve([]),
    clientIds.length
      ? prisma.clientUser.findMany({ where: { id: { in: clientIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : Promise.resolve([]),
  ]);
  const staffName = new Map(staff.map((s) => [s.id, fullName(s)]));
  const clientName = new Map(clients.map((c) => [c.id, fullName(c)]));

  return approvals.map((a) => ({
    ...a,
    requestedByName: a.requestedByStaffId ? staffName.get(a.requestedByStaffId) ?? null : null,
    decidedByName: a.decidedByUserId ? clientName.get(a.decidedByUserId) ?? null : null,
  }));
}
