/**
 * Unit tests for the active-client workspace status engine (S1). Pure logic, zero deps —
 * runs with `tsx --test`. Locks the Canon §6 "one status + one next action" derivation:
 * the priority resolver, every delivery-phase mapping, owner-gating, and the graceful
 * "Our Turn with no committed date" fallback (never an empty/broken card).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveWorkspaceState, type WorkspaceSignals, type ProjectStatus } from '../src/lib/workspace-stage';

const sig = (over: Partial<WorkspaceSignals> = {}): WorkspaceSignals => ({ projectStatus: 'IN_PROGRESS', ...over });
const approval = (over = {}) => ({ id: 'ap1', subject: 'Homepage design v2', type: 'DELIVERABLE', ...over });
const invoice = (over = {}) => ({ id: 'inv1', number: 'INV-0007', amountCents: 120000, ...over });

// ── Priority resolver: client actions win, most-pressing first ──

test('overdue invoice beats a pending approval (most urgent client action)', () => {
  const s = deriveWorkspaceState(sig({ pendingApproval: approval(), payableInvoice: invoice({ overdue: true }) }));
  assert.equal(s.turn, 'YOU');
  assert.equal(s.action?.kind, 'invoice');
  assert.equal(s.tone, 'bad');
  assert.match(s.title, /overdue/i);
  assert.equal(s.action?.href, '/invoices/inv1');
  assert.equal(s.action?.label, 'Pay $1,200');
});

test('pending approval beats a not-yet-overdue invoice', () => {
  const s = deriveWorkspaceState(sig({ pendingApproval: approval(), payableInvoice: invoice({ overdue: false }) }));
  assert.equal(s.action?.kind, 'approval');
  assert.equal(s.action?.targetId, 'ap1');
});

test('a due (not overdue) invoice with no approval → pay', () => {
  const s = deriveWorkspaceState(sig({ payableInvoice: invoice({ overdue: false }) }));
  assert.equal(s.turn, 'YOU');
  assert.equal(s.action?.kind, 'invoice');
  assert.equal(s.tone, 'warn');
  assert.match(s.title, /due/i);
});

test('pending approval alone → your turn, label by approval type', () => {
  assert.equal(deriveWorkspaceState(sig({ pendingApproval: approval({ type: 'DEPLOYMENT' }) })).action?.label, 'Approve the deployment');
  assert.equal(deriveWorkspaceState(sig({ pendingApproval: approval({ type: 'UAT' }) })).action?.label, 'Sign off on testing');
  assert.equal(deriveWorkspaceState(sig({ pendingApproval: approval({ type: 'WEIRD' }) })).action?.label, 'Review & approve');
  assert.equal(deriveWorkspaceState(sig({ pendingApproval: approval({ subject: '' }) })).title, 'Your approval is needed');
});

test('client actions (pay / approve) are owner-gated', () => {
  assert.equal(deriveWorkspaceState(sig({ pendingApproval: approval() })).action?.ownerOnly, true);
  assert.equal(deriveWorkspaceState(sig({ payableInvoice: invoice() })).action?.ownerOnly, true);
});

// ── Our Turn / terminal: every delivery phase maps to a state ──

test('each ProjectStatus maps to the right turn + no client action', () => {
  const cases: Record<ProjectStatus, string> = {
    DISCOVERY: 'US', IN_PROGRESS: 'US', UAT: 'US', LAUNCHED: 'US', ON_HOLD: 'PAUSED', COMPLETE: 'DONE',
  };
  for (const [status, turn] of Object.entries(cases)) {
    const s = deriveWorkspaceState(sig({ projectStatus: status as ProjectStatus }));
    assert.equal(s.turn, turn, `${status} → ${turn}`);
    assert.equal(s.action, null, `${status} has no client action`);
    assert.ok(s.statusLabel && s.title && s.body, `${status} has non-empty copy`);
  }
});

// ── The "never goes dark" contract + graceful fallback ──

test('Our Turn with a committed date surfaces nextUpdate', () => {
  const s = deriveWorkspaceState(sig({ projectStatus: 'IN_PROGRESS', nextUpdateAt: '2026-08-22T12:00:00Z', nextUpdateNote: 'demo build' }));
  assert.deepEqual(s.nextUpdate, { at: '2026-08-22T12:00:00Z', note: 'demo build' });
});

test('Our Turn WITHOUT a date degrades gracefully — null nextUpdate but a non-empty body', () => {
  const s = deriveWorkspaceState(sig({ projectStatus: 'IN_PROGRESS' }));
  assert.equal(s.nextUpdate, null);
  assert.ok(s.body.length > 0, 'body still reads as "we\'re on it"');
});

test('next-update is ignored when it is NOT our turn (your turn / paused / done)', () => {
  const stamp = '2026-08-22T12:00:00Z';
  assert.equal(deriveWorkspaceState(sig({ pendingApproval: approval(), nextUpdateAt: stamp })).nextUpdate, null);
  assert.equal(deriveWorkspaceState(sig({ projectStatus: 'ON_HOLD', nextUpdateAt: stamp })).nextUpdate, null);
  assert.equal(deriveWorkspaceState(sig({ projectStatus: 'COMPLETE', nextUpdateAt: stamp })).nextUpdate, null);
});
