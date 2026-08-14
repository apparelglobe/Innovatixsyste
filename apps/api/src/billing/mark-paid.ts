// Shared "invoice paid" transition — the single place that flips an invoice to
// PAID and fans out audit/activity/notifications. Called by the real payment
// webhook and by the dev-only simulate endpoint, so both take the identical
// idempotent path.
import type { PrismaClient } from '@prisma/client';
import { notifyClientOrg, notifyStaff } from '../notifications/service';
import { activateFromDeposit } from '../activation/service';

export type MarkPaidResult = 'paid' | 'already' | 'missing';

export async function markInvoicePaid(prisma: PrismaClient, invoiceId: string, source: string): Promise<MarkPaidResult> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { project: { select: { id: true, clientOrgId: true } }, proposal: { select: { leadId: true } } },
  });
  if (!inv) return 'missing';
  if (inv.status === 'PAID') return 'already'; // idempotent — never double-notify

  await prisma.invoice.update({ where: { id: inv.id }, data: { status: 'PAID', paidAt: new Date() } });
  await prisma.auditEvent.create({
    data: { tenantId: inv.tenantId, entityType: 'Invoice', entityId: inv.id, action: 'INVOICE_PAID', actorType: 'SYSTEM', actorId: source },
  });

  // Deposit paid = the third activation gate cleared (Canon §5). Record it, then activate the client.
  if (inv.kind === 'DEPOSIT' && inv.proposal) {
    await prisma.leadActivity.create({ data: { tenantId: inv.tenantId, leadId: inv.proposal.leadId, type: 'DEPOSIT_PAID', data: { invoiceId: inv.id, number: inv.number } } });
    try {
      await activateFromDeposit(prisma, inv.id); // → ClientOrg + Project + portal invitation
    } catch (e) {
      // The deposit is paid regardless; record the failure so activation can be retried.
      await prisma.auditEvent.create({ data: { tenantId: inv.tenantId, entityType: 'Invoice', entityId: inv.id, action: 'ACTIVATION_FAILED', actorType: 'SYSTEM', data: { error: e instanceof Error ? e.message : String(e) } } }).catch(() => undefined);
    }
  }

  if (inv.project) {
    await prisma.portalActivity.create({
      data: { tenantId: inv.tenantId, projectId: inv.project.id, type: 'INVOICE', message: `Invoice ${inv.number} paid` },
    });
    await notifyClientOrg(prisma, inv.tenantId, inv.project.clientOrgId, { type: 'INVOICE_CREATED', title: `Payment received for ${inv.number}`, body: 'Thank you — your payment has been received.', projectId: inv.project.id, linkPath: `/invoices/${inv.id}`, email: true });
    await notifyStaff(prisma, inv.tenantId, { type: 'INVOICE_CREATED', title: `Invoice ${inv.number} paid`, projectId: inv.project.id, linkPath: `/admin/projects/${inv.project.id}`, email: true });
  } else {
    // Project-less (deposit) invoice — activation is handled by the deposit flow (Slice 5); just alert staff.
    await notifyStaff(prisma, inv.tenantId, { type: 'INVOICE_CREATED', title: `Invoice ${inv.number} paid`, linkPath: '/admin', email: true });
  }
  return 'paid';
}
