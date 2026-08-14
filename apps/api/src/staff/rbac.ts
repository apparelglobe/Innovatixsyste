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
  | 'proposal:write';

const MATRIX: Record<StaffRole, Set<Action>> = {
  ADMIN: new Set<Action>([
    'project:view', 'project:write', 'milestone:write', 'report:publish', 'file:write',
    'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert',
    'service:view', 'service:write',
    'proposal:view', 'proposal:write',
  ]),
  DELIVERY_LEAD: new Set<Action>([
    'project:view', 'project:write', 'milestone:write', 'report:publish', 'file:write',
    'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert',
    'service:view', 'service:write',
    'proposal:view', 'proposal:write',
  ]),
  ENGINEER: new Set<Action>([
    'project:view', 'milestone:write', 'report:publish', 'file:write', 'message:reply',
    'service:view', 'proposal:view',
  ]),
  VIEWER: new Set<Action>(['project:view', 'service:view', 'proposal:view']),
};

export function can(role: StaffRole, action: Action): boolean {
  return MATRIX[role]?.has(action) ?? false;
}
