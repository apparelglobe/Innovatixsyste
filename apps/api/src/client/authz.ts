/**
 * Client-portal authorization enforcement. Backend is authoritative: the role
 * is resolved from the database on every check (so role changes take effect
 * immediately and a role forged in the token/body is ignored). Denials return
 * 403; sensitive denials are audited. Organization scoping (404 for other-org
 * records) is handled by the route queries themselves — this layer only decides
 * whether the caller's ROLE may perform the action at all.
 */
import type { FastifyReply } from 'fastify';
import type { ClientUserRole } from '@prisma/client';
import { prisma } from '../db';
import { clientCan, SENSITIVE_CLIENT_ACTIONS, type ClientAction } from './rbac';

export type ClientSessionLike = { sub: string; org: string; tenant: string; email: string };

/**
 * The caller's CURRENT role, read fresh from the DB and scoped to their org +
 * tenant. Returns null if the user no longer exists in that org (e.g. removed).
 */
export async function resolveClientRole(session: ClientSessionLike): Promise<ClientUserRole | null> {
  const user = await prisma.clientUser.findFirst({
    where: { id: session.sub, clientOrgId: session.org, tenantId: session.tenant },
    select: { role: true, active: true },
  });
  // A deactivated account is treated as if it no longer exists — a live token
  // gives no permissions, so deactivation takes effect immediately.
  if (!user || !user.active) return null;
  return user.role;
}

/**
 * Enforce a client permission. Returns true when allowed. On denial it SENDS
 * the reply (401 if the account no longer exists / is inactive, else 403) and
 * returns false — callers must `if (!(await requireClientPermission(...))) return;`.
 *
 * `preResolvedRole` (optional) lets a caller that already resolved the caller's
 * CURRENT role (e.g. requireSession) reuse it and avoid a second DB lookup:
 *   • supplied (including null) → trusted as-is; a null denies with 401 (never a bypass)
 *   • omitted → resolved fresh from the DB (backward-compatible default)
 */
export async function requireClientPermission(
  reply: FastifyReply,
  session: ClientSessionLike,
  action: ClientAction,
  preResolvedRole?: ClientUserRole | null,
): Promise<boolean> {
  // Supplied role (incl. null) is trusted as-is; omitted → resolve fresh from the DB.
  const role = preResolvedRole !== undefined ? preResolvedRole : await resolveClientRole(session);
  if (!role) {
    reply.code(401).send({ ok: false, message: 'Not authenticated' });
    return false;
  }
  if (!clientCan(role, action)) {
    if (SENSITIVE_CLIENT_ACTIONS.has(action)) {
      // Audit sensitive denials (best-effort; never block the response).
      await prisma.auditEvent
        .create({
          data: {
            tenantId: session.tenant,
            entityType: 'ClientUser',
            entityId: session.sub,
            action: 'CLIENT_ACTION_DENIED',
            actorType: 'CLIENT',
            actorId: session.sub,
            data: { deniedAction: action, role },
          },
        })
        .catch(() => undefined);
    }
    reply.code(403).send({
      ok: false,
      message: 'This action requires an account owner.',
      requiredRole: 'OWNER',
    });
    return false;
  }
  return true;
}
