/**
 * Malware scanning — the ClamAV INSTREAM protocol (against a fake clamd TCP
 * server, no external infra) + the durable scan-job lifecycle and file-state
 * finalization. Stub scanner stays the default in tests.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signStaff } from '../../src/staff/auth';
import { signSession } from '../../src/portal/auth';
import { storage, objectKey } from '../../src/storage';
import { scanner, __setScannerForTest, type MalwareScanner } from '../../src/scanning/scanner';
import { ClamAvScanner } from '../../src/scanning/clamav';
import { processScanJobs, computeHash } from '../../src/scanning/service';

const uid = () => randomUUID().slice(0, 8);
const pdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from(`c-${uid()}`), Buffer.from('\n%%EOF')]);
const EICAR = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let orgId: string;
let projectId: string;
let staffAuthz: string;
let clientAuthz: string;

// ── Fake clamd ────────────────────────────────────────────────────────────────
type Mode = 'ok' | 'found' | 'error' | 'malformed' | 'hang';
function startFakeClamd(mode: Mode): Promise<{ port: number; close: () => void }> {
  const server = net.createServer((socket) => {
    let buf = Buffer.alloc(0);
    let inStream = false;
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (!inStream) {
        const s = buf.toString('latin1');
        if (s.startsWith('zVERSION')) { socket.write('ClamAV 1.0.1/27000/Wed Jan 01\0'); return; }
        const marker = 'zINSTREAM\0';
        const idx = s.indexOf(marker);
        if (idx < 0) return;
        inStream = true;
        buf = buf.subarray(idx + marker.length);
      }
      // Consume length-prefixed frames until the zero-length terminator.
      while (buf.length >= 4) {
        const len = buf.readUInt32BE(0);
        if (len === 0) {
          if (mode === 'ok') socket.write('stream: OK\0');
          else if (mode === 'found') socket.write('stream: Eicar-Test-Signature FOUND\0');
          else if (mode === 'error') socket.write('stream: broken ERROR\0');
          else if (mode === 'malformed') socket.write('totally-not-a-clamd-response\0');
          // 'hang' → write nothing, keep socket open → client times out.
          if (mode !== 'hang') socket.end();
          return;
        }
        if (buf.length < 4 + len) break;
        buf = buf.subarray(4 + len);
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const port = (server.address() as net.AddressInfo).port;
    resolve({ port, close: () => server.close() });
  }));
}

async function mkScanningFile(bytes: Buffer, opts: { clientVisible?: boolean; badKey?: boolean } = {}) {
  const f = await prisma.projectFile.create({ data: { tenantId, projectId, name: `s-${uid()}.pdf`, storageProvider: 'local', version: 1, isCurrent: false, state: 'SCANNING', scanStatus: 'pending', clientVisible: opts.clientVisible ?? true } });
  const key = objectKey({ tenantId, clientOrgId: orgId, projectId, fileId: f.id, version: 1, filename: 'x.pdf' });
  if (!opts.badKey) await storage().put(key, bytes, 'application/pdf');
  await prisma.projectFile.update({ where: { id: f.id }, data: { storageKey: opts.badKey ? `${key}-missing` : key, fileHash: computeHash(bytes) } });
  await prisma.fileScan.create({ data: { tenantId, fileId: f.id, idempotencyKey: `scan:${f.id}`, status: 'PENDING', fileHash: computeHash(bytes), fileSizeBytes: bytes.length, provider: 'test', maxAttempts: 2 } });
  return f.id;
}
const scanOf = (fileId: string) => prisma.fileScan.findFirstOrThrow({ where: { fileId } });
const fileOf = (fileId: string) => prisma.projectFile.findUniqueOrThrow({ where: { id: fileId } });

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  orgId = (await prisma.clientOrg.create({ data: { tenantId, name: 'Scan Org', slug: `scan-${uid()}` } })).id;
  projectId = (await prisma.project.create({ data: { tenantId, clientOrgId: orgId, name: 'Scan Proj' } })).id;
  const se = `staff-${uid()}@ex.com`;
  const staff = await prisma.staffUser.create({ data: { tenantId, email: se, normalizedEmail: se, passwordHash: 'x', role: 'ADMIN', active: true } });
  staffAuthz = `Bearer ${signStaff({ sub: staff.id, role: 'ADMIN', tenant: tenantId, email: se })}`;
  const ce = `owner-${uid()}@ex.com`;
  const cu = await prisma.clientUser.create({ data: { tenantId, clientOrgId: orgId, email: ce, normalizedEmail: ce, passwordHash: 'x', role: 'OWNER' } });
  clientAuthz = `Bearer ${signSession({ sub: cu.id, org: orgId, tenant: tenantId, email: ce })}`;
});
after(async () => { __setScannerForTest(null); await app.close(); await prisma.$disconnect(); });

// ── ClamAV INSTREAM protocol ─────────────────────────────────────────────────
test('ClamAV OK parses as CLEAN and records engine/signature version', async () => {
  const c = await startFakeClamd('ok');
  const s = new ClamAvScanner({ host: '127.0.0.1', port: c.port, timeoutMs: 1000 });
  const r = await s.scan(pdf());
  c.close();
  assert.equal(r.result, 'CLEAN');
  assert.equal(r.engineVersion, 'ClamAV 1.0.1');
  assert.equal(r.signatureVersion, '27000');
});

test('ClamAV FOUND parses as INFECTED with the threat name', async () => {
  const c = await startFakeClamd('found');
  const s = new ClamAvScanner({ host: '127.0.0.1', port: c.port, timeoutMs: 1000 });
  const r = await s.scan(EICAR);
  c.close();
  assert.equal(r.result, 'INFECTED');
  assert.equal(r.threatName, 'Eicar-Test-Signature');
});

test('malformed scanner response fails safe (ERROR, never CLEAN)', async () => {
  const c = await startFakeClamd('malformed');
  const r = await new ClamAvScanner({ host: '127.0.0.1', port: c.port, timeoutMs: 1000 }).scan(pdf());
  c.close();
  assert.equal(r.result, 'ERROR');
  assert.equal(r.errorCode, 'BAD_RESPONSE');
});

test('ClamAV ERROR response is ERROR', async () => {
  const c = await startFakeClamd('error');
  const r = await new ClamAvScanner({ host: '127.0.0.1', port: c.port, timeoutMs: 1000 }).scan(pdf());
  c.close();
  assert.equal(r.result, 'ERROR');
});

test('connection refused → ERROR (retryable)', async () => {
  // Port 1 has no listener.
  const r = await new ClamAvScanner({ host: '127.0.0.1', port: 1, timeoutMs: 800 }).scan(pdf());
  assert.equal(r.result, 'ERROR');
  assert.match(r.errorCode || '', /ECONNREFUSED|SOCKET_ERROR/);
});

test('scanner timeout → TIMEOUT', async () => {
  const c = await startFakeClamd('hang');
  const r = await new ClamAvScanner({ host: '127.0.0.1', port: c.port, timeoutMs: 300 }).scan(pdf());
  c.close();
  assert.equal(r.result, 'TIMEOUT');
});

test('oversized file is rejected before scanning (UNSUPPORTED)', async () => {
  const r = await new ClamAvScanner({ host: '127.0.0.1', port: 1, maxBytes: 4 }).scan(pdf());
  assert.equal(r.result, 'UNSUPPORTED');
  assert.equal(r.errorCode, 'FILE_TOO_LARGE');
});

// ── Durable scan-job lifecycle ───────────────────────────────────────────────
test('stub scanner is the default in tests + a clean file becomes AVAILABLE', async () => {
  __setScannerForTest(null);
  assert.equal(scanner().provider, 'stub');
  const id = await mkScanningFile(pdf());
  await processScanJobs(prisma, new Date());
  assert.equal((await fileOf(id)).state, 'AVAILABLE');
  const s = await scanOf(id);
  assert.equal(s.result, 'CLEAN');
  assert.equal(s.status, 'SUCCEEDED');
});

test('EICAR file becomes QUARANTINED via the worker (object retained, hash stable)', async () => {
  __setScannerForTest(null);
  const id = await mkScanningFile(EICAR);
  const beforeHash = (await fileOf(id)).fileHash;
  await processScanJobs(prisma, new Date());
  const f = await fileOf(id);
  assert.equal(f.state, 'QUARANTINED');
  assert.equal(f.isCurrent, false);
  assert.equal(f.fileHash, beforeHash); // hash stored + stable
  assert.equal(computeHash(EICAR), beforeHash);
  assert.equal((await scanOf(id)).result, 'INFECTED');
  // Object retained (quarantine policy), but never downloadable.
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${id}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);
});

test('clamav engine + signature version are recorded through the worker', async () => {
  const c = await startFakeClamd('ok');
  __setScannerForTest(new ClamAvScanner({ host: '127.0.0.1', port: c.port, timeoutMs: 1000 }));
  const id = await mkScanningFile(pdf());
  await processScanJobs(prisma, new Date());
  c.close();
  __setScannerForTest(null);
  const s = await scanOf(id);
  assert.equal(s.result, 'CLEAN');
  assert.equal(s.engineVersion, 'ClamAV 1.0.1');
  assert.equal(s.signatureVersion, '27000');
  assert.equal((await fileOf(id)).state, 'AVAILABLE');
});

test('scanner ERROR retries; after maxAttempts the scan is DEAD and the file stays unavailable', async () => {
  const errScanner: MalwareScanner = { provider: 'x', async scan() { return { result: 'ERROR', provider: 'x', errorCode: 'ECONNREFUSED' }; } };
  __setScannerForTest(errScanner);
  const id = await mkScanningFile(pdf()); // maxAttempts=2
  // Attempt 1 → back to PENDING (retry), retryCount incremented.
  await processScanJobs(prisma, new Date());
  let s = await scanOf(id);
  assert.equal(s.status, 'PENDING');
  assert.ok(s.retryCount >= 1);
  assert.equal((await fileOf(id)).state, 'SCANNING'); // never available on error
  // Attempt 2 (advance clock past backoff) → attempts hit max → DEAD.
  await processScanJobs(prisma, new Date(Date.now() + 3_600_000));
  s = await scanOf(id);
  assert.equal(s.status, 'DEAD');
  assert.equal((await fileOf(id)).state, 'SCANNING'); // still unavailable, never AVAILABLE
  __setScannerForTest(null);
});

test('missing object produces a safe failure (never available)', async () => {
  __setScannerForTest(null);
  const id = await mkScanningFile(pdf(), { badKey: true });
  await processScanJobs(prisma, new Date());
  assert.notEqual((await fileOf(id)).state, 'AVAILABLE');
});

test('a scan job is single-claim / idempotent (unique idempotency key)', async () => {
  const id = await mkScanningFile(pdf());
  await assert.rejects(
    prisma.fileScan.create({ data: { tenantId, fileId: id, idempotencyKey: `scan:${id}`, status: 'PENDING' } }),
    /Unique constraint|P2002/,
  );
});

test('file cannot be downloaded while SCANNING (client + staff)', async () => {
  __setScannerForTest(null);
  const id = await mkScanningFile(pdf(), { clientVisible: true });
  // Do NOT run the worker — leave it SCANNING.
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${id}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/files/${id}/download`, headers: { authorization: clientAuthz } })).statusCode, 404);
});

// ── Access control on scan details ───────────────────────────────────────────
test('staff can view scan status; clients cannot reach the scan endpoint', async () => {
  __setScannerForTest(null);
  const id = await mkScanningFile(pdf());
  await processScanJobs(prisma, new Date());
  const staffRes = await app.inject({ method: 'GET', url: `/v1/admin/files/${id}/scan`, headers: { authorization: staffAuthz } });
  assert.equal(staffRes.statusCode, 200);
  assert.equal(JSON.parse(staffRes.body).scan.result, 'CLEAN');
  // Client (portal) token cannot use the staff scan endpoint → 401 (no internal detail).
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/files/${id}/scan`, headers: { authorization: clientAuthz } })).statusCode, 401);
});
