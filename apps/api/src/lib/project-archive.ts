/**
 * Slice 7 — Past-Project Archive lifecycle writes (STAFF-only). archive/unarchive are compare-and-swap
 * guarded updates whose AuditEvent commits in the SAME transaction (so the audit row lands only on a real
 * state change). They NEVER touch Project.status: archive stamps archivedAt=now (delivery status is
 * preserved), unarchive clears archivedAt back to null (the project's prior lifecycle status is intact
 * because it was never changed). Idempotency/concurrency: the CAS WHERE (archivedAt null vs not-null)
 * means only the row still in the source state flips — a stale/concurrent second write matches zero rows
 * and returns `conflict`, never a silent double-write. No PortalActivity / notification / email here.
 */
import type { PrismaClient } from '@prisma/client';

export type ArchiveResult =
  | { ok: 'updated'; archivedAt: Date | null }
  | { ok: 'conflict'; archivedAt: Date | null } // project exists but is already in the target state
  | { ok: 'not_found' };

/** Archive: CAS archivedAt IS NULL → now(). PROJECT_ARCHIVED audit in the same tx. Status untouched. */
export async function archiveProject(prisma: PrismaClient, tenantId: string, staffId: string, projectId: string): Promise<ArchiveResult> {
  if (!tenantId || !projectId) return { ok: 'not_found' };
  const now = new Date();
  const count = await prisma.$transaction(async (tx) => {
    const upd = await tx.project.updateMany({ where: { id: projectId, tenantId, archivedAt: null }, data: { archivedAt: now } });
    if (upd.count === 1) {
      await tx.auditEvent.create({ data: { tenantId, entityType: 'Project', entityId: projectId, action: 'PROJECT_ARCHIVED', actorType: 'ADMIN', actorId: staffId, data: { archivedAt: now.toISOString() } } });
    }
    return upd.count;
  });
  if (count === 1) return { ok: 'updated', archivedAt: now };
  const cur = await prisma.project.findFirst({ where: { id: projectId, tenantId }, select: { archivedAt: true } });
  if (!cur) return { ok: 'not_found' };
  return { ok: 'conflict', archivedAt: cur.archivedAt }; // already archived
}

/** Unarchive: CAS archivedAt IS NOT NULL → null. PROJECT_UNARCHIVED audit in the same tx. Status untouched. */
export async function unarchiveProject(prisma: PrismaClient, tenantId: string, staffId: string, projectId: string): Promise<ArchiveResult> {
  if (!tenantId || !projectId) return { ok: 'not_found' };
  const count = await prisma.$transaction(async (tx) => {
    const upd = await tx.project.updateMany({ where: { id: projectId, tenantId, archivedAt: { not: null } }, data: { archivedAt: null } });
    if (upd.count === 1) {
      await tx.auditEvent.create({ data: { tenantId, entityType: 'Project', entityId: projectId, action: 'PROJECT_UNARCHIVED', actorType: 'ADMIN', actorId: staffId } });
    }
    return upd.count;
  });
  if (count === 1) return { ok: 'updated', archivedAt: null };
  const cur = await prisma.project.findFirst({ where: { id: projectId, tenantId }, select: { archivedAt: true } });
  if (!cur) return { ok: 'not_found' };
  return { ok: 'conflict', archivedAt: cur.archivedAt }; // already current (not archived)
}
