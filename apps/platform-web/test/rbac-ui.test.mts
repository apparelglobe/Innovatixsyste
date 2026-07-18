/**
 * Critical-journey unit tests for staff RBAC UI gating (staffCan). Ensures the
 * client-side capability matrix that shows/hides admin actions matches the
 * intended roles — a regression here would surface controls a role can't use
 * (or hide ones it can). Server RBAC remains authoritative; this guards the UX.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staffCan } from '../src/lib/useStaff';

test('VIEWER can do nothing', () => {
  for (const action of ['project:write', 'report:publish', 'invoice:write', 'lead:convert']) {
    assert.equal(staffCan('VIEWER', action), false, `VIEWER should not have ${action}`);
  }
});

test('ENGINEER can build but not run the business', () => {
  assert.equal(staffCan('ENGINEER', 'milestone:write'), true);
  assert.equal(staffCan('ENGINEER', 'report:publish'), true);
  assert.equal(staffCan('ENGINEER', 'file:write'), true);
  assert.equal(staffCan('ENGINEER', 'message:reply'), true);
  // Not permitted for engineers:
  assert.equal(staffCan('ENGINEER', 'invoice:write'), false);
  assert.equal(staffCan('ENGINEER', 'lead:convert'), false);
  assert.equal(staffCan('ENGINEER', 'project:write'), false);
  assert.equal(staffCan('ENGINEER', 'team:assign'), false);
});

test('ADMIN and DELIVERY_LEAD have the full delivery capability set', () => {
  for (const role of ['ADMIN', 'DELIVERY_LEAD']) {
    for (const action of ['project:write', 'milestone:write', 'report:publish', 'file:write', 'message:reply', 'approval:create', 'team:assign', 'invoice:write', 'lead:convert']) {
      assert.equal(staffCan(role, action), true, `${role} should have ${action}`);
    }
  }
});

test('unknown or missing role is denied everything (fail closed)', () => {
  assert.equal(staffCan(undefined, 'project:write'), false);
  assert.equal(staffCan('SUPERUSER', 'project:write'), false);
  assert.equal(staffCan('ADMIN', 'nonexistent:action'), false);
});
