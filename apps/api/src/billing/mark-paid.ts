// Shared "invoice paid" transition — the single place that flips an invoice to
// PAID and fans out audit/activity/notifications. Called by the real payment
// webhook and by the dev-only simulate endpoint, so both take the identical
// idempotent path.
import type { PrismaClient } from '@prisma/client';
import { notifyClientOrg, notifyStaff } from '../notifications/service';

export type MarkPaidResult = 'paid' | 'already' | 'missing';

export async function markInvoicePaid(prisma: PrismaClient, invoiceId: string, source: string): Promise<MarkPaidResult> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { project: { select: { id: true, clientOrgId: true } } },
  });
  if (!inv) return 'missing';
  if (inv.status === 'PAID') return 'already'; // idempotent — never double-notify

  await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'PAID', paidAt: new Date() } });
  await prisma.auditEvent.create({
    data: { tenantId: inv.tenantId, entityType: 'Invoice', entityId: inv.id, action: 'INVOICE_PAID', actorType: 'SYSTEM', actorId: source },
  });
  await prisma.portalActivity.create({
    data: { tenantId: inv.tenantId, projectId: inv.project.id, type: 'INVOICE', message: `Invoice ${inv.number} paid` },
  });
  await notifyClientOrg(prisma, inv.tenantId, inv.project.clientOrgId, { type: 'INVOICE_CREATED', title: `Payment received for ${inv.number}`, body: 'Thank you — your payment has been received.', projectId: inv.project.id, linkPath: `/invoices/${inv.id}`, email: true });
  await notifyStaff(prisma, inv.tenantId, { type: 'INVOICE_CREATED', title: `Invoice ${inv.number} paid`, projectId: inv.project.id, linkPath: `/admin/projects/${inv.project.id}`, email: true });
  return 'paid';
}
