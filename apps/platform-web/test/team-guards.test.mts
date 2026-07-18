/**
 * Critical-journey unit tests for the client Settings team-management guards.
 * Pure logic, zero deps — runs with `tsx --test`. Mirrors the server rules so a
 * UI regression that would let an owner lock their org out is caught here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeOwnerCount,
  canChangeRole,
  canDeactivate,
  isLastActiveOwner,
  isSelf,
  type TeamMember,
} from '../src/lib/team-guards';

const owner = (over: Partial<TeamMember> = {}): TeamMember => ({ id: 'o1', email: 'owner@acme.com', role: 'OWNER', active: true, ...over });
const member = (over: Partial<TeamMember> = {}): TeamMember => ({ id: 'm1', email: 'member@acme.com', role: 'MEMBER', active: true, ...over });

test('activeOwnerCount counts only active OWNERs', () => {
  assert.equal(activeOwnerCount([owner(), owner({ id: 'o2', email: 'o2@acme.com' }), member(), owner({ id: 'o3', active: false })]), 2);
  assert.equal(activeOwnerCount([]), 0);
});

test('isSelf matches case-insensitively and needs a self email', () => {
  assert.equal(isSelf(owner({ email: 'Owner@Acme.com' }), 'owner@acme.com'), true);
  assert.equal(isSelf(owner(), 'someone-else@acme.com'), false);
  assert.equal(isSelf(owner(), undefined), false);
});

test('isLastActiveOwner is true only for an active owner when one owner remains', () => {
  assert.equal(isLastActiveOwner(owner(), 1), true);
  assert.equal(isLastActiveOwner(owner(), 2), false);
  assert.equal(isLastActiveOwner(member(), 1), false);
  assert.equal(isLastActiveOwner(owner({ active: false }), 1), false);
});

test('canDeactivate blocks self, last active owner, and already-inactive', () => {
  // Sole owner cannot deactivate themselves (both self + last-owner apply).
  assert.equal(canDeactivate(owner(), 'owner@acme.com', 1).allowed, false);
  // A second owner deactivating the sole *other* owner is still blocked when only one active owner remains.
  assert.equal(canDeactivate(owner(), 'admin@acme.com', 1).allowed, false);
  // With two active owners, an owner may deactivate the other.
  assert.equal(canDeactivate(owner({ id: 'o2', email: 'o2@acme.com' }), 'owner@acme.com', 2).allowed, true);
  // A member is freely deactivatable.
  assert.equal(canDeactivate(member(), 'owner@acme.com', 1).allowed, true);
  // Self is blocked with the exact server message.
  assert.match(canDeactivate(member({ email: 'me@acme.com' }), 'me@acme.com', 1).reason ?? '', /your own account/);
  // Already-inactive is blocked.
  assert.equal(canDeactivate(member({ active: false }), 'owner@acme.com', 1).allowed, false);
});

test('canChangeRole allows active non-self members only', () => {
  assert.equal(canChangeRole(member(), 'owner@acme.com'), true);
  assert.equal(canChangeRole(member({ email: 'me@acme.com' }), 'me@acme.com'), false); // self
  assert.equal(canChangeRole(member({ active: false }), 'owner@acme.com'), false); // inactive
});
