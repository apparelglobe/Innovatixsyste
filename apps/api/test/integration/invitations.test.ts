/**
 * Secure client-invitation flow — DB-backed, over real HTTP where it matters.
 *
 * Honest scope: token issue/resend/revoke/inspect/accept run against the built
 * app on the isolated test DB. Staff auth uses minted JWTs (equivalent to login).
 * Because the API never returns the raw token, flow tests obtain it from the
 * in-process service call (issueInvitation) — which is exactly how the setup link
 * is built — and separately assert the HTTP surface never leaks it.
 */
import '../_setup'; // MUST be first — points DATABASE_URL at the isolated test DB
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signStaff } from '../../src/staff/auth';
import { verifyPassword } from '../../src/portal/auth';
import { issueInvitation, resendInvitation, revokeInvitation, acceptInvitation } from '../../src/invitations/service';
import { generateInvitationToken, hashInvitationToken } from '../../src/lib/invitations';

const uid = () => randomUUID().slice(0, 8);
const STRONG = 'correct-horse-battery-staple-2026';

let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let adminAuth: Record<string, string>;
let engineerAuth: Record<string, string>;

const mkStaff = async (role: 'ADMIN' | 'ENGINEER') => {
  const email = `staff-${role.toLowerCase()}-${uid()}@example.com`;
  const s = await prisma.staffUser.create({ data: { tenantId, email, normalizedEmail: email, passwordHash: 'x', role, active: true } });
  return { authorization: `Bearer ${signStaff({ sub: s.id, role, tenant: tenantId, email })}`, 'content-type': 'application/json' };
};
const mkOrg = () => prisma.clientOrg.create({ data: { tenantId, name: `Org ${uid()}`, slug: `org-${uid()}` } });

// Unique client IP per request so the per-IP public rate-limiter never bleeds
// between requests/tests (trustProxy → req.ip reads X-Forwarded-For).
let ipN = 0;
const nextIp = () => { ipN++; return `10.${(ipN >> 16) & 255}.${(ipN >> 8) & 255}.${ipN & 255}`; };
const POST = (url: string, headers: Record<string, string>, body?: object) =>
  app.inject({ method: 'POST', url, headers: { 'x-forwarded-for': nextIp(), ...headers }, payload: JSON.stringify(body ?? {}) });
const GET = (url: string) => app.inject({ method: 'GET', url, headers: { 'x-forwarded-for': nextIp() } });

// Issue an invitation in-process and hand back the raw token (as the email would carry it).
async function issue(orgId: string, orgName: string, email: string, role: 'OWNER' | 'MEMBER' = 'MEMBER') {
  const r = await issueInvitation(prisma, { tenantId, clientOrgId: orgId, orgName, email, role, actor: { staffUserId: 'staff-x' } });
  assert.equal(r.ok, true, 'issue should succeed');
  return r as Extract<typeof r, { ok: true }>;
}

before(async () => {
  app = await buildApp();
  const t = await resolveDefaultTenant(prisma);
  tenantId = t.id;
  adminAuth = await mkStaff('ADMIN');
  engineerAuth = await mkStaff('ENGINEER');
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});

// ── Creation + RBAC + no-secret-leak ─────────────────────────────────────────
test('authorized staff (ADMIN) can create an invitation; no token/password in the response', async () => {
  const org = await mkOrg();
  const res = await POST('/v1/admin/client-invitations', adminAuth, { clientOrgId: org.id, email: `c-${uid()}@example.com`, role: 'OWNER' });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.ok(body.invitationId);
  const serialized = JSON.stringify(body);
  assert.ok(!/password/i.test(serialized), 'no password field in response');
  assert.ok(!('token' in body) && !('tokenHash' in body), 'no token in response');
});

test('unauthorized staff (ENGINEER, no team:assign) cannot create an invitation (403)', async () => {
  const org = await mkOrg();
  const res = await POST('/v1/admin/client-invitations', engineerAuth, { clientOrgId: org.id, email: `c-${uid()}@example.com` });
  assert.equal(res.statusCode, 403);
});

test('only the SHA-256 hash is stored — the raw token never appears in the row', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { invitationId, token } = await issue(org.id, org.name, email);
  const row = await prisma.clientInvitation.findUniqueOrThrow({ where: { id: invitationId } });
  assert.equal(row.tokenHash, hashInvitationToken(token));
  assert.notEqual(row.tokenHash, token);
  assert.ok(!JSON.stringify(row).includes(token), 'raw token must not be persisted anywhere on the row');
});

test('the invitation email carries the setup link, never a temporary password', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  await issue(org.id, org.name, email);
  const mail = await prisma.emailOutbox.findFirst({ where: { tenantId, toAddress: email, type: 'PORTAL_INVITE' }, orderBy: { createdAt: 'desc' } });
  assert.ok(mail, 'invitation email should be recorded in the outbox');
  assert.match(mail!.textBody, /setup-account\?token=/);
  assert.ok(!/temporary password/i.test(mail!.textBody + mail!.htmlBody), 'must not email a temporary password');
});

// ── Inspect + accept happy path ──────────────────────────────────────────────
test('a valid token can be inspected and accepted, then the user can log in', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { token } = await issue(org.id, org.name, email, 'OWNER');

  const insp = JSON.parse((await GET(`/v1/auth/invitations/${token}`)).body);
  assert.equal(insp.status, 'VALID');
  assert.equal(insp.email, email);
  assert.equal(insp.orgName, org.name);

  const acc = await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: STRONG });
  assert.equal(acc.statusCode, 200);
  assert.equal(JSON.parse(acc.body).ok, true);

  // Password stored only as a bcrypt hash.
  const user = await prisma.clientUser.findUniqueOrThrow({ where: { tenantId_normalizedEmail: { tenantId, normalizedEmail: email } } });
  assert.match(user.passwordHash, /^\$2[aby]\$/);
  assert.notEqual(user.passwordHash, STRONG);
  assert.equal(await verifyPassword(STRONG, user.passwordHash), true);
  assert.equal(user.role, 'OWNER');

  // Successful setup allows portal login.
  const login = await POST('/v1/portal/auth/login', { 'content-type': 'application/json' }, { email, password: STRONG });
  assert.equal(login.statusCode, 200);
});

test('an accepted token cannot be reused (and no second user is created)', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { token } = await issue(org.id, org.name, email);
  assert.equal((await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: STRONG })).statusCode, 200);
  const reuse = await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: STRONG });
  assert.equal(reuse.statusCode, 409);
  assert.equal(await prisma.clientUser.count({ where: { tenantId, normalizedEmail: email } }), 1);
});

// ── Rejections: weak / expired / revoked / invalid ───────────────────────────
test('a weak/denylisted password is rejected server-side and does not consume the invite', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { token } = await issue(org.id, org.name, email);
  const short = await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: 'short' });
  assert.equal(short.statusCode, 400);
  const demo = await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: 'portal-demo-2026' });
  assert.equal(demo.statusCode, 400);
  // Still usable with a strong password.
  assert.equal((await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: STRONG })).statusCode, 200);
});

test('an expired token is rejected', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { token, tokenHash } = generateInvitationToken();
  await prisma.clientInvitation.create({ data: { tenantId, clientOrgId: org.id, email, normalizedEmail: email, role: 'MEMBER', tokenHash, expiresAt: new Date(Date.now() - 60_000) } });
  assert.equal(JSON.parse((await GET(`/v1/auth/invitations/${token}`)).body).status, 'EXPIRED');
  assert.equal((await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: STRONG })).statusCode, 410);
});

test('a revoked token is rejected', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { invitationId, token } = await issue(org.id, org.name, email);
  const rev = await revokeInvitation(prisma, { tenantId, invitationId, actor: { staffUserId: 'staff-x' } });
  assert.equal(rev.ok, true);
  assert.equal(JSON.parse((await GET(`/v1/auth/invitations/${token}`)).body).status, 'REVOKED');
  assert.equal((await POST(`/v1/auth/invitations/${token}/accept`, { 'content-type': 'application/json' }, { password: STRONG })).statusCode, 410);
});

test('an invalid/unknown token reveals nothing and cannot be accepted', async () => {
  const bogus = generateInvitationToken().token;
  assert.equal(JSON.parse((await GET(`/v1/auth/invitations/${bogus}`)).body).status, 'INVALID');
  assert.equal((await POST(`/v1/auth/invitations/${bogus}/accept`, { 'content-type': 'application/json' }, { password: STRONG })).statusCode, 404);
});

// ── Resend / dedup / existing user ───────────────────────────────────────────
test('resend rotates the token: the old link stops working, the new one works', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { invitationId, token: oldToken } = await issue(org.id, org.name, email);
  const rs = await resendInvitation(prisma, { tenantId, invitationId, actor: { staffUserId: 'staff-x' } });
  assert.equal(rs.ok, true);
  const newToken = (rs as Extract<typeof rs, { ok: true }>).token;
  assert.notEqual(newToken, oldToken);
  // Old token is now invalid; new token accepts.
  assert.equal(JSON.parse((await GET(`/v1/auth/invitations/${oldToken}`)).body).status, 'INVALID');
  assert.equal((await POST(`/v1/auth/invitations/${newToken}/accept`, { 'content-type': 'application/json' }, { password: STRONG })).statusCode, 200);
  const inv = await prisma.clientInvitation.findUniqueOrThrow({ where: { id: invitationId } });
  assert.ok(inv.sendCount >= 2);
});

test('re-inviting the same email/org refreshes the SAME invitation (no duplicate active invite)', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const a = await issue(org.id, org.name, email);
  const b = await issue(org.id, org.name, email);
  assert.equal(a.invitationId, b.invitationId, 'second invite refreshes the first');
  assert.equal(b.refreshed, true);
  const active = await prisma.clientInvitation.count({ where: { tenantId, clientOrgId: org.id, normalizedEmail: email, acceptedAt: null, revokedAt: null } });
  assert.equal(active, 1);
});

test('an existing active user is not duplicated (ALREADY_ACTIVE_MEMBER)', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  await prisma.clientUser.create({ data: { tenantId, clientOrgId: org.id, email, normalizedEmail: email, passwordHash: 'x', role: 'MEMBER' } });
  const r = await issueInvitation(prisma, { tenantId, clientOrgId: org.id, orgName: org.name, email, role: 'MEMBER', actor: { staffUserId: 'staff-x' } });
  assert.equal(r.ok, false);
  assert.equal((r as Extract<typeof r, { ok: false }>).code, 'ALREADY_ACTIVE_MEMBER');
  assert.equal(await prisma.clientInvitation.count({ where: { tenantId, clientOrgId: org.id, normalizedEmail: email } }), 0);
});

test('an email already used by another org is rejected (no silent reassignment)', async () => {
  const orgA = await mkOrg();
  const orgB = await mkOrg();
  const email = `c-${uid()}@example.com`;
  await prisma.clientUser.create({ data: { tenantId, clientOrgId: orgA.id, email, normalizedEmail: email, passwordHash: 'x', role: 'MEMBER' } });
  const r = await issueInvitation(prisma, { tenantId, clientOrgId: orgB.id, orgName: orgB.name, email, role: 'MEMBER', actor: { staffUserId: 'staff-x' } });
  assert.equal(r.ok, false);
  assert.equal((r as Extract<typeof r, { ok: false }>).code, 'EMAIL_IN_OTHER_ORG');
});

// ── Tenant isolation ─────────────────────────────────────────────────────────
test('cross-tenant invitation access is rejected (scoped by tenantId)', async () => {
  const org = await mkOrg();
  const { invitationId } = await issue(org.id, org.name, `c-${uid()}@example.com`);
  const otherTenant = await prisma.tenant.create({ data: { slug: `t-${uid()}`, name: 'Other' } });
  assert.deepEqual(await resendInvitation(prisma, { tenantId: otherTenant.id, invitationId, actor: {} }), { ok: false, code: 'NOT_FOUND' });
  assert.deepEqual(await revokeInvitation(prisma, { tenantId: otherTenant.id, invitationId, actor: {} }), { ok: false, code: 'NOT_FOUND' });
});

// ── Concurrency ──────────────────────────────────────────────────────────────
test('concurrent acceptance of the same token creates exactly one user', async () => {
  const org = await mkOrg();
  const email = `c-${uid()}@example.com`;
  const { token } = await issue(org.id, org.name, email);
  const [r1, r2] = await Promise.all([
    acceptInvitation(prisma, token, STRONG),
    acceptInvitation(prisma, token, STRONG),
  ]);
  const oks = [r1, r2].filter((r) => r.ok).length;
  assert.equal(oks, 1, 'exactly one accept should succeed');
  assert.equal(await prisma.clientUser.count({ where: { tenantId, normalizedEmail: email } }), 1);
});
