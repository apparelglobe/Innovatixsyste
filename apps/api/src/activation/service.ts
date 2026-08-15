/**
 * Client activation — the payoff of the activation gate (Canon §5). When the
 * deposit is paid (all three gates cleared), turn the won prospect into a client:
 * reuse convertLead to create the ClientOrg + first Project + a secure portal
 * invitation (the same mechanism staff "Convert" fires), then backfill the new
 * org/project onto the proposal, contract, deposit invoice, and payment.
 *
 * Idempotent: no-ops if the proposal is already linked to an org (convertLead is
 * itself idempotent too). A paid-deposit event has no interactive actor, so the
 * system acts as the staff who created the proposal (falling back to an admin).
 */
import type { PrismaClient } from '@prisma/client';
import { convertLead, createEngagementProject } from '../admin/conversion';

export async function activateFromDeposit(prisma: PrismaClient, invoiceId: string): Promise<void> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { proposal: { select: { id: true, leadId: true, title: true, number: true, createdByStaffUserId: true, clientOrgId: true } } },
  });
  if (!inv || inv.kind !== 'DEPOSIT' || !inv.proposal) return;
  if (inv.proposal.clientOrgId) return; // already activated

  // Actor: the staff who created the proposal; else the first active admin.
  let staffId: string | null = inv.proposal.createdByStaffUserId;
  let staffName = 'Innovatix Systems';
  if (staffId) {
    const s = await prisma.staffUser.findFirst({ where: { id: staffId, tenantId: inv.tenantId, active: true } });
    if (s) staffName = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
    else staffId = null;
  }
  if (!staffId) {
    const admin = await prisma.staffUser.findFirst({ where: { tenantId: inv.tenantId, role: 'ADMIN', active: true }, orderBy: { createdAt: 'asc' } });
    if (!admin) {
      await prisma.auditEvent.create({ data: { tenantId: inv.tenantId, entityType: 'Proposal', entityId: inv.proposal.id, action: 'ACTIVATION_NO_ACTOR', actorType: 'SYSTEM' } });
      return;
    }
    staffId = admin.id;
    staffName = [admin.firstName, admin.lastName].filter(Boolean).join(' ') || admin.email;
  }

  const result = await convertLead(prisma, inv.tenantId, staffId, staffName, inv.proposal.leadId, { projectName: inv.proposal.title });

  // Each accepted+paid proposal is its own engagement = its own project. First-time conversion
  // already created one (named for this proposal); a RETURNING client (org already existed) needs a
  // NEW project for THIS deal rather than reusing the first — otherwise proposal↔project isn't 1:1.
  let projectId: string | null = result.projectId || null;
  if (result.alreadyConverted) {
    const proj = await prisma.$transaction((tx) => createEngagementProject(tx, {
      tenantId: inv.tenantId, clientOrgId: result.clientOrgId, leadId: inv.proposal!.leadId,
      staffId, staffName, name: inv.proposal!.title,
    }));
    projectId = proj.id;
  }

  const now = new Date();
  // Record the activation transition (activatedAt + projectId) + backfill org/project onto everything that preceded them.
  await prisma.proposal.updateMany({ where: { id: inv.proposal.id, tenantId: inv.tenantId }, data: { clientOrgId: result.clientOrgId, projectId, activatedAt: now } });
  await prisma.contract.updateMany({ where: { proposalId: inv.proposal.id, tenantId: inv.tenantId }, data: { clientOrgId: result.clientOrgId } });
  await prisma.invoice.update({ where: { id: inv.id }, data: { clientOrgId: result.clientOrgId, projectId } });
  await prisma.payment.updateMany({ where: { invoiceId: inv.id }, data: { clientOrgId: result.clientOrgId } });
  await prisma.auditEvent.create({ data: { tenantId: inv.tenantId, entityType: 'Proposal', entityId: inv.proposal.id, action: 'ACTIVATED', actorType: 'SYSTEM', data: { clientOrgId: result.clientOrgId, projectId, invitedEmail: result.invitedEmail, returningClient: result.alreadyConverted } } });
}
