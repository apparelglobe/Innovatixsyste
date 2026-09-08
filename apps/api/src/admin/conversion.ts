/**
 * Lead → client conversion. Turns a won lead into a client organization + first
 * project WITHOUT creating a second disconnected customer record:
 *   • ClientOrg.leadId and Project.leadId link back to the originating lead, so
 *     revenue and attribution stay attached to the lead source.
 *   • If the lead was already converted, the existing ClientOrg is returned
 *     (idempotent) — no duplicate company/contact.
 *   • The original lead + its attribution are preserved; the lead is marked
 *     CONVERTED, not deleted.
 *
 * Portal access is granted through a SECURE INVITATION (the client sets their own
 * password via a one-time link) — never a temporary password. The client user is
 * created only when the invitation is accepted.
 */
import { randomBytes } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { issueInvitation } from '../invitations/service';
import { MOMENT, MOMENT_MESSAGE } from '../lib/relationship-moments';
import { writeProjectActivity, writeRelationshipActivity, adminActor } from '../lib/portal-activity';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'client';

export type ConvertResult = {
  alreadyConverted: boolean;
  clientOrgId: string;
  projectId: string;
  invitedEmail: string;
  invitationId?: string; // present when a fresh invitation was issued
};

const DEFAULT_MILESTONES = ['Discovery & Planning', 'System Architecture', 'Build', 'QA & UAT', 'Deployment'];

/**
 * Create a fresh engagement project under an existing client org — default milestones,
 * a delivery-lead member, a portal activity, and an audit event. Used per activated
 * proposal so each engagement is its own 1:1 project (a returning client gets a NEW
 * project for the new deal rather than reusing the first). Call inside a $transaction.
 */
export async function createEngagementProject(
  tx: Prisma.TransactionClient,
  params: { tenantId: string; clientOrgId: string; leadId: string | null; staffId: string; staffName: string; name: string },
): Promise<{ id: string }> {
  const project = await tx.project.create({
    data: { tenantId: params.tenantId, clientOrgId: params.clientOrgId, leadId: params.leadId, name: params.name, status: 'DISCOVERY' },
  });
  await tx.milestone.createMany({ data: DEFAULT_MILESTONES.map((name, i) => ({ tenantId: params.tenantId, projectId: project.id, name, sequence: i + 1, status: (i === 0 ? 'IN_PROGRESS' : 'PLANNED') as 'IN_PROGRESS' | 'PLANNED' })) });
  await tx.projectMember.create({ data: { tenantId: params.tenantId, projectId: project.id, staffUserId: params.staffId, name: params.staffName, role: 'Delivery Lead', clientVisible: true } });
  const projectCtx = { id: project.id, tenantId: params.tenantId, clientOrgId: params.clientOrgId };
  const actor = adminActor(params.staffId, params.staffName);
  await writeProjectActivity(tx, projectCtx, { type: 'PROJECT', message: 'Project created', actor });
  // Slice 2: this helper is the ADDITIONAL-project path (a returning client's next engagement), so the
  // relationship expanded — emit the relationship-level NEW_PROJECT_STARTED (projectId=null), deterministic
  // per project so retries never double-record. The first-ever project (convertLead) is the relationship's
  // start and is covered by the activation PROJECT_STARTED backfill instead.
  await writeRelationshipActivity(tx, { tenantId: params.tenantId, clientOrgId: params.clientOrgId }, { id: `new-project-started:${project.id}`, type: MOMENT.NEW_PROJECT_STARTED, message: `${MOMENT_MESSAGE[MOMENT.NEW_PROJECT_STARTED]}: ${params.name}`, actor });
  await tx.auditEvent.create({ data: { tenantId: params.tenantId, entityType: 'Project', entityId: project.id, action: 'PROJECT_CREATED', actorType: 'ADMIN', actorId: params.staffId, data: { fromLead: params.leadId } } });
  return { id: project.id };
}

export async function convertLead(
  prisma: PrismaClient,
  tenantId: string,
  staffId: string,
  staffName: string,
  leadId: string,
  opts: { projectName?: string } = {},
): Promise<ConvertResult> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
  if (!lead) throw Object.assign(new Error('lead_not_found'), { code: 'NOT_FOUND' });

  // Idempotent: already converted → return the existing org/project.
  const existingOrg = await prisma.clientOrg.findFirst({ where: { tenantId, leadId: lead.id } });
  if (existingOrg) {
    const user = await prisma.clientUser.findFirst({ where: { tenantId, clientOrgId: existingOrg.id }, orderBy: { createdAt: 'asc' } });
    const project = await prisma.project.findFirst({ where: { tenantId, clientOrgId: existingOrg.id }, orderBy: { createdAt: 'asc' } });
    return { alreadyConverted: true, clientOrgId: existingOrg.id, projectId: project?.id ?? '', invitedEmail: user?.email ?? lead.email };
  }

  const orgName = lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email;

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.clientOrg.create({ data: { tenantId, leadId: lead.id, name: orgName, slug: `${slugify(orgName)}-${randomBytes(2).toString('hex')}` } });

    const project = await tx.project.create({ data: { tenantId, clientOrgId: org.id, leadId: lead.id, name: opts.projectName || `${orgName} — Initial Engagement`, status: 'DISCOVERY' } });

    await tx.milestone.createMany({ data: DEFAULT_MILESTONES.map((name, i) => ({ tenantId, projectId: project.id, name, sequence: i + 1, status: (i === 0 ? 'IN_PROGRESS' : 'PLANNED') as 'IN_PROGRESS' | 'PLANNED' })) });
    await tx.projectMember.create({ data: { tenantId, projectId: project.id, staffUserId: staffId, name: staffName, role: 'Delivery Lead', clientVisible: true } });
    await writeProjectActivity(tx, { id: project.id, tenantId, clientOrgId: org.id }, { type: 'PROJECT', message: 'Project created and portal invitation sent', actor: adminActor(staffId, staffName) });

    await tx.lead.update({ where: { id: lead.id }, data: { status: 'CONVERTED' } });

    // Audit trail (preserves the lead→client linkage).
    await tx.auditEvent.createMany({ data: [
      { tenantId, entityType: 'Lead', entityId: lead.id, action: 'LEAD_CONVERTED', actorType: 'ADMIN', actorId: staffId, data: { clientOrgId: org.id, projectId: project.id } },
      { tenantId, entityType: 'ClientOrg', entityId: org.id, action: 'CLIENT_ORG_CREATED', actorType: 'ADMIN', actorId: staffId, data: { leadId: lead.id } },
      { tenantId, entityType: 'Project', entityId: project.id, action: 'PROJECT_CREATED', actorType: 'ADMIN', actorId: staffId, data: { fromLead: lead.id } },
    ] });

    return { orgId: org.id, projectId: project.id };
  });

  // Secure portal invitation for the primary contact (OWNER) — issued after the
  // org/project commit. Sends a setup-link email; no password is generated.
  const invite = await issueInvitation(prisma, {
    tenantId, clientOrgId: result.orgId, orgName,
    email: lead.email, firstName: lead.firstName, lastName: lead.lastName,
    role: 'OWNER', leadId: lead.id, actor: { staffUserId: staffId },
  });

  return {
    alreadyConverted: false,
    clientOrgId: result.orgId,
    projectId: result.projectId,
    invitedEmail: lead.email,
    invitationId: invite.ok ? invite.invitationId : undefined,
  };
}
