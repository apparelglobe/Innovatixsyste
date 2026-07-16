/**
 * Lead → client conversion. Turns a won lead into a client organization + user +
 * first project WITHOUT creating a second disconnected customer record:
 *   • ClientOrg.leadId and Project.leadId link back to the originating lead, so
 *     revenue and attribution stay attached to the lead source.
 *   • If the lead was already converted, the existing ClientOrg is returned
 *     (idempotent) — no duplicate company/contact.
 *   • The original lead + its attribution are preserved; the lead is marked
 *     CONVERTED, not deleted.
 */
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { normalizeEmail } from '../lib/sanitize';
import { sendTransactionalEmail } from '../email/service';
import { portalInviteEmail } from '../email/templates';
import { config } from '../config';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'client';
const tempPassword = () => randomBytes(9).toString('base64url');

export type ConvertResult = {
  alreadyConverted: boolean;
  clientOrgId: string;
  clientUserId: string;
  projectId: string;
  invitedEmail: string;
  tempPassword?: string; // returned only in non-production for convenience
};

const DEFAULT_MILESTONES = ['Discovery & Planning', 'System Architecture', 'Build', 'QA & UAT', 'Deployment'];

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
    return { alreadyConverted: true, clientOrgId: existingOrg.id, clientUserId: user?.id ?? '', projectId: project?.id ?? '', invitedEmail: user?.email ?? lead.email };
  }

  const orgName = lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.email;
  const normalizedEmail = normalizeEmail(lead.email);
  const pwPlain = tempPassword();
  const passwordHash = await bcrypt.hash(pwPlain, 10);

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.clientOrg.create({ data: { tenantId, leadId: lead.id, name: orgName, slug: `${slugify(orgName)}-${randomBytes(2).toString('hex')}` } });

    // Reuse an existing client user with this email if present (no duplicate contact).
    let user = await tx.clientUser.findUnique({ where: { tenantId_normalizedEmail: { tenantId, normalizedEmail } } });
    if (!user) {
      user = await tx.clientUser.create({ data: { tenantId, clientOrgId: org.id, email: lead.email, normalizedEmail, passwordHash, firstName: lead.firstName, lastName: lead.lastName, role: 'OWNER' } });
    }

    const project = await tx.project.create({ data: { tenantId, clientOrgId: org.id, leadId: lead.id, name: opts.projectName || `${orgName} — Initial Engagement`, status: 'DISCOVERY' } });

    await tx.milestone.createMany({ data: DEFAULT_MILESTONES.map((name, i) => ({ tenantId, projectId: project.id, name, sequence: i + 1, status: (i === 0 ? 'IN_PROGRESS' : 'PLANNED') as 'IN_PROGRESS' | 'PLANNED' })) });
    await tx.projectMember.create({ data: { tenantId, projectId: project.id, staffUserId: staffId, name: staffName, role: 'Delivery Lead', clientVisible: true } });
    await tx.portalActivity.create({ data: { tenantId, projectId: project.id, type: 'PROJECT', message: 'Project created and portal access granted' } });

    await tx.lead.update({ where: { id: lead.id }, data: { status: 'CONVERTED' } });

    // Audit trail (preserves the lead→client linkage).
    await tx.auditEvent.createMany({ data: [
      { tenantId, entityType: 'Lead', entityId: lead.id, action: 'LEAD_CONVERTED', actorType: 'ADMIN', actorId: staffId, data: { clientOrgId: org.id, projectId: project.id } },
      { tenantId, entityType: 'ClientOrg', entityId: org.id, action: 'CLIENT_ORG_CREATED', actorType: 'ADMIN', actorId: staffId, data: { leadId: lead.id } },
      { tenantId, entityType: 'Project', entityId: project.id, action: 'PROJECT_CREATED', actorType: 'ADMIN', actorId: staffId, data: { fromLead: lead.id } },
    ] });

    return { orgId: org.id, userId: user.id, userEmail: user.email, projectId: project.id, isNewUser: user.passwordHash === passwordHash };
  });

  // Portal invitation email (side effect, after commit) via the durable outbox transport.
  const portalUrl = (config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001') + '/login';
  await sendTransactionalEmail(prisma, {
    tenantId, type: 'PORTAL_INVITE', to: result.userEmail,
    built: portalInviteEmail(result.userEmail, orgName, portalUrl, result.isNewUser ? pwPlain : '(use your existing password)'),
    leadId: lead.id,
  }).catch(() => undefined);

  return {
    alreadyConverted: false,
    clientOrgId: result.orgId,
    clientUserId: result.userId,
    projectId: result.projectId,
    invitedEmail: result.userEmail,
    tempPassword: config.NODE_ENV !== 'production' && result.isNewUser ? pwPlain : undefined,
  };
}
