/**
 * Role-based access control for the delivery side.
 *
 * RBAC matrix (rows = role, cols = action; ADMIN implicitly has everything):
 *
 *   action            ADMIN  DELIVERY_LEAD  ENGINEER  VIEWER
 *   project:view       ✓        ✓             ✓         ✓
 *   project:write      ✓        ✓             –         –
 *   milestone:write    ✓        ✓             ✓         –
 *   report:publish     ✓        ✓             ✓         –
 *   file:write         ✓        ✓             ✓         –
 *   message:reply      ✓        ✓             ✓         –
 *   approval:create    ✓        ✓             –         –
 *   team:assign        ✓        ✓             –         –
 *   invoice:write      ✓        ✓             –         –
 *   lead:convert       ✓        ✓             –         –
 *   service:view       ✓        ✓             ✓         ✓
 *   service:write      ✓        ✓             –         –
 *   proposal:view      ✓        ✓             ✓         ✓
 *   proposal:write     ✓        ✓             –         –
 *   ticket:read        ✓        ✓             ✓         ✓   (Slice 4 — queue + detail)
 *   ticket:reply       ✓        ✓             ✓         –   (client-visible reply)
 *   ticket:note        ✓        ✓             ✓         –   (create internal note + VISIBILITY of internal notes)
 *   ticket:status      ✓        ✓             ✓         –   (status transitions)
 *
 * IMPORTANT: `can()` is pure set-membership — there is NO implicit "ADMIN has everything" (the comment on
 * line 4 predates the code and is misleading). Any new action MUST be added to ADMIN's (and
 * DELIVERY_LEAD's) set explicitly or those roles are denied it. `ticket:note` doubles as the internal-note
 * VISIBILITY capability: a VIEWER has ticket:read but NOT ticket:note, so it never sees internal notes
 * (enforced at the service/query layer, not merely the UI).
 */
import type { StaffRole } from '@prisma/client';

export type Action =
  | 'project:view'
  | 'project:write'
  | 'milestone:write'
  | 'report:publish'
  | 'file:write'
  | 'message:reply'
  | 'approval:create'
  | 'team:assign'
  | 'invoice:write'
  | 'lead:convert'
  | 'service:view'
  | 'service:write'
  | 'proposal:view'
  | 'proposal:write'
  | 'ticket:read'
  | 'ticket:reply'
  | 'ticket:note'
  | 'ticket:status';

const MATRIX: Record<StaffRole, Set<Action>> = {
  ADMIN: new Set<Action>([
    'project:view', 'project:write', 'milestone:write', 'report:publish', 'file:write',
    'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert',
    'service:view', 'service:write',
    'proposal:view', 'proposal:write',
    'ticket:read', 'ticket:reply', 'ticket:note', 'ticket:status',
  ]),
  DELIVERY_LEAD: new Set<Action>([
    'project:view', 'project:write', 'milestone:write', 'report:publish', 'file:write',
    'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert',
    'service:view', 'service:write',
    'proposal:view', 'proposal:write',
    'ticket:read', 'ticket:reply', 'ticket:note', 'ticket:status',
  ]),
  ENGINEER: new Set<Action>([
    'project:view', 'milestone:write', 'report:publish', 'file:write', 'message:reply',
    'service:view', 'proposal:view',
    'ticket:read', 'ticket:reply', 'ticket:note', 'ticket:status',
  ]),
  VIEWER: new Set<Action>(['project:view', 'service:view', 'proposal:view', 'ticket:read']),
};

export function can(role: StaffRole, action: Action): boolean {
  return MATRIX[role]?.has(action) ?? false;
}
