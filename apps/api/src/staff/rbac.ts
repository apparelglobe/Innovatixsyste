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
  | 'lead:convert';

const MATRIX: Record<StaffRole, Set<Action>> = {
  ADMIN: new Set<Action>([
    'project:view', 'project:write', 'milestone:write', 'report:publish', 'file:write',
    'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert',
  ]),
  DELIVERY_LEAD: new Set<Action>([
    'project:view', 'project:write', 'milestone:write', 'report:publish', 'file:write',
    'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert',
  ]),
  ENGINEER: new Set<Action>([
    'project:view', 'milestone:write', 'report:publish', 'file:write', 'message:reply',
  ]),
  VIEWER: new Set<Action>(['project:view']),
};

export function can(role: StaffRole, action: Action): boolean {
  return MATRIX[role]?.has(action) ?? false;
}
