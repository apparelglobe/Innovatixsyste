// Invite a client user into an existing ClientOrg via a SECURE INVITATION.
// No user row and no temporary password are created here — the recipient sets
// their own password on the one-time setup link and the ClientUser is created on
// acceptance. Delegates to the invitation service (which dedups active users and
// refreshes an existing active invite rather than duplicating it).
import type { ClientUserRole, PrismaClient } from '@prisma/client';
import { issueInvitation } from '../invitations/service';

export type InviteResult =
  | { ok: true; invitationId: string; refreshed: boolean }
  | { ok: false; code: 'EMAIL_IN_USE' | 'ALREADY_MEMBER' };

export async function inviteClientUser(
  prisma: PrismaClient,
  args: {
    tenantId: string;
    clientOrgId: string;
    orgName: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: ClientUserRole;
    actor: { staffUserId?: string; clientUserId?: string };
  },
): Promise<InviteResult> {
  const r = await issueInvitation(prisma, {
    tenantId: args.tenantId,
    clientOrgId: args.clientOrgId,
    orgName: args.orgName,
    email: args.email,
    firstName: args.firstName ?? null,
    lastName: args.lastName ?? null,
    role: args.role,
    actor: args.actor,
  });
  if (r.ok) return { ok: true, invitationId: r.invitationId, refreshed: r.refreshed };
  // Existing user in a DIFFERENT org → email is in use elsewhere.
  if (r.code === 'EMAIL_IN_OTHER_ORG') return { ok: false, code: 'EMAIL_IN_USE' };
  // Existing active user in THIS org → already has access; no duplicate invite.
  return { ok: false, code: 'ALREADY_MEMBER' };
}
