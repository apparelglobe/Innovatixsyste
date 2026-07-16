// Invite a client user into an existing ClientOrg. Mirrors the user-creation +
// portal-invite side of convertLead, but for adding teammates to an org that
// already exists. Idempotent on email within a tenant (unique constraint):
// re-inviting the same address to the same org re-sends the invite rather than
// creating a duplicate; an address already used by a *different* org is rejected.
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { normalizeEmail } from '../lib/sanitize';
import { sendTransactionalEmail } from '../email/service';
import { portalInviteEmail } from '../email/templates';

const tempPassword = () => randomBytes(9).toString('base64url');

export type InviteResult =
  | { ok: true; userId: string; isNew: boolean; tempPassword?: string }
  | { ok: false; code: 'EMAIL_IN_USE' };

export async function inviteClientUser(
  prisma: PrismaClient,
  args: { tenantId: string; clientOrgId: string; orgName: string; email: string; firstName?: string | null; lastName?: string | null; role: 'OWNER' | 'MEMBER'; staffId: string },
): Promise<InviteResult> {
  const normalizedEmail = normalizeEmail(args.email);

  const existing = await prisma.clientUser.findUnique({ where: { tenantId_normalizedEmail: { tenantId: args.tenantId, normalizedEmail } } });
  if (existing && existing.clientOrgId !== args.clientOrgId) return { ok: false, code: 'EMAIL_IN_USE' };

  let userId: string;
  let isNew = false;
  let pwPlain = '';
  if (existing) {
    userId = existing.id; // already a member of this org — we'll just re-send the invite
  } else {
    pwPlain = tempPassword();
    const passwordHash = await bcrypt.hash(pwPlain, 10);
    const created = await prisma.clientUser.create({
      data: { tenantId: args.tenantId, clientOrgId: args.clientOrgId, email: args.email, normalizedEmail, passwordHash, firstName: args.firstName ?? null, lastName: args.lastName ?? null, role: args.role },
    });
    userId = created.id;
    isNew = true;
  }

  await prisma.auditEvent.create({
    data: { tenantId: args.tenantId, entityType: 'ClientUser', entityId: userId, action: isNew ? 'CLIENT_USER_INVITED' : 'CLIENT_USER_REINVITED', actorType: 'ADMIN', actorId: args.staffId, data: { role: args.role } },
  });

  const portalUrl = (config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001') + '/login';
  await sendTransactionalEmail(prisma, {
    tenantId: args.tenantId, type: 'PORTAL_INVITE', to: args.email,
    built: portalInviteEmail(args.email, args.orgName, portalUrl, isNew ? pwPlain : '(use your existing password)'),
  }).catch(() => undefined);

  return { ok: true, userId, isNew, tempPassword: config.NODE_ENV !== 'production' && isNew ? pwPlain : undefined };
}
