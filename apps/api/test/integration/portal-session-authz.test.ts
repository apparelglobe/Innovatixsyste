/**
 * Slice 0 — client-session read authorization hardening.
 *
 * Proves requireSession now honors the caller's CURRENT DB-backed membership (not just the JWT):
 *   • active OWNER/MEMBER keep normal access; MEMBER stays blocked from OWNER-only billing (403);
 *   • a DEACTIVATED or REMOVED client loses ALL portal reads incl. file download (401) with a still-valid
 *     JWT; reactivation restores access; a downgraded OWNER→MEMBER loses OWNER-only resources (403);
 *   • cross-org ids still 404; authorized downloads still return the exact bytes;
 *   • the OWNER/write path performs exactly ONE membership-role lookup (requireSession), not two —
 *     requireClientPermission reuses the supplied role and a supplied null denies without a bypass.
 *
 * Run: NODE_ENV=test npx tsx --test test/integration/portal-session-authz.test.ts
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signSession } from '../../src/portal/auth';
import { storage } from '../../src/storage';
import { requireClientPermission } from '../../src/client/authz';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let orgA: { id: string }, orgB: { id: string };
let ownerA: { id: string; clientOrgId: string; email: string };
let memberA: { id: string; clientOrgId: string; email: string };
let projectA: { id: string }, projectB: { id: string };
let fileA: { id: string }, fileB: { id: string }, fileABytes: Buffer;
let invA: { id: string };

const sess = (u: { id: string; clientOrgId: string; email: string }) =>
  signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email });
const get = (url: string, token: string) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
const mkUser = (clientOrgId: string, role: 'OWNER' | 'MEMBER') => {
  const email = `${role.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId, clientOrgId, email, normalizedEmail: email, passwordHash: 'x', role } });
};
const mkFile = async (projectId: string, clientOrgId: string) => {
  const bytes = Buffer.from(`%PDF-1.4\nslice0-${uid()}\n%%EOF`);
  const key = `tenant/${tenantId}/org/${clientOrgId}/project/${projectId}/file/${uid()}/v/1/x.pdf`;
  await storage().put(key, bytes, 'application/pdf');
  const row = await prisma.projectFile.create({
    data: { tenantId, projectId, name: `f-${uid()}.pdf`, mimeType: 'application/pdf', storageKey: key, storageProvider: 'local', version: 1, isCurrent: true, state: 'AVAILABLE', clientVisible: true } as never,
  });
  return { row, bytes };
};
const fakeReply = () => {
  const r: { statusCode: number; code: (c: number) => typeof r; send: () => typeof r } = {
    statusCode: 0,
    code(c: number) { r.statusCode = c; return r; },
    send() { return r; },
  };
  return r;
};

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  orgA = await prisma.clientOrg.create({ data: { tenantId, name: `SA ${uid()}`, slug: `sa-${uid()}` } });
  orgB = await prisma.clientOrg.create({ data: { tenantId, name: `SB ${uid()}`, slug: `sb-${uid()}` } });
  ownerA = await mkUser(orgA.id, 'OWNER');
  memberA = await mkUser(orgA.id, 'MEMBER');
  projectA = await prisma.project.create({ data: { tenantId, clientOrgId: orgA.id, name: 'PA' } });
  projectB = await prisma.project.create({ data: { tenantId, clientOrgId: orgB.id, name: 'PB' } });
  const fA = await mkFile(projectA.id, orgA.id); fileA = fA.row; fileABytes = fA.bytes;
  const fB = await mkFile(projectB.id, orgB.id); fileB = fB.row;
  invA = await prisma.invoice.create({ data: { tenantId, clientOrgId: orgA.id, projectId: projectA.id, number: `INV-${uid()}`, amountCents: 120000 } }); // kind STANDARD, status SENT (defaults)
});
after(async () => { await app.close(); await prisma.$disconnect(); });

test('1. active OWNER read → 200', async () => {
  assert.equal((await get('/v1/portal/overview', sess(ownerA))).statusCode, 200);
  assert.equal((await get('/v1/portal/project', sess(ownerA))).statusCode, 200);
});

test('2. active MEMBER permitted (non-financial) read → 200', async () => {
  assert.equal((await get('/v1/portal/overview', sess(memberA))).statusCode, 200);
  assert.equal((await get('/v1/portal/project', sess(memberA))).statusCode, 200);
  assert.equal((await get('/v1/portal/me', sess(memberA))).statusCode, 200);
});

test('3. deactivated user + same valid JWT → 401 on every read; reactivate restores access', async () => {
  const tok = sess(memberA);
  assert.equal((await get('/v1/portal/overview', tok)).statusCode, 200); // baseline active
  assert.equal((await get(`/v1/portal/files/${fileA.id}/download`, tok)).statusCode, 200);
  await prisma.clientUser.update({ where: { id: memberA.id }, data: { active: false } });
  for (const url of ['/v1/portal/overview', '/v1/portal/project', '/v1/portal/me']) {
    assert.equal((await get(url, tok)).statusCode, 401, `${url} must be 401 while deactivated`);
  }
  assert.equal((await get(`/v1/portal/files/${fileA.id}/download`, tok)).statusCode, 401, 'download must be 401 while deactivated');
  await prisma.clientUser.update({ where: { id: memberA.id }, data: { active: true } });
  assert.equal((await get('/v1/portal/overview', tok)).statusCode, 200, 'reactivated → restored');
  assert.equal((await get(`/v1/portal/files/${fileA.id}/download`, tok)).statusCode, 200, 'reactivated → download restored');
});

test('4. removed membership + same valid JWT → 401', async () => {
  const gone = await mkUser(orgA.id, 'MEMBER');
  const tok = sess(gone);
  assert.equal((await get('/v1/portal/overview', tok)).statusCode, 200); // works while present
  await prisma.clientUser.delete({ where: { id: gone.id } });
  assert.equal((await get('/v1/portal/overview', tok)).statusCode, 401); // removed → 401
});

test('5. OWNER downgraded to MEMBER (old OWNER token) → OWNER-only resource 403', async () => {
  const u = await mkUser(orgA.id, 'OWNER');
  const tok = sess(u);
  assert.equal((await get(`/v1/portal/invoices/${invA.id}`, tok)).statusCode, 200); // OWNER → allowed
  await prisma.clientUser.update({ where: { id: u.id }, data: { role: 'MEMBER' } });
  assert.equal((await get(`/v1/portal/invoices/${invA.id}`, tok)).statusCode, 403); // fresh role = MEMBER → 403
});

test('6. MEMBER billing data does not leak (overview payableInvoice + invoice detail)', async () => {
  const ov = (await get('/v1/portal/overview', sess(ownerA))).json();
  assert.ok(ov.project?.payableInvoice, 'OWNER overview surfaces payableInvoice');
  const mov = (await get('/v1/portal/overview', sess(memberA))).json();
  assert.equal(mov.project?.payableInvoice ?? null, null, 'MEMBER overview must NOT include payableInvoice');
  assert.equal((await get(`/v1/portal/invoices/${invA.id}`, sess(memberA))).statusCode, 403, 'MEMBER invoice detail → 403');
});

test('7. cross-org project/file id → 404 (org isolation intact)', async () => {
  const tok = sess(ownerA);
  assert.equal((await get(`/v1/portal/projects/${projectB.id}`, tok)).statusCode, 404);
  assert.equal((await get(`/v1/portal/files/${fileB.id}/download`, tok)).statusCode, 404);
});

test('8. authorized file download returns the exact bytes', async () => {
  const r = await get(`/v1/portal/files/${fileA.id}/download`, sess(ownerA));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(Buffer.from(r.rawPayload), fileABytes);
});

test('9. one membership-role lookup, not two: requireClientPermission reuses a supplied role (and null denies without a bypass; omitted → fresh lookup)', async () => {
  const session = { sub: ownerA.id, org: orgA.id, tenant: tenantId, email: ownerA.email };
  const origFindFirst = prisma.clientUser.findFirst.bind(prisma.clientUser);
  let calls = 0;
  (prisma.clientUser as unknown as { findFirst: unknown }).findFirst = (...a: unknown[]) => { calls += 1; return (origFindFirst as (...x: unknown[]) => unknown)(...a); };
  try {
    // supplied OWNER role → NO DB lookup (this is the reuse that keeps OWNER routes at 1 lookup total)
    calls = 0;
    assert.equal(await requireClientPermission(fakeReply() as never, session, 'invoice:read', 'OWNER'), true);
    assert.equal(calls, 0, 'supplied role must skip the DB lookup');
    // supplied null → deny (401), still NO lookup, and never a bypass
    calls = 0;
    assert.equal(await requireClientPermission(fakeReply() as never, session, 'invoice:read', null), false);
    assert.equal(calls, 0, 'supplied null must deny without a DB lookup (no bypass)');
    // omitted role → fresh DB resolve (backward-compatible for any caller outside the portal)
    calls = 0;
    assert.equal(await requireClientPermission(fakeReply() as never, session, 'invoice:read'), true);
    assert.equal(calls, 1, 'omitted role must resolve fresh from the DB (backward-compat)');
  } finally {
    (prisma.clientUser as unknown as { findFirst: unknown }).findFirst = origFindFirst;
  }
});
