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
 *   ticket:create              ✓      ✓      (Slice 3 — open a support ticket)
 *   ticket:read                ✓      ✓      (Slice 3 — read the org's tickets + history)
 *   ticket:reply               ✓      ✓      (Slice 3 — reply on a ticket)
 *   approval:decide            ✓      –      (approve/reject deliverables, milestones, UAT, deploy)
 *   invoice:read               ✓      –      (P3.3: whole Billing surface — list/detail/PDF/Care Plan)
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
  | 'ticket:create'
  | 'ticket:read'
  | 'ticket:reply'
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
  // Slice 3 — support tickets are relationship-level participation (like message:send): both OWNER and
  // MEMBER may open, read, and reply to their org's tickets. NOT in SENSITIVE_CLIENT_ACTIONS (mirrors
  // messages, not money). A future destructive action (e.g. ticket:close) would be OWNER-only + sensitive.
  'ticket:create',
  'ticket:read',
  'ticket:reply',
];

const OWNER_ONLY: ClientAction[] = [
  'approval:decide',
  // Billing is OWNER-only (P3.3): the whole billing surface — invoice list/detail/PDF, Care Plan info,
  // balances — is gated on `invoice:read`. Extensible: a future dedicated "billing access" role for a
  // finance/accounting contact is simply GRANTED `invoice:read`; no redesign of this matrix is needed.
  'invoice:read',
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
