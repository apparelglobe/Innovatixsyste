/**
 * Client-portal RBAC — matrix unit tests + DB-backed route enforcement.
 * Requires the dev DB up (scripts/dev-db.sh start → localhost:5544).
 * Run directly:  NODE_ENV=test npx tsx --test test/client-rbac.test.ts
 *
 * Proves backend authorization is authoritative: MEMBER cannot approve / pay /
 * manage billing / invite / change roles; OWNER can; cross-org OWNER gets 404;
 * a role forged in the request body is ignored; staff RBAC is untouched.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/main';
import { prisma } from '../src/db';
import { resolveDefaultTenant } from '../src/tenant';
import { signSession } from '../src/portal/auth';
import { clientCan } from '../src/client/rbac';
import { can as staffCan } from '../src/staff/rbac';

const uid = () => randomUUID().slice(0, 8);

let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let orgA: { id: string };
let ownerA: { id: string; clientOrgId: string; email: string };
let memberA: { id: string; clientOrgId: string; email: string };
let userC: { id: string };
let projectA: { id: string };
let projectB: { id: string };

const mkUser = async (clientOrgId: string, role: 'OWNER' | 'MEMBER') => {
  const email = `${role.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({
    data: { tenantId, clientOrgId, email, normalizedEmail: email, passwordHash: 'x', role },
  });
};
const mkApproval = (projectId: string) =>
  prisma.approval.create({ data: { tenantId, projectId, type: 'DELIVERABLE', subject: 'Deliverable' } });
const mkInvoice = (projectId: string) =>
  prisma.invoice.create({ data: { tenantId, projectId, number: `INV-${uid()}`, amountCents: 100000, status: 'SENT' } });

const token = (u: { id: string; clientOrgId: string; email: string }) =>
  signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email });
const auth = (u: { id: string; clientOrgId: string; email: string }) => ({
  authorization: `Bearer ${token(u)}`,
  'content-type': 'application/json',
});
const POST = (url: string, u: any, body?: object) =>
  app.inject({ method: 'POST', url, headers: auth(u), payload: JSON.stringify(body ?? {}) });
const PATCH = (url: string, u: any, body?: object) =>
  app.inject({ method: 'PATCH', url, headers: auth(u), payload: JSON.stringify(body ?? {}) });
const GET = (url: string, u: any) => app.inject({ method: 'GET', url, headers: auth(u) });

before(async () => {
  app = await buildApp();
  const t = await resolveDefaultTenant(prisma);
  tenantId = t.id;
  orgA = await prisma.clientOrg.create({ data: { tenantId, name: 'Org A', slug: `org-a-${uid()}` } });
  ownerA = await mkUser(orgA.id, 'OWNER');
  memberA = await mkUser(orgA.id, 'MEMBER');
  userC = await mkUser(orgA.id, 'MEMBER');
  projectA = await prisma.project.create({ data: { tenantId, clientOrgId: orgA.id, name: 'Proj A' } });
  const orgB = await prisma.clientOrg.create({ data: { tenantId, name: 'Org B', slug: `org-b-${uid()}` } });
  projectB = await prisma.project.create({ data: { tenantId, clientOrgId: orgB.id, name: 'Proj B' } });
});

after(async () => {
  await app.close();
  await prisma.$disconnect();
});

// ── Pure matrix ──────────────────────────────────────────────────────────────
test('matrix: OWNER may decide/pay/invite; MEMBER may not', () => {
  for (const a of ['approval:decide', 'invoice:pay', 'billing:manage', 'client-user:invite', 'client-user:role-change'] as const) {
    assert.equal(clientCan('OWNER', a), true, `OWNER should have ${a}`);
    assert.equal(clientCan('MEMBER', a), false, `MEMBER should NOT have ${a}`);
  }
});
test('matrix: MEMBER may read + participate', () => {
  for (const a of ['project:read', 'report:read', 'file:read', 'message:send', 'invoice:read', 'approval:comment'] as const) {
    assert.equal(clientCan('MEMBER', a), true, `MEMBER should have ${a}`);
  }
});
test('staff RBAC is unaffected', () => {
  assert.equal(staffCan('ADMIN', 'lead:convert'), true);
  assert.equal(staffCan('ENGINEER', 'invoice:write'), false);
  assert.equal(staffCan('ENGINEER', 'project:view'), true);
  assert.equal(staffCan('VIEWER', 'project:view'), true);
});

// ── Approvals ────────────────────────────────────────────────────────────────
test('OWNER can decide an approval', async () => {
  const a = await mkApproval(projectA.id);
  const res = await POST(`/v1/portal/approvals/${a.id}/decide`, ownerA, { decision: 'APPROVED' });
  assert.equal(res.statusCode, 200);
});
test('MEMBER cannot decide an approval (403, unchanged)', async () => {
  const a = await mkApproval(projectA.id);
  const res = await POST(`/v1/portal/approvals/${a.id}/decide`, memberA, { decision: 'APPROVED' });
  assert.equal(res.statusCode, 403);
  assert.equal(JSON.parse(res.body).requiredRole, 'OWNER');
  const after = await prisma.approval.findUnique({ where: { id: a.id } });
  assert.equal(after?.status, 'PENDING');
});
test('a role forged in the request body is ignored (MEMBER still 403)', async () => {
  const a = await mkApproval(projectA.id);
  const res = await POST(`/v1/portal/approvals/${a.id}/decide`, memberA, { decision: 'APPROVED', role: 'OWNER' } as any);
  assert.equal(res.statusCode, 403);
});
test('cross-org OWNER cannot act on another org approval (404, not 403)', async () => {
  const a = await mkApproval(projectB.id); // belongs to Org B
  const res = await POST(`/v1/portal/approvals/${a.id}/decide`, ownerA, { decision: 'APPROVED' });
  assert.equal(res.statusCode, 404);
});

// ── Payments ─────────────────────────────────────────────────────────────────
test('OWNER can trigger payment', async () => {
  const inv = await mkInvoice(projectA.id);
  const res = await POST(`/v1/portal/invoices/${inv.id}/pay-demo`, ownerA);
  assert.equal(res.statusCode, 200);
});
test('MEMBER cannot trigger payment (403, unpaid)', async () => {
  const inv = await mkInvoice(projectA.id);
  const res = await POST(`/v1/portal/invoices/${inv.id}/pay-demo`, memberA);
  assert.equal(res.statusCode, 403);
  const after = await prisma.invoice.findUnique({ where: { id: inv.id } });
  assert.notEqual(after?.status, 'PAID');
});

// ── Billing contact ──────────────────────────────────────────────────────────
test('OWNER can manage billing contact; MEMBER cannot', async () => {
  const inv = await mkInvoice(projectA.id);
  const ok = await PATCH(`/v1/portal/invoices/${inv.id}/billing-contact`, ownerA, { billingContactUserId: memberA.id });
  assert.equal(ok.statusCode, 200);
  const denied = await PATCH(`/v1/portal/invoices/${inv.id}/billing-contact`, memberA, { billingContactUserId: memberA.id });
  assert.equal(denied.statusCode, 403);
});

// ── Client-user management ───────────────────────────────────────────────────
test('OWNER can invite; MEMBER cannot', async () => {
  const ok = await POST('/v1/portal/client-users', ownerA, { email: `invitee-${uid()}@example.com`, role: 'MEMBER' });
  assert.equal(ok.statusCode, 200);
  assert.equal(JSON.parse(ok.body).ok, true);
  const denied = await POST('/v1/portal/client-users', memberA, { email: `invitee-${uid()}@example.com` });
  assert.equal(denied.statusCode, 403);
});
test('OWNER can change a role; MEMBER cannot', async () => {
  const ok = await PATCH(`/v1/portal/client-users/${userC.id}`, ownerA, { role: 'MEMBER' });
  assert.equal(ok.statusCode, 200);
  const denied = await PATCH(`/v1/portal/client-users/${userC.id}`, memberA, { role: 'OWNER' });
  assert.equal(denied.statusCode, 403);
});

// ── MEMBER read + participate still works ────────────────────────────────────
test('MEMBER can read the project and send messages', async () => {
  const read = await GET('/v1/portal/project', memberA);
  assert.equal(read.statusCode, 200);
  const msg = await POST('/v1/portal/messages', memberA, { body: 'Hello team' });
  assert.equal(msg.statusCode, 200);
  assert.equal(JSON.parse(msg.body).ok, true);
});
