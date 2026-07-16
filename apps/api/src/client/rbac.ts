/**
 * Role-based access control for the CLIENT portal (separate from staff RBAC).
 *
 * Roles come from Prisma `ClientUserRole` (OWNER | MEMBER). Authorization is
 * enforced server-side in client/authz.ts on every sensitive route — the UI
 * only mirrors this. The caller's role is always resolved fresh from the DB;
 * a role sent in the request body or token is never trusted.
 *
 * Matrix (✓ = allowed):
 *
 *   action                    OWNER  MEMBER
 *   project:read               ✓      ✓
 *   milestone:read             ✓      ✓
 *   report:read                ✓      ✓
 *   file:read                  ✓      ✓
 *   file:upload                ✓      ✓
 *   message:send               ✓      ✓
 *   approval:comment           ✓      ✓
 *   approval:decide            ✓      –      (approve/reject deliverables, milestones, UAT, deploy)
 *   invoice:read               ✓      ✓
 *   invoice:pay                ✓      –
 *   billing:manage             ✓      –      (set invoice billing contact)
 *   client-user:read           ✓      –
 *   client-user:invite         ✓      –
 *   client-user:role-change    ✓      –
 *   client-user:deactivate     ✓      –      (no endpoint yet — needs ClientUser.active column)
 *
 * VIEWER is intentionally NOT added: ClientUserRole has only OWNER/MEMBER, so a
 * read-only client role would require a schema/enum migration (out of scope for
 * this slice). When added, give it the read-only subset below.
 */
import type { ClientUserRole } from '@prisma/client';

export type ClientAction =
  | 'project:read'
  | 'milestone:read'
  | 'report:read'
  | 'file:read'
  | 'file:upload'
  | 'message:send'
  | 'approval:comment'
  | 'approval:decide'
  | 'invoice:read'
  | 'invoice:pay'
  | 'billing:manage'
  | 'client-user:read'
  | 'client-user:invite'
  | 'client-user:role-change'
  | 'client-user:deactivate';

const READ_AND_PARTICIPATE: ClientAction[] = [
  'project:read',
  'milestone:read',
  'report:read',
  'file:read',
  'file:upload',
  'message:send',
  'approval:comment',
  'invoice:read',
];

const OWNER_ONLY: ClientAction[] = [
  'approval:decide',
  'invoice:pay',
  'billing:manage',
  'client-user:read',
  'client-user:invite',
  'client-user:role-change',
  'client-user:deactivate',
];

const MATRIX: Record<ClientUserRole, ReadonlySet<ClientAction>> = {
  OWNER: new Set<ClientAction>([...READ_AND_PARTICIPATE, ...OWNER_ONLY]),
  MEMBER: new Set<ClientAction>(READ_AND_PARTICIPATE),
};

export function clientCan(role: ClientUserRole, action: ClientAction): boolean {
  return MATRIX[role]?.has(action) ?? false;
}

/**
 * Actions worth auditing when DENIED. Sensitive, money/permission-affecting
 * actions only — reads are excluded so harmless UI probes don't flood the log.
 */
export const SENSITIVE_CLIENT_ACTIONS: ReadonlySet<ClientAction> = new Set<ClientAction>([
  'approval:decide',
  'invoice:pay',
  'billing:manage',
  'client-user:invite',
  'client-user:role-change',
  'client-user:deactivate',
]);
