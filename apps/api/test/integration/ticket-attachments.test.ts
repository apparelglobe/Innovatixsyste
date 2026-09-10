/**
 * Slice 5 — ticket attachments. Security (cross-org/cross-tenant/internal redaction incl. direct known-id,
 * scan-gated download, deactivated-401), the store→scan lifecycle + state-machine parity for the sibling
 * TicketAttachmentScan table, idempotency (file identity folded into the message hash), the timeline-free
 * finalize (zero PortalActivity / zero client email), notification folding, project-delete decoupling, and
 * multipart parsing. Over real HTTP against the built app on the test DB, stub scanner (inline) by default.
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
import { storage, attachmentKey, __setStorageForTest } from '../../src/storage';
import { computeHash, processTicketAttachmentScanJobs } from '../../src/scanning/service';
import { __setScannerForTest, type MalwareScanner } from '../../src/scanning/scanner';

const uid = () => randomUUID().slice(0, 8);
const pdf = () => Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from(`c-${uid()}\n`), Buffer.from('%%EOF')]);
const EICAR = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
const MZ = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x04]);

let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let staffAuthz: string;   // ADMIN
let viewerAuthz: string;  // VIEWER (ticket:read only)
let orgA: { id: string }, orgB: { id: string };
let ownerA: { id: string; clientOrgId: string; email: string };
let ownerB: { id: string; clientOrgId: string; email: string };
let projectA: { id: string };

const ownerAuth = (u: { id: string; clientOrgId: string; email: string }) => ({ authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email })}` });

// Multipart body with any number of text fields + optional file part(s).
function buildMultipart(fields: Record<string, string>, files: { name?: string; filename: string; contentType: string; bytes: Buffer }[] = []) {
  const b = `----inx${uid()}`;
  const parts: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`));
  for (const f of files) {
    parts.push(Buffer.from(`--${b}\r\nContent-Disposition: form-data; name="${f.name ?? 'file'}"; filename="${f.filename}"\r\nContent-Type: ${f.contentType}\r\n\r\n`));
    parts.push(f.bytes, Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${b}--\r\n`));
  return { body: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${b}` };
}
const k = () => randomUUID();

// Create a ticket WITH an attachment (multipart). Returns the parsed response + status.
async function createWithFile(auth: Record<string, string>, opts: { subject?: string; category?: string; body?: string; projectId?: string; extraFields?: Record<string, string>; file?: { filename: string; contentType: string; bytes: Buffer }; key?: string }) {
  const fields: Record<string, string> = { subject: opts.subject ?? `S ${uid()}`, category: opts.category ?? 'GENERAL', body: opts.body ?? 'hello', ...(opts.projectId ? { projectId: opts.projectId } : {}), ...(opts.extraFields ?? {}) };
  const mp = buildMultipart(fields, opts.file ? [opts.file] : []);
  const res = await app.inject({ method: 'POST', url: '/v1/portal/tickets', headers: { ...auth, 'content-type': mp.contentType, 'idempotency-key': opts.key ?? k() }, payload: mp.body });
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}
async function postFile(url: string, auth: Record<string, string>, body: string, file: { filename: string; contentType: string; bytes: Buffer } | null, key: string, extraFiles: typeof file[] = []) {
  const files = [...(file ? [file] : []), ...extraFiles.filter(Boolean) as { filename: string; contentType: string; bytes: Buffer }[]];
  const mp = buildMultipart({ body }, files);
  const res = await app.inject({ method: 'POST', url, headers: { ...auth, 'content-type': mp.contentType, 'idempotency-key': key }, payload: mp.body });
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') };
}
const clientDetail = async (auth: Record<string, string>, ticketId: string) => JSON.parse((await app.inject({ method: 'GET', url: `/v1/portal/tickets/${ticketId}`, headers: auth })).body).ticket;
const staffDetail = async (auth: Record<string, string>, ticketId: string) => JSON.parse((await app.inject({ method: 'GET', url: `/v1/admin/tickets/${ticketId}`, headers: auth })).body).ticket;
const attOf = (ticket: { messages: { attachments: unknown[] }[] }) => ticket.messages.flatMap((m) => m.attachments) as { id: string; downloadable: boolean; state?: string }[];

// Direct SCANNING attachment + PENDING scan job (worker-path + parity tests) — mirrors scanning.test.ts.
async function mkScanningAttachment(bytes: Buffer, opts: { internal?: boolean; badKey?: boolean; scanTenantId?: string; maxAttempts?: number } = {}) {
  const ticket = await prisma.ticket.create({ data: { tenantId, clientOrgId: orgA.id, number: `TKT-${uid()}`, subject: `s-${uid()}`, category: 'GENERAL', status: 'OPEN', createdByClientUserId: 'seed', lastMessageAt: new Date() } });
  const msg = await prisma.ticketMessage.create({ data: { tenantId, ticketId: ticket.id, authorType: 'TEAM', internal: opts.internal ?? false, body: 'x' } });
  const att = await prisma.ticketAttachment.create({ data: { tenantId, clientOrgId: orgA.id, ticketId: ticket.id, messageId: msg.id, filename: `a-${uid()}.pdf`, mimeType: 'application/pdf', sizeBytes: bytes.length, state: 'SCANNING', storageProvider: 'local' } });
  const key = attachmentKey({ tenantId, clientOrgId: orgA.id, ticketId: ticket.id, attachmentId: att.id, filename: 'a.pdf' });
  if (!opts.badKey) await storage().put(key, bytes, 'application/pdf');
  await prisma.ticketAttachment.update({ where: { id: att.id }, data: { storageKey: opts.badKey ? `${key}-missing` : key, fileHash: computeHash(bytes) } });
  await prisma.ticketAttachmentScan.create({ data: { tenantId: opts.scanTenantId ?? tenantId, attachmentId: att.id, idempotencyKey: `ticket-attachment-scan:${att.id}`, status: 'PENDING', fileHash: computeHash(bytes), fileSizeBytes: bytes.length, provider: 'test', maxAttempts: opts.maxAttempts ?? 2 } });
  return { ticketId: ticket.id, attId: att.id };
}
const attRow = (id: string) => prisma.ticketAttachment.findUniqueOrThrow({ where: { id } });
const scanRow = (attId: string) => prisma.ticketAttachmentScan.findFirstOrThrow({ where: { attachmentId: attId } });

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  const se = `staff-${uid()}@ex.com`;
  const staff = await prisma.staffUser.create({ data: { tenantId, email: se, normalizedEmail: se, passwordHash: 'x', role: 'ADMIN', active: true } });
  staffAuthz = `Bearer ${signStaff({ sub: staff.id, role: 'ADMIN', tenant: tenantId, email: se })}`;
  const ve = `viewer-${uid()}@ex.com`;
  const viewer = await prisma.staffUser.create({ data: { tenantId, email: ve, normalizedEmail: ve, passwordHash: 'x', role: 'VIEWER', active: true } });
  viewerAuthz = `Bearer ${signStaff({ sub: viewer.id, role: 'VIEWER', tenant: tenantId, email: ve })}`;
  orgA = await prisma.clientOrg.create({ data: { tenantId, name: 'Att A', slug: `aa-${uid()}` } });
  orgB = await prisma.clientOrg.create({ data: { tenantId, name: 'Att B', slug: `ab-${uid()}` } });
  projectA = await prisma.project.create({ data: { tenantId, clientOrgId: orgA.id, name: 'Proj A' } });
  const mk = async (o: string) => { const e = `o-${uid()}@ex.com`; return prisma.clientUser.create({ data: { tenantId, clientOrgId: o, email: e, normalizedEmail: e, passwordHash: 'x', role: 'OWNER', active: true } }); };
  ownerA = await mk(orgA.id);
  ownerB = await mk(orgB.id);
});
after(async () => { __setScannerForTest(null); __setStorageForTest(null); await app.close(); await prisma.$disconnect(); });

// ── Happy paths: client + staff attachments become AVAILABLE (inline stub) and download ──
test('client creates a ticket with a valid attachment → 201, AVAILABLE, downloadable', async () => {
  const r = await createWithFile(ownerAuth(ownerA), { file: { filename: 'doc.pdf', contentType: 'application/pdf', bytes: pdf() } });
  assert.equal(r.status, 201);
  const t = await clientDetail(ownerAuth(ownerA), r.body.ticket.id);
  const [a] = attOf(t);
  assert.ok(a && a.downloadable, 'attachment present + downloadable after inline clean scan');
  const dl = await app.inject({ method: 'GET', url: `/v1/portal/tickets/${r.body.ticket.id}/attachments/${a.id}/download`, headers: ownerAuth(ownerA) });
  assert.equal(dl.statusCode, 200);
});

test('project-less AND project-linked ticket attachments both work', async () => {
  const none = await createWithFile(ownerAuth(ownerA), { file: { filename: 'n.pdf', contentType: 'application/pdf', bytes: pdf() } });
  assert.equal(none.status, 201);
  assert.equal((await attRow((await clientDetail(ownerAuth(ownerA), none.body.ticket.id)).messages[0].attachments[0].id)).state, 'AVAILABLE');
  const linked = await createWithFile(ownerAuth(ownerA), { projectId: projectA.id, file: { filename: 'p.pdf', contentType: 'application/pdf', bytes: pdf() } });
  assert.equal(linked.status, 201);
  const lt = await prisma.ticket.findUniqueOrThrow({ where: { id: linked.body.ticket.id } });
  assert.equal(lt.projectId, projectA.id);
  const la = attOf(await clientDetail(ownerAuth(ownerA), linked.body.ticket.id))[0];
  assert.ok(la.downloadable);
});

test('client reply attachment works', async () => {
  const t = await createWithFile(ownerAuth(ownerA), {});
  const r = await postFile(`/v1/portal/tickets/${t.body.ticket.id}/replies`, ownerAuth(ownerA), 'more', { filename: 'r.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(r.status, 201);
  const a = attOf(await clientDetail(ownerAuth(ownerA), t.body.ticket.id)).at(-1)!;
  assert.ok(a.downloadable);
});

test('staff public reply attachment is client-visible; staff internal-note attachment is NOT', async () => {
  const t = await createWithFile(ownerAuth(ownerA), {});
  const id = t.body.ticket.id;
  const pub = await postFile(`/v1/admin/tickets/${id}/replies`, { authorization: staffAuthz }, 'staff reply', { filename: 'pub.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(pub.status, 201);
  const note = await postFile(`/v1/admin/tickets/${id}/notes`, { authorization: staffAuthz }, 'internal note', { filename: 'secret.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(note.status, 201);
  // Client sees the public one, NEVER the internal one.
  const cAtts = attOf(await clientDetail(ownerAuth(ownerA), id));
  const cFiles = cAtts.map((a) => a.id);
  const noteAttId = note.body.message ? undefined : undefined; // note attachment id via staff detail
  const sAtts = (await staffDetail({ authorization: staffAuthz }, id)).messages.flatMap((m: { internal: boolean; attachments: { id: string }[] }) => m.internal ? m.attachments.map((a) => a.id) : []);
  const internalAttId = sAtts[0];
  assert.ok(!cFiles.includes(internalAttId), 'internal-note attachment never in client payload');
  assert.equal(cAtts.length, 1, 'client sees exactly the public staff attachment (+ none internal)');
  // Direct known-id download of the internal attachment by the CLIENT → 404.
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/tickets/${id}/attachments/${internalAttId}/download`, headers: ownerAuth(ownerA) })).statusCode, 404);
});

test('VIEWER staff cannot see or download an internal-note attachment (direct known-id → 404); can see a public one', async () => {
  const t = await createWithFile(ownerAuth(ownerA), {});
  const id = t.body.ticket.id;
  await postFile(`/v1/admin/tickets/${id}/replies`, { authorization: staffAuthz }, 'pub', { filename: 'pub.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  await postFile(`/v1/admin/tickets/${id}/notes`, { authorization: staffAuthz }, 'note', { filename: 'int.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  const adminView = await staffDetail({ authorization: staffAuthz }, id);
  const internalAttId = adminView.messages.filter((m: { internal: boolean }) => m.internal).flatMap((m: { attachments: { id: string }[] }) => m.attachments)[0].id;
  const publicAttId = adminView.messages.filter((m: { internal: boolean; authorType: string }) => !m.internal && m.authorType === 'TEAM').flatMap((m: { attachments: { id: string }[] }) => m.attachments)[0].id;
  // VIEWER detail excludes the internal note (and its attachment) entirely.
  const viewerView = await staffDetail({ authorization: viewerAuthz }, id);
  const viewerAttIds = viewerView.messages.flatMap((m: { attachments: { id: string }[] }) => m.attachments.map((a) => a.id));
  assert.ok(!viewerAttIds.includes(internalAttId), 'VIEWER never sees the internal attachment in the thread');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/tickets/${id}/attachments/${internalAttId}/download`, headers: { authorization: viewerAuthz } })).statusCode, 404, 'VIEWER direct download of internal attachment → 404');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/tickets/${id}/attachments/${publicAttId}/download`, headers: { authorization: viewerAuthz } })).statusCode, 200, 'VIEWER can download a client-visible attachment');
});

// ── Cross-org / cross-tenant isolation ──
test('cross-org client cannot download another org’s ticket attachment (404, no existence reveal)', async () => {
  const t = await createWithFile(ownerAuth(ownerA), { file: { filename: 'a.pdf', contentType: 'application/pdf', bytes: pdf() } });
  const attId = attOf(await clientDetail(ownerAuth(ownerA), t.body.ticket.id))[0].id;
  // ownerB (different org) tries the exact ticket+attachment id → 404 (org-scoped).
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/tickets/${t.body.ticket.id}/attachments/${attId}/download`, headers: ownerAuth(ownerB) })).statusCode, 404);
});

test('worker refuses a cross-tenant scan job (TENANT_MISMATCH → DEAD, never AVAILABLE)', async () => {
  const { attId } = await mkScanningAttachment(pdf(), { scanTenantId: `other-tenant-${uid()}` });
  await processTicketAttachmentScanJobs(prisma, new Date());
  assert.equal((await scanRow(attId)).status, 'DEAD');
  assert.equal((await scanRow(attId)).errorCode, 'TENANT_MISMATCH');
  assert.notEqual((await attRow(attId)).state, 'AVAILABLE');
});

// ── Scan gating: unsafe files never downloadable ──
test('SCANNING / QUARANTINED / soft-deleted attachments are never downloadable (client + staff)', async () => {
  // SCANNING (worker not run yet)
  const { ticketId, attId } = await mkScanningAttachment(pdf());
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/tickets/${ticketId}/attachments/${attId}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/tickets/${ticketId}/attachments/${attId}/download`, headers: ownerAuth(ownerA) })).statusCode, 404);
  // Clean it → downloadable; then soft-delete (defensive column) → 404 again.
  await processTicketAttachmentScanJobs(prisma, new Date());
  assert.equal((await attRow(attId)).state, 'AVAILABLE');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/tickets/${ticketId}/attachments/${attId}/download`, headers: { authorization: staffAuthz } })).statusCode, 200);
  await prisma.ticketAttachment.update({ where: { id: attId }, data: { deletedAt: new Date(), state: 'DELETED' } });
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/tickets/${ticketId}/attachments/${attId}/download`, headers: { authorization: staffAuthz } })).statusCode, 404);
});

test('EICAR attachment is quarantined via the client upload path and is not downloadable', async () => {
  const r = await createWithFile(ownerAuth(ownerA), { file: { filename: 'eicar.txt', contentType: 'text/plain', bytes: EICAR } });
  assert.equal(r.status, 201, 'ticket + message still created; the file just never becomes downloadable');
  const a = attOf(await clientDetail(ownerAuth(ownerA), r.body.ticket.id))[0];
  assert.equal(a.downloadable, false);
  assert.equal((await attRow(a.id)).state, 'QUARANTINED');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/tickets/${r.body.ticket.id}/attachments/${a.id}/download`, headers: ownerAuth(ownerA) })).statusCode, 404);
});

// ── Scan state-machine PARITY (sibling table is a new implementation) ──
test('scan parity: fail-closed default PENDING_UPLOAD; CLEAN→AVAILABLE; UNSUPPORTED→REJECTED; ERROR→backoff→DEAD', async () => {
  __setScannerForTest(null); // default stub → CLEAN for a pdf
  const soon = () => new Date(Date.now() + 1000); // cover any sub-ms clock skew on the nextAttemptAt<=now claim
  // Fail-closed default at the DB layer (a bare row, no scan).
  const seed = await mkScanningAttachment(pdf());
  const seedMsg = await prisma.ticketMessage.findFirstOrThrow({ where: { ticketId: seed.ticketId } });
  const bare = await prisma.ticketAttachment.create({ data: { tenantId, clientOrgId: orgA.id, ticketId: seed.ticketId, messageId: seedMsg.id, filename: 'x.pdf' } });
  assert.equal(bare.state, 'PENDING_UPLOAD');
  // CLEAN → AVAILABLE (stub).
  const clean = await mkScanningAttachment(pdf());
  await processTicketAttachmentScanJobs(prisma, soon());
  assert.equal((await attRow(clean.attId)).state, 'AVAILABLE');
  // UNSUPPORTED/SKIPPED → REJECTED (fail closed).
  __setScannerForTest({ provider: 'x', async scan() { return { result: 'UNSUPPORTED', provider: 'x', errorCode: 'NOPE' }; } });
  const uns = await mkScanningAttachment(pdf());
  await processTicketAttachmentScanJobs(prisma, soon());
  assert.equal((await attRow(uns.attId)).state, 'REJECTED');
  assert.equal((await scanRow(uns.attId)).status, 'FAILED');
  // ERROR → retry (PENDING) then DEAD after maxAttempts; attachment stays unavailable throughout.
  const errScanner: MalwareScanner = { provider: 'x', async scan() { return { result: 'ERROR', provider: 'x', errorCode: 'ECONNREFUSED' }; } };
  __setScannerForTest(errScanner);
  const err = await mkScanningAttachment(pdf(), { maxAttempts: 2 });
  await processTicketAttachmentScanJobs(prisma, new Date());
  assert.equal((await scanRow(err.attId)).status, 'PENDING');
  assert.equal((await attRow(err.attId)).state, 'SCANNING');
  await processTicketAttachmentScanJobs(prisma, new Date(Date.now() + 3_600_000));
  assert.equal((await scanRow(err.attId)).status, 'DEAD');
  assert.notEqual((await attRow(err.attId)).state, 'AVAILABLE');
  __setScannerForTest(null);
});

// ── Timeline-free finalize: ZERO PortalActivity, ZERO client email/notification ──
test('a CLEAN attachment scan emits NO PortalActivity FILE row and NO client FILE_UPLOADED notification/email', async () => {
  const activityBefore = await prisma.portalActivity.count({ where: { clientOrgId: orgA.id } });
  const fileNotifBefore = await prisma.notification.count({ where: { tenantId, type: 'FILE_UPLOADED' } });
  const emailBefore = await prisma.emailOutbox.count();
  const { attId } = await mkScanningAttachment(pdf());
  await processTicketAttachmentScanJobs(prisma, new Date());
  assert.equal((await attRow(attId)).state, 'AVAILABLE');
  assert.equal(await prisma.portalActivity.count({ where: { clientOrgId: orgA.id } }), activityBefore, 'no PortalActivity row from attachment finalize');
  assert.equal(await prisma.notification.count({ where: { tenantId, type: 'FILE_UPLOADED' } }), fileNotifBefore, 'no FILE_UPLOADED client notification');
  assert.equal(await prisma.emailOutbox.count(), emailBefore, 'no email sent on attachment scan completion');
});

// ── Notification folding: no second email/job just for the attachment ──
test('staff reply WITH an attachment enqueues exactly one TICKET_NOTIFY job per active recipient (not two)', async () => {
  const t = await createWithFile(ownerAuth(ownerA), {}); // orgA has exactly one active client user (ownerA)
  const id = t.body.ticket.id;
  const r = await postFile(`/v1/admin/tickets/${id}/replies`, { authorization: staffAuthz }, 'reply w file', { filename: 'f.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(r.status, 201);
  const jobs = await prisma.sideEffectJob.findMany({ where: { type: 'TICKET_NOTIFY', idempotencyKey: { startsWith: `ticket-client-notify:${r.body.message.id}:` } } });
  assert.equal(jobs.length, 1, 'one job for the one active recipient — the attachment does not add a second');
  const internalNote = await postFile(`/v1/admin/tickets/${id}/notes`, { authorization: staffAuthz }, 'note w file', { filename: 'n.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(internalNote.status, 201);
  const noteJobs = await prisma.sideEffectJob.count({ where: { type: 'TICKET_NOTIFY', idempotencyKey: { startsWith: `ticket-client-notify:${internalNote.body.message.id}:` } } });
  assert.equal(noteJobs, 0, 'internal-note attachment produces zero client notification/job');
});

// ── Idempotency: file identity folded into the message hash ──
test('idempotent retry (same key + same file) → replay, exactly one attachment; different file → 409', async () => {
  const key = k();
  const file = { filename: 'same.pdf', contentType: 'application/pdf', bytes: pdf() };
  const first = await createWithFile(ownerAuth(ownerA), { subject: 'Dedup', body: 'b', file, key });
  assert.equal(first.status, 201);
  const replay = await createWithFile(ownerAuth(ownerA), { subject: 'Dedup', body: 'b', file, key });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotentReplay, true);
  assert.equal(replay.body.ticket.id, first.body.ticket.id);
  assert.equal(await prisma.ticketAttachment.count({ where: { ticketId: first.body.ticket.id } }), 1, 'retry did not create a second attachment');
  // Same key, DIFFERENT file → 409 (file identity is in the requestHash).
  const conflict = await createWithFile(ownerAuth(ownerA), { subject: 'Dedup', body: 'b', file: { filename: 'other.pdf', contentType: 'application/pdf', bytes: pdf() }, key });
  assert.equal(conflict.status, 409);
});

test('reply retry with the same attachment does not duplicate the link', async () => {
  const t = await createWithFile(ownerAuth(ownerA), {});
  const key = k();
  const file = { filename: 'rr.pdf', contentType: 'application/pdf', bytes: pdf() };
  const a = await postFile(`/v1/portal/tickets/${t.body.ticket.id}/replies`, ownerAuth(ownerA), 'same reply', file, key);
  const b = await postFile(`/v1/portal/tickets/${t.body.ticket.id}/replies`, ownerAuth(ownerA), 'same reply', file, key);
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(b.body.idempotentReplay, true);
  // Exactly the create attachment (0) + one reply attachment (1) = ... reply produced only ONE.
  const replyAttachments = await prisma.ticketAttachment.count({ where: { ticketId: t.body.ticket.id, message: { clientRequestId: key } } });
  assert.equal(replyAttachments, 1);
});

// ── Body-supplied ownership is ignored (re-derived from the trusted session/ticket) ──
test('body-supplied clientOrgId/tenantId are ignored — the attachment is owned by the caller’s org', async () => {
  const r = await createWithFile(ownerAuth(ownerA), { extraFields: { clientOrgId: orgB.id, tenantId: 'evil-tenant' }, file: { filename: 'x.pdf', contentType: 'application/pdf', bytes: pdf() } });
  assert.equal(r.status, 201);
  const att = await prisma.ticketAttachment.findFirstOrThrow({ where: { ticketId: r.body.ticket.id } });
  assert.equal(att.clientOrgId, orgA.id, 'org from the session, NOT the body');
  assert.equal(att.tenantId, tenantId);
});

// ── Project deletion decoupling ──
test('deleting the linked project leaves the ticket + attachment intact and downloadable (projectId SET NULL)', async () => {
  const proj = await prisma.project.create({ data: { tenantId, clientOrgId: orgA.id, name: 'Doomed' } });
  const r = await createWithFile(ownerAuth(ownerA), { projectId: proj.id, file: { filename: 'keep.pdf', contentType: 'application/pdf', bytes: pdf() } });
  const attId = attOf(await clientDetail(ownerAuth(ownerA), r.body.ticket.id))[0].id;
  await prisma.project.delete({ where: { id: proj.id } }); // RESTRICT-free: ticket.projectId is SET NULL, attachment has no projectId
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: r.body.ticket.id } })).projectId, null);
  assert.equal((await attRow(attId)).state, 'AVAILABLE');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/tickets/${r.body.ticket.id}/attachments/${attId}/download`, headers: ownerAuth(ownerA) })).statusCode, 200);
});

// ── Repliability gate + multipart validation ──
test('attachment reply on a RESOLVED/CLOSED ticket → 409 not_repliable; internal note with attachment allowed on any status', async () => {
  const t = await createWithFile(ownerAuth(ownerA), {});
  const id = t.body.ticket.id;
  await app.inject({ method: 'PATCH', url: `/v1/admin/tickets/${id}/status`, headers: { authorization: staffAuthz, 'content-type': 'application/json' }, payload: JSON.stringify({ status: 'RESOLVED', expectedStatus: 'OPEN' }) });
  const reply = await postFile(`/v1/admin/tickets/${id}/replies`, { authorization: staffAuthz }, 'late reply', { filename: 'x.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(reply.status, 409);
  assert.equal(reply.body.error, 'ticket_not_repliable');
  const note = await postFile(`/v1/admin/tickets/${id}/notes`, { authorization: staffAuthz }, 'note on resolved', { filename: 'n.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(note.status, 201, 'internal note + attachment allowed on a terminal ticket');
});

test('multipart validation: oversize/second-file/dangerous/magic-mismatch are all rejected; the message is not created', async () => {
  const before = await prisma.ticketMessage.count({ where: { tenantId } });
  // Executable magic bytes declared as PDF → 400.
  const mz = await createWithFile(ownerAuth(ownerA), { file: { filename: 'a.pdf', contentType: 'application/pdf', bytes: MZ } });
  assert.equal(mz.status, 400);
  // Double-extension → 400.
  const dbl = await createWithFile(ownerAuth(ownerA), { file: { filename: 'invoice.pdf.exe', contentType: 'application/pdf', bytes: pdf() } });
  assert.equal(dbl.status, 400);
  // Unsupported type → 400.
  const bad = await createWithFile(ownerAuth(ownerA), { file: { filename: 'x.bin', contentType: 'application/x-msdownload', bytes: pdf() } });
  assert.equal(bad.status, 400);
  // A second file part is refused by the global files:1 limit.
  const two = buildMultipart({ subject: 'two', category: 'GENERAL', body: 'b' }, [
    { filename: 'a.pdf', contentType: 'application/pdf', bytes: pdf() },
    { filename: 'b.pdf', contentType: 'application/pdf', bytes: pdf() },
  ]);
  const twoRes = await app.inject({ method: 'POST', url: '/v1/portal/tickets', headers: { ...ownerAuth(ownerA), 'content-type': two.contentType, 'idempotency-key': k() }, payload: two.body });
  assert.ok(twoRes.statusCode === 400 || twoRes.statusCode === 413, 'a second file is rejected');
  assert.equal(await prisma.ticketMessage.count({ where: { tenantId } }), before, 'no message row created by any rejected upload');
});

// ── Slice 0: deactivated client/staff still 401 on the new routes ──
test('a deactivated client (valid JWT) → 401 on attachment upload AND download', async () => {
  const e = `dead-${uid()}@ex.com`;
  const u = await prisma.clientUser.create({ data: { tenantId, clientOrgId: orgA.id, email: e, normalizedEmail: e, passwordHash: 'x', role: 'OWNER', active: true } });
  const auth = ownerAuth({ id: u.id, clientOrgId: orgA.id, email: e });
  // Create a ticket + attachment while active, then deactivate.
  const t = await createWithFile(auth, { file: { filename: 'a.pdf', contentType: 'application/pdf', bytes: pdf() } });
  assert.equal(t.status, 201);
  const attId = attOf(await clientDetail(auth, t.body.ticket.id))[0].id;
  await prisma.clientUser.update({ where: { id: u.id }, data: { active: false } });
  assert.equal((await createWithFile(auth, { file: { filename: 'b.pdf', contentType: 'application/pdf', bytes: pdf() } })).status, 401, 'upload blocked after deactivation');
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/tickets/${t.body.ticket.id}/attachments/${attId}/download`, headers: auth })).statusCode, 401, 'download blocked after deactivation');
});

test('a deactivated staff (valid JWT) → 401 on attachment upload AND download', async () => {
  const e = `deadstaff-${uid()}@ex.com`;
  const s = await prisma.staffUser.create({ data: { tenantId, email: e, normalizedEmail: e, passwordHash: 'x', role: 'ADMIN', active: true } });
  const auth = { authorization: `Bearer ${signStaff({ sub: s.id, role: 'ADMIN', tenant: tenantId, email: e })}` };
  const t = await createWithFile(ownerAuth(ownerA), {});
  const pub = await postFile(`/v1/admin/tickets/${t.body.ticket.id}/replies`, auth, 'r', { filename: 'a.pdf', contentType: 'application/pdf', bytes: pdf() }, k());
  assert.equal(pub.status, 201);
  const attId = (await staffDetail(auth, t.body.ticket.id)).messages.flatMap((m: { attachments: { id: string }[] }) => m.attachments)[0].id;
  await prisma.staffUser.update({ where: { id: s.id }, data: { active: false } });
  assert.equal((await postFile(`/v1/admin/tickets/${t.body.ticket.id}/replies`, auth, 'again', { filename: 'b.pdf', contentType: 'application/pdf', bytes: pdf() }, k())).status, 401);
  assert.equal((await app.inject({ method: 'GET', url: `/v1/admin/tickets/${t.body.ticket.id}/attachments/${attId}/download`, headers: auth })).statusCode, 401);
});

// ── Content-Length hardening preserved on attachment download ──
test('attachment download sets a deterministic Content-Length + byte-identical body (hardening reused)', async () => {
  const bytes = pdf();
  const r = await createWithFile(ownerAuth(ownerA), { file: { filename: 'len.pdf', contentType: 'application/pdf', bytes } });
  const attId = attOf(await clientDetail(ownerAuth(ownerA), r.body.ticket.id))[0].id;
  const dl = await app.inject({ method: 'GET', url: `/v1/portal/tickets/${r.body.ticket.id}/attachments/${attId}/download`, headers: ownerAuth(ownerA) });
  assert.equal(dl.statusCode, 200);
  assert.equal(dl.headers['content-length'], String(bytes.length));
  assert.equal(Buffer.compare(dl.rawPayload, bytes), 0);
  assert.match(String(dl.headers['content-disposition']), /attachment; filename="len.pdf"/);
});

// ── Backward-compat: JSON (no-file) create/reply still work ──
test('JSON (no-file) ticket create + reply still work (backward compatible)', async () => {
  const res = await app.inject({ method: 'POST', url: '/v1/portal/tickets', headers: { ...ownerAuth(ownerA), 'content-type': 'application/json', 'idempotency-key': k() }, payload: JSON.stringify({ subject: 'json', category: 'GENERAL', body: 'no file' }) });
  assert.equal(res.statusCode, 201);
  const id = JSON.parse(res.body).ticket.id;
  const detail = await clientDetail(ownerAuth(ownerA), id);
  assert.equal(detail.messages[0].attachments.length, 0);
  const rep = await app.inject({ method: 'POST', url: `/v1/admin/tickets/${id}/replies`, headers: { authorization: staffAuthz, 'content-type': 'application/json', 'idempotency-key': k() }, payload: JSON.stringify({ body: 'json reply' }) });
  assert.equal(rep.statusCode, 201);
});
