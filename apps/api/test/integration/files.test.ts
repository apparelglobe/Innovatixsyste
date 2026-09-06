/**
 * Secure file storage — upload state machine + download authorization, over real
 * HTTP against the built app on the test DB with the LOCAL provider (default in
 * test). Provider failure + size-mismatch are exercised via an injected storage.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signStaff } from '../../src/staff/auth';
import { signSession } from '../../src/portal/auth';
import { storage, __setStorageForTest } from '../../src/storage';
import type { FileStorage } from '../../src/storage/types';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let staffAuthz: string;
let orgA: { id: string }, projectA: { id: string };
let ownerA: { id: string; clientOrgId: string; email: string };
let ownerB: { id: string; clientOrgId: string; email: string };
let memberA: { id: string; clientOrgId: string; email: string };

const pdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from(`body-${uid()}\n`), Buffer.from('%%EOF')]);
const EICAR = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
const MZ = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x04]);

function multipart(filename: string, contentType: string, bytes: Buffer) {
  const b = `----inx${uid()}`;
  const head = Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${b}--\r\n`);
  return { body: Buffer.concat([head, bytes, tail]), contentType: `multipart/form-data; boundary=${b}` };
}
const upload = (projectId: string, file: { filename: string; contentType: string; bytes: Buffer }, query = '') => {
  const mp = multipart(file.filename, file.contentType, file.bytes);
  return app.inject({ method: 'POST', url: `/v1/admin/projects/${projectId}/files${query}`, headers: { authorization: staffAuthz, 'content-type': mp.contentType }, payload: mp.body });
};
const ownerAuth = (u: { id: string; clientOrgId: string; email: string }) => ({ authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email })}` });
const mkFileRow = async (over: Record<string, unknown>) => {
  // Back a directly-created row with a real object so permitted downloads succeed.
  const key = `tenant/${tenantId}/org/${orgA.id}/project/${projectA.id}/file/${uid()}/v/1/x.pdf`;
  await storage().put(key, pdf(), 'application/pdf');
  return prisma.projectFile.create({ data: { tenantId, projectId: projectA.id, name: `f-${uid()}.pdf`, storageKey: key, storageProvider: 'local', version: 1, isCurrent: true, state: 'AVAILABLE', ...over } as never });
};

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  const semail = `staff-${uid()}@example.com`;
  const staff = await prisma.staffUser.create({ data: { tenantId, email: semail, normalizedEmail: semail, passwordHash: 'x', role: 'ADMIN', active: true } });
  staffAuthz = `Bearer ${signStaff({ sub: staff.id, role: 'ADMIN', tenant: tenantId, email: semail })}`;
  orgA = await prisma.clientOrg.create({ data: { tenantId, name: 'File A', slug: `fa-${uid()}` } });
  const orgB = await prisma.clientOrg.create({ data: { tenantId, name: 'File B', slug: `fb-${uid()}` } });
  projectA = await prisma.project.create({ data: { tenantId, clientOrgId: orgA.id, name: 'Proj A' } });
  const mk = async (o: string, r: 'OWNER' | 'MEMBER') => { const e = `${r}-${uid()}@ex.com`; return prisma.clientUser.create({ data: { tenantId, clientOrgId: o, email: e, normalizedEmail: e, passwordHash: 'x', role: r } }); };
  ownerA = await mk(orgA.id, 'OWNER');
  ownerB = await mk(orgB.id, 'OWNER');
  memberA = await mk(orgA.id, 'MEMBER');
});
after(async () => { __setStorageForTest(null); await app.close(); await prisma.$disconnect(); });

test('authorized staff upload → AVAILABLE with a tenant/org/project-scoped object key (local provider works)', async () => {
  const res = await upload(projectA.id, { filename: 'report.pdf', contentType: 'application/pdf', bytes: pdf() });
  assert.equal(res.statusCode, 200);
  const id = JSON.parse(res.body).file.id;
  const row = await prisma.projectFile.findUniqueOrThrow({ where: { id } });
  assert.equal(row.state, 'AVAILABLE');
  assert.equal(row.isCurrent, true);
  assert.match(row.storageKey!, new RegExp(`^tenant/${tenantId}/org/${orgA.id}/project/${projectA.id}/file/${id}/v/1/`));
  // Object actually landed and verifies.
  assert.equal((await storage().head(row.storageKey!)).exists, true);
});

test('EICAR test file is quarantined and unavailable for download', async () => {
  const res = await upload(projectA.id, { filename: 'eicar.txt', contentType: 'text/plain', bytes: EICAR });
  assert.equal(res.statusCode, 400);
  const row = await prisma.projectFile.findFirstOrThrow({ where: { tenantId, projectId: projectA.id, name: 'eicar.txt' }, orderBy: { uploadedAt: 'desc' } });
  assert.equal(row.state, 'QUARANTINED');
  assert.equal(row.isCurrent, false);
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${row.id}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);
});

test('executable signature and double-extension are rejected up front', async () => {
  const exe = await upload(projectA.id, { filename: 'thing.pdf', contentType: 'application/pdf', bytes: MZ });
  assert.equal(exe.statusCode, 400);
  assert.match(JSON.parse(exe.body).reason, /executable/);
  const dbl = await upload(projectA.id, { filename: 'invoice.pdf.exe', contentType: 'application/pdf', bytes: pdf() });
  assert.equal(dbl.statusCode, 400);
  const bad = await upload(projectA.id, { filename: 'x.bin', contentType: 'application/x-msdownload', bytes: pdf() });
  assert.equal(bad.statusCode, 400);
});

test('version replacement creates a NEW object key; the previous version stays intact', async () => {
  const v1 = JSON.parse((await upload(projectA.id, { filename: 'spec.pdf', contentType: 'application/pdf', bytes: pdf() })).body).file.id;
  const v2res = await upload(projectA.id, { filename: 'spec.pdf', contentType: 'application/pdf', bytes: pdf() }, `?replaceId=${v1}`);
  assert.equal(v2res.statusCode, 200);
  const v2 = JSON.parse(v2res.body).file.id;
  const [r1, r2] = await Promise.all([prisma.projectFile.findUniqueOrThrow({ where: { id: v1 } }), prisma.projectFile.findUniqueOrThrow({ where: { id: v2 } })]);
  assert.equal(r2.version, 2);
  assert.notEqual(r1.storageKey, r2.storageKey, 'new version must use a new object key (no overwrite)');
  assert.equal(r1.isCurrent, false);
  assert.equal(r2.isCurrent, true);
  assert.equal(r1.state, 'AVAILABLE'); // prior version still retrievable by staff
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${v1}/download`, headers: { authorization: staffAuthz } })).statusCode, 200);
});

test('download gating: unscanned/quarantined/internal-only/cross-org/deleted are all blocked correctly', async () => {
  const scanning = await mkFileRow({ state: 'SCANNING', clientVisible: true });
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${scanning.id}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);

  const internal = await mkFileRow({ state: 'AVAILABLE', clientVisible: false });
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/files/${internal.id}/download`, headers: ownerAuth(ownerA) })).statusCode, 404); // client can't see internal
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${internal.id}/download`, headers: { authorization: staffAuthz } })).statusCode, 200); // staff can

  const visible = await mkFileRow({ state: 'AVAILABLE', clientVisible: true });
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/files/${visible.id}/download`, headers: ownerAuth(ownerA) })).statusCode, 200); // org A owner
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/files/${visible.id}/download`, headers: ownerAuth(ownerB) })).statusCode, 404); // cross-org

  const del = await mkFileRow({ state: 'AVAILABLE', clientVisible: true });
  assert.equal((await app.inject({ method: 'DELETE', url: `/v1/admin/files/${del.id}`, headers: { authorization: staffAuthz } })).statusCode, 200);
  assert.equal((await prisma.projectFile.findUniqueOrThrow({ where: { id: del.id } })).state, 'DELETED');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${del.id}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);
});

test('provider failure does NOT mark the file available (→ REJECTED, 502)', async () => {
  const failing: FileStorage = {
    provider: 'local', async put() { throw new Error('provider down'); }, async head() { return { exists: false }; }, async getBytes() { return null; },
    async getStream() { return null; }, async getSignedUrl() { return null; }, async delete() {},
  };
  __setStorageForTest(failing);
  try {
    const res = await upload(projectA.id, { filename: 'down.pdf', contentType: 'application/pdf', bytes: pdf() });
    assert.equal(res.statusCode, 502);
    const row = await prisma.projectFile.findFirstOrThrow({ where: { tenantId, projectId: projectA.id, name: 'down.pdf' }, orderBy: { uploadedAt: 'desc' } });
    assert.equal(row.state, 'REJECTED');
    assert.notEqual(row.state, 'AVAILABLE');
  } finally { __setStorageForTest(null); }
});

test('size mismatch after upload is rejected (no silent drift)', async () => {
  const mismatch: FileStorage = {
    provider: 'local', async put() {}, async head() { return { exists: true, size: 999999 }; }, async getBytes() { return null; },
    async getStream() { return null; }, async getSignedUrl() { return null; }, async delete() {},
  };
  __setStorageForTest(mismatch);
  try {
    const res = await upload(projectA.id, { filename: 'mismatch.pdf', contentType: 'application/pdf', bytes: pdf() });
    assert.equal(res.statusCode, 502);
    assert.equal((await prisma.projectFile.findFirstOrThrow({ where: { tenantId, projectId: projectA.id, name: 'mismatch.pdf' }, orderBy: { uploadedAt: 'desc' } })).state, 'REJECTED');
  } finally { __setStorageForTest(null); }
});

test('object writes are idempotent for a given key (safe re-completion)', async () => {
  const key = `tenant/${tenantId}/org/${orgA.id}/project/${projectA.id}/file/${uid()}/v/1/x.pdf`;
  const bytes = pdf();
  await storage().put(key, bytes, 'application/pdf');
  await storage().put(key, bytes, 'application/pdf'); // repeat
  const h = await storage().head(key);
  assert.equal(h.exists, true);
  assert.equal(h.size, bytes.length);
});

// ── Download hardening: deterministic Content-Length (fix/download-content-length) ──
const mkDownloadable = (bytes: Buffer, mime: string, name: string) => {
  const key = `tenant/${tenantId}/org/${orgA.id}/project/${projectA.id}/file/${uid()}/v/1/x.bin`;
  return storage().put(key, bytes, mime).then(() =>
    prisma.projectFile.create({ data: { tenantId, projectId: projectA.id, name, mimeType: mime, storageKey: key, storageProvider: 'local', version: 1, isCurrent: true, state: 'AVAILABLE', clientVisible: true } as never }));
};

test('download: exact Content-Length + byte-identical body + preserved Content-Type/Disposition (staff & client owner)', async () => {
  const bytes = pdf();
  const f = await mkDownloadable(bytes, 'application/pdf', 'report card.pdf');
  for (const [who, headers, url] of [
    ['staff', { authorization: staffAuthz }, `/v1/admin/files/${f.id}/download`],
    ['owner', ownerAuth(ownerA), `/v1/portal/files/${f.id}/download`],
  ] as const) {
    const res = await app.inject({ method: 'GET', url, headers });
    assert.equal(res.statusCode, 200, who);
    assert.equal(res.headers['content-length'], String(bytes.length), `${who}: exact Content-Length`);
    assert.equal(Buffer.compare(res.rawPayload, bytes), 0, `${who}: byte-identical body`);
    assert.match(String(res.headers['content-type']), /^application\/pdf/, `${who}: Content-Type preserved`);
    assert.equal(res.headers['content-disposition'], 'attachment; filename="report%20card.pdf"', `${who}: Content-Disposition preserved`);
  }
  // Permissions unchanged: cross-org owner still 404; a keyless row still 404 (guarded before the helper).
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/files/${f.id}/download`, headers: ownerAuth(ownerB) })).statusCode, 404);
  const keyless = await prisma.projectFile.create({ data: { tenantId, projectId: projectA.id, name: 'nokey.pdf', storageKey: null, storageProvider: 'local', version: 1, isCurrent: true, state: 'AVAILABLE', clientVisible: true } as never });
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${keyless.id}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);
});

test('download: a signed-URL (S3-style) provider still 302-redirects and is NOT given a forced Content-Length', async () => {
  const f = await mkDownloadable(pdf(), 'application/pdf', 's3.pdf');
  const signedStore: FileStorage = {
    provider: 's3', async put() {}, async head() { return { exists: true, size: 123 }; }, async getBytes() { return null; },
    async getStream() { return null; }, async getSignedUrl() { return 'https://signed.example/obj?sig=x'; }, async delete() {},
  };
  __setStorageForTest(signedStore);
  try {
    const res = await app.inject({ method: 'GET', url: `/v1/admin/files/${f.id}/download`, headers: { authorization: staffAuthz } });
    assert.equal(res.statusCode, 302);
    assert.equal(res.headers.location, 'https://signed.example/obj?sig=x');
    assert.notEqual(res.headers['content-length'], '123'); // never force the remote head() size onto the redirect
  } finally { __setStorageForTest(null); }
});

test('client MEMBER download authorization is unchanged: downloads own-org client-visible file (200, hardened); internal → 404', async () => {
  const bytes = pdf();
  const f = await mkDownloadable(bytes, 'application/pdf', 'member.pdf'); // client-visible, org A
  const res = await app.inject({ method: 'GET', url: `/v1/portal/files/${f.id}/download`, headers: ownerAuth(memberA) });
  assert.equal(res.statusCode, 200, 'member can download an own-org client-visible file (file:read is a member permission)');
  assert.equal(res.headers['content-length'], String(bytes.length), 'member path also gets the deterministic Content-Length');
  assert.equal(Buffer.compare(res.rawPayload, bytes), 0, 'member: byte-identical body');
  // Policy unchanged: a member still cannot download an internal (non-client-visible) file.
  const internal = await mkFileRow({ state: 'AVAILABLE', clientVisible: false });
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/files/${internal.id}/download`, headers: ownerAuth(memberA) })).statusCode, 404);
});

test('download over a real socket is determinate-length (Content-Length set, NOT chunked) with exact bytes', async () => {
  const bytes = pdf();
  const f = await mkDownloadable(bytes, 'application/pdf', 'real.pdf');
  await app.listen({ port: 0, host: '127.0.0.1' }); // only this test listens; after() closes it
  const addr = app.server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const token = signSession({ sub: ownerA.id, org: ownerA.clientOrgId, tenant: tenantId, email: ownerA.email });
  const r = await fetch(`http://127.0.0.1:${port}/v1/portal/files/${f.id}/download`, { headers: { authorization: `Bearer ${token}` } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-length'), String(bytes.length));
  assert.equal(r.headers.get('transfer-encoding'), null); // determinate length ⇒ NOT chunked — the whole point of the fix
  const body = Buffer.from(await r.arrayBuffer());
  assert.equal(Buffer.compare(body, bytes), 0);
});
