/**
 * RBAC matrices — pure, no database. Guards against a role silently gaining or
 * losing a permission.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientCan } from '../../src/client/rbac';
import { can as staffCan } from '../../src/staff/rbac';

test('client RBAC: OWNER-only actions are denied to MEMBER', () => {
  for (const a of ['approval:decide', 'invoice:pay', 'billing:manage', 'client-user:invite', 'client-user:role-change', 'client-user:deactivate'] as const) {
    assert.equal(clientCan('OWNER', a), true, `OWNER should have ${a}`);
    assert.equal(clientCan('MEMBER', a), false, `MEMBER should NOT have ${a}`);
  }
});

test('client RBAC: MEMBER may read + participate', () => {
  for (const a of ['project:read', 'milestone:read', 'report:read', 'file:read', 'file:upload', 'message:send', 'approval:comment', 'invoice:read'] as const) {
    assert.equal(clientCan('MEMBER', a), true, `MEMBER should have ${a}`);
  }
});

test('staff RBAC: ADMIN/DELIVERY_LEAD full, ENGINEER limited, VIEWER read-only', () => {
  assert.equal(staffCan('ADMIN', 'lead:convert'), true);
  assert.equal(staffCan('DELIVERY_LEAD', 'invoice:write'), true);
  assert.equal(staffCan('ENGINEER', 'invoice:write'), false);
  assert.equal(staffCan('ENGINEER', 'approval:create'), false);
  assert.equal(staffCan('ENGINEER', 'project:view'), true);
  assert.equal(staffCan('VIEWER', 'project:view'), true);
  assert.equal(staffCan('VIEWER', 'milestone:write'), false);
});
