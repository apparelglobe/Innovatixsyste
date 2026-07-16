/**
 * Client-invitation lifecycle — the single place that issues, resends, revokes,
 * inspects, and accepts portal invitations.
 *
 * Security properties:
 *  • No temporary passwords are ever generated, stored, logged, or emailed. The
 *    recipient sets their own password on the setup page.
 *  • Only the SHA-256 hash of a 256-bit token is persisted; the raw token lives
 *    only in-memory and in the outgoing setup link.
 *  • Single-use: acceptance is an atomic compare-and-set on `acceptedAt`, so two
 *    concurrent accepts create exactly one user (the loser rolls back).
 *  • Tokens are expiring and revocable; expired/revoked/accepted tokens are
 *    rejected.
 *  • Multi-org membership is not supported yet: an email already belonging to a
 *    different org is rejected safely (no silent reassignment).
 */
import bcrypt from 'bcryptjs';
import type { ClientUserRole, PrismaClient } from '@prisma/client';
import { config } from '../config';
import { normalizeEmail } from '../lib/sanitize';
import { sendTransactionalEmail } from '../email/service';
import { clientInvitationEmail } from '../email/templates';
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationStatus,
  type InvitationStatus,
} from '../lib/invitations';
import { validatePassword } from '../lib/password';

const BCRYPT_ROUNDS = 10;

function setupUrl(token: string): string {
  const origin = config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001';
  return `${origin}/setup-account?token=${encodeURIComponent(token)}`;
}

/** Build + queue the durable invitation email (records to EmailOutbox). */
async function sendInvitationEmail(
  prisma: PrismaClient,
  args: { tenantId: string; to: string; orgName: string; token: string; expiresAt: Date; leadId?: string | null },
): Promise<void> {
  await sendTransactionalEmail(prisma, {
    tenantId: args.tenantId,
    type: 'PORTAL_INVITE',
    to: args.to,
    built: clientInvitationEmail({
      orgName: args.orgName,
      setupUrl: setupUrl(args.token),
      expiresAt: args.expiresAt,
      supportEmail: config.EMAIL_INTERNAL_TO,
    }),
    leadId: args.leadId ?? null,
  }).catch(() => undefined); // best-effort; staff can resend
}

// ─────────────────────────────────────────────────────────────────────────────
// Issue / refresh
// ─────────────────────────────────────────────────────────────────────────────
export type IssueArgs = {
  tenantId: string;
  clientOrgId: string;
  orgName: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: ClientUserRole;
  leadId?: string | null;
  actor: { staffUserId?: string; clientUserId?: string };
  now?: Date;
};

export type IssueResult =
  | { ok: true; invitationId: string; token: string; refreshed: boolean }
  | { ok: false; code: 'EMAIL_IN_OTHER_ORG' | 'ALREADY_ACTIVE_MEMBER' };

/**
 * Create (or refresh an existing active) invitation for an email into an org.
 * Returns the raw token to the IN-PROCESS caller only — routes must never echo it
 * back to an HTTP client.
 */
export async function issueInvitation(prisma: PrismaClient, args: IssueArgs): Promise<IssueResult> {
  const now = args.now ?? new Date();
  const normalizedEmail = normalizeEmail(args.email);

  // Never duplicate an existing active client user.
  const existingUser = await prisma.clientUser.findUnique({
    where: { tenantId_normalizedEmail: { tenantId: args.tenantId, normalizedEmail } },
    select: { id: true, clientOrgId: true },
  });
  if (existingUser) {
    if (existingUser.clientOrgId !== args.clientOrgId) return { ok: false, code: 'EMAIL_IN_OTHER_ORG' };
    return { ok: false, code: 'ALREADY_ACTIVE_MEMBER' };
  }

  // Refresh an existing active invitation (rotate token) rather than duplicate.
  const active = await prisma.clientInvitation.findFirst({
    where: { tenantId: args.tenantId, clientOrgId: args.clientOrgId, normalizedEmail, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
  });

  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(now.getTime() + config.PORTAL_INVITE_TTL_HOURS * 3600_000);

  let invitationId: string;
  let refreshed = false;
  if (active) {
    await prisma.clientInvitation.update({
      where: { id: active.id },
      data: {
        tokenHash, expiresAt, role: args.role,
        firstName: args.firstName ?? active.firstName,
        lastName: args.lastName ?? active.lastName,
        leadId: args.leadId ?? active.leadId,
        lastSentAt: now, sendCount: { increment: 1 },
      },
    });
    invitationId = active.id;
    refreshed = true;
  } else {
    const created = await prisma.clientInvitation.create({
      data: {
        tenantId: args.tenantId, clientOrgId: args.clientOrgId, leadId: args.leadId ?? null,
        email: args.email, normalizedEmail,
        firstName: args.firstName ?? null, lastName: args.lastName ?? null,
        role: args.role, tokenHash, expiresAt,
        createdByStaffUserId: args.actor.staffUserId ?? null,
        lastSentAt: now, sendCount: 1,
      },
    });
    invitationId = created.id;
  }

  await sendInvitationEmail(prisma, { tenantId: args.tenantId, to: args.email, orgName: args.orgName, token, expiresAt, leadId: args.leadId });
  await prisma.auditEvent.create({
    data: {
      tenantId: args.tenantId, entityType: 'ClientInvitation', entityId: invitationId,
      action: refreshed ? 'CLIENT_INVITATION_REFRESHED' : 'CLIENT_INVITATION_CREATED',
      actorType: 'ADMIN', actorId: args.actor.staffUserId ?? args.actor.clientUserId ?? null,
      data: { role: args.role, clientOrgId: args.clientOrgId },
    },
  }).catch(() => undefined);

  return { ok: true, invitationId, token, refreshed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Resend (rotate token, extend expiry) / Revoke
// ─────────────────────────────────────────────────────────────────────────────
export type ResendResult =
  | { ok: true; token: string }
  | { ok: false; code: 'NOT_FOUND' | 'NOT_ACTIVE' };

export async function resendInvitation(
  prisma: PrismaClient,
  args: { tenantId: string; invitationId: string; actor: { staffUserId?: string; clientUserId?: string }; now?: Date },
): Promise<ResendResult> {
  const now = args.now ?? new Date();
  const inv = await prisma.clientInvitation.findFirst({ where: { id: args.invitationId, tenantId: args.tenantId } });
  if (!inv) return { ok: false, code: 'NOT_FOUND' };
  if (inv.acceptedAt || inv.revokedAt) return { ok: false, code: 'NOT_ACTIVE' };

  const org = await prisma.clientOrg.findFirst({ where: { id: inv.clientOrgId, tenantId: args.tenantId }, select: { name: true } });
  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(now.getTime() + config.PORTAL_INVITE_TTL_HOURS * 3600_000);
  await prisma.clientInvitation.update({
    where: { id: inv.id },
    data: { tokenHash, expiresAt, lastSentAt: now, sendCount: { increment: 1 } },
  });
  await sendInvitationEmail(prisma, { tenantId: args.tenantId, to: inv.email, orgName: org?.name ?? 'your organization', token, expiresAt, leadId: inv.leadId });
  await prisma.auditEvent.create({
    data: { tenantId: args.tenantId, entityType: 'ClientInvitation', entityId: inv.id, action: 'CLIENT_INVITATION_RESENT', actorType: 'ADMIN', actorId: args.actor.staffUserId ?? args.actor.clientUserId ?? null },
  }).catch(() => undefined);
  return { ok: true, token };
}

export type RevokeResult =
  | { ok: true; alreadyRevoked: boolean }
  | { ok: false; code: 'NOT_FOUND' | 'ALREADY_ACCEPTED' };

export async function revokeInvitation(
  prisma: PrismaClient,
  args: { tenantId: string; invitationId: string; reason?: string; actor: { staffUserId?: string; clientUserId?: string }; now?: Date },
): Promise<RevokeResult> {
  const now = args.now ?? new Date();
  const inv = await prisma.clientInvitation.findFirst({ where: { id: args.invitationId, tenantId: args.tenantId } });
  if (!inv) return { ok: false, code: 'NOT_FOUND' };
  if (inv.acceptedAt) return { ok: false, code: 'ALREADY_ACCEPTED' };
  if (inv.revokedAt) return { ok: true, alreadyRevoked: true }; // idempotent; history preserved
  await prisma.clientInvitation.update({ where: { id: inv.id }, data: { revokedAt: now, revokedReason: args.reason ?? null } });
  await prisma.auditEvent.create({
    data: { tenantId: args.tenantId, entityType: 'ClientInvitation', entityId: inv.id, action: 'CLIENT_INVITATION_REVOKED', actorType: 'ADMIN', actorId: args.actor.staffUserId ?? args.actor.clientUserId ?? null, data: args.reason ? { reason: args.reason } : undefined },
  }).catch(() => undefined);
  return { ok: true, alreadyRevoked: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inspect (public, pre-accept) / Accept (public)
// ─────────────────────────────────────────────────────────────────────────────
export type InspectResult =
  | { status: 'VALID'; orgName: string; email: string; expiresAt: Date }
  | { status: Exclude<InvitationStatus, 'VALID'> | 'INVALID' };

/** Look up an invitation by raw token for the setup page. Never reveals unrelated
 *  accounts — an unknown token is simply INVALID. */
export async function inspectInvitation(prisma: PrismaClient, token: string, now: Date = new Date()): Promise<InspectResult> {
  if (!token) return { status: 'INVALID' };
  const inv = await prisma.clientInvitation.findUnique({ where: { tokenHash: hashInvitationToken(token) } });
  if (!inv) return { status: 'INVALID' };
  const status = invitationStatus(inv, now);
  if (status !== 'VALID') return { status };
  const org = await prisma.clientOrg.findFirst({ where: { id: inv.clientOrgId, tenantId: inv.tenantId }, select: { name: true } });
  return { status: 'VALID', orgName: org?.name ?? 'your organization', email: inv.email, expiresAt: inv.expiresAt };
}

export type AcceptResult =
  | { ok: true; userId: string; orgId: string; tenantId: string; existing: boolean }
  | { ok: false; code: 'INVALID' | 'EXPIRED' | 'REVOKED' | 'ALREADY_ACCEPTED' | 'WEAK_PASSWORD' | 'EMAIL_IN_OTHER_ORG'; reason?: string };

class AcceptConflict extends Error {}
class CrossOrg extends Error {}

/**
 * Accept an invitation: validate the token + password, then atomically claim the
 * invitation and create the client user (or recognize an existing same-org user).
 * The whole thing runs in one transaction — nothing is half-committed, and no
 * session is issued here (the caller redirects to login on success).
 */
export async function acceptInvitation(
  prisma: PrismaClient,
  token: string,
  password: string,
  now: Date = new Date(),
): Promise<AcceptResult> {
  if (!token) return { ok: false, code: 'INVALID' };
  const inv = await prisma.clientInvitation.findUnique({ where: { tokenHash: hashInvitationToken(token) } });
  if (!inv) return { ok: false, code: 'INVALID' };

  const status = invitationStatus(inv, now);
  if (status === 'REVOKED') return { ok: false, code: 'REVOKED' };
  if (status === 'EXPIRED') return { ok: false, code: 'EXPIRED' };
  if (status === 'ACCEPTED') return { ok: false, code: 'ALREADY_ACCEPTED' };

  const pw = validatePassword(password, { email: inv.email });
  if (!pw.ok) return { ok: false, code: 'WEAK_PASSWORD', reason: pw.reason };

  // Hash outside the transaction to keep the row lock short.
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Atomic single-use claim: only one concurrent request flips acceptedAt.
      const claim = await tx.clientInvitation.updateMany({
        where: { id: inv.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now },
      });
      if (claim.count === 0) throw new AcceptConflict();

      let existing = false;
      let user = await tx.clientUser.findUnique({ where: { tenantId_normalizedEmail: { tenantId: inv.tenantId, normalizedEmail: inv.normalizedEmail } } });
      if (user) {
        if (user.clientOrgId !== inv.clientOrgId) throw new CrossOrg();
        existing = true; // same org — already onboarded; do NOT reset their password
      } else {
        user = await tx.clientUser.create({
          data: {
            tenantId: inv.tenantId, clientOrgId: inv.clientOrgId,
            email: inv.email, normalizedEmail: inv.normalizedEmail,
            passwordHash, role: inv.role,
            firstName: inv.firstName, lastName: inv.lastName,
          },
        });
      }
      await tx.clientInvitation.update({ where: { id: inv.id }, data: { acceptedByUserId: user.id } });
      return { userId: user.id, orgId: inv.clientOrgId, existing };
    });

    await prisma.auditEvent.create({
      data: { tenantId: inv.tenantId, entityType: 'ClientInvitation', entityId: inv.id, action: 'CLIENT_INVITATION_ACCEPTED', actorType: 'SYSTEM', actorId: result.userId, data: { clientOrgId: result.orgId, existingUser: result.existing } },
    }).catch(() => undefined);

    return { ok: true, tenantId: inv.tenantId, ...result };
  } catch (err) {
    if (err instanceof AcceptConflict) return { ok: false, code: 'ALREADY_ACCEPTED' };
    if (err instanceof CrossOrg) {
      // Surface an internal staff signal; the invitation claim rolled back (still pending).
      await prisma.auditEvent.create({
        data: { tenantId: inv.tenantId, entityType: 'ClientInvitation', entityId: inv.id, action: 'CLIENT_INVITATION_CROSS_ORG_REJECTED', actorType: 'SYSTEM', data: { email: inv.email, clientOrgId: inv.clientOrgId } },
      }).catch(() => undefined);
      return { ok: false, code: 'EMAIL_IN_OTHER_ORG' };
    }
    throw err;
  }
}
