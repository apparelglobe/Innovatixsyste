/**
 * Tenant/organization-scoped data-access helpers — the single safe way to fetch
 * a record from an untrusted id. Every helper folds the tenant (and, for client
 * routes, the client organization + visibility state) into the WHERE clause so a
 * bare `id` can never resolve a record from another tenant/org. Callers treat a
 * `null` result as 404 (never reveal existence).
 *
 * Rule enforced across the codebase: NO sensitive query uses an id alone. Route
 * handlers and workers call these instead of hand-writing `where: { id }`.
 */
import type { PrismaClient, Prisma } from '@prisma/client';

// ── Staff scope: tenant only (staff act tenant-wide within their tenant) ──────
export function findTenantProject(prisma: PrismaClient, tenantId: string, id: string) {
  return prisma.project.findFirst({ where: { id, tenantId } });
}
export function findTenantInvoice(prisma: PrismaClient, tenantId: string, id: string, include?: Prisma.InvoiceInclude) {
  return prisma.invoice.findFirst({ where: { id, tenantId }, ...(include ? { include } : {}) });
}
export function findTenantFile(prisma: PrismaClient, tenantId: string, id: string) {
  return prisma.projectFile.findFirst({ where: { id, tenantId, deletedAt: null } });
}
export function findTenantApproval(prisma: PrismaClient, tenantId: string, id: string) {
  return prisma.approval.findFirst({ where: { id, tenantId } });
}

// ── Client scope: tenant + client organization (a client never crosses orgs) ──
export function findClientOrgProject(prisma: PrismaClient, tenantId: string, clientOrgId: string, id: string) {
  return prisma.project.findFirst({ where: { id, tenantId, clientOrgId } });
}
export function findClientOrgInvoice(prisma: PrismaClient, tenantId: string, clientOrgId: string, id: string, include?: Prisma.InvoiceInclude) {
  // Defence-in-depth: a falsy tenant/org must never resolve an invoice. Prisma treats an `undefined`
  // filter as "no filter", so a blank clientOrgId in the OR below would otherwise match ANY org's
  // org-scoped invoice within the tenant. For a money path, refuse outright rather than trust the caller.
  if (!tenantId || !clientOrgId) return Promise.resolve(null);
  // The invoice must belong to the caller's org — EITHER a project the org owns, OR an org-scoped
  // invoice whose clientOrgId equals the caller's org (projectId null), i.e. a RETAINER (P3.3). NOTE:
  // pre-project DEPOSIT invoices carry clientOrgId=null and are intentionally NOT matched here. tenantId
  // is always folded in, so this never crosses tenants; the clientOrgId equality never crosses orgs.
  return prisma.invoice.findFirst({
    where: { id, tenantId, OR: [{ project: { clientOrgId } }, { projectId: null, clientOrgId }] },
    ...(include ? { include } : {}),
  });
}
export function findClientOrgApproval(prisma: PrismaClient, tenantId: string, clientOrgId: string, id: string) {
  return prisma.approval.findFirst({ where: { id, tenantId, project: { clientOrgId } } });
}
/** A file downloadable by a client: scoped, current, client-visible, AND scan-clean. */
export function findClientVisibleFile(prisma: PrismaClient, tenantId: string, clientOrgId: string, id: string) {
  return prisma.projectFile.findFirst({
    where: { id, tenantId, clientVisible: true, isCurrent: true, state: 'AVAILABLE', deletedAt: null, project: { clientOrgId } },
  });
}
/** A client user within the caller's org (for role changes / billing contact). */
export function findClientOrgUser(prisma: PrismaClient, tenantId: string, clientOrgId: string, id: string) {
  return prisma.clientUser.findFirst({ where: { id, tenantId, clientOrgId } });
}

/**
 * Assert a child record's tenant matches an expected tenant. Used by workers and
 * webhooks that resolve a record by a globally-unique id derived from trusted
 * state — a mismatch means the record belongs to a different tenant → refuse.
 */
export function assertSameTenant(expectedTenantId: string, record: { tenantId: string } | null | undefined): boolean {
  return !!record && record.tenantId === expectedTenantId;
}
