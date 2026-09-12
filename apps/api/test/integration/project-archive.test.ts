/**
 * Slice 7 — Past-Project Archive. Proves archive is a VIEW/lifecycle state, not a data or auth concern:
 *  - archive/unarchive NEVER change Project.status; unarchive just clears archivedAt (status preserved).
 *  - CAS: a stale/concurrent repeat fails safely (409), never a double-write / duplicate audit.
 *  - archived project stays fully readable: direct detail 200, invoices remain in Slice-6 billing +
 *    aggregates, files still downloadable, curated activity/history still readable, ticket links +
 *    attachments intact — archive is NEVER an authorization filter.
 *  - current-work surfaces EXCLUDE archived (relationship-overview cards + pastProjectCount,
 *    /portal/projects?scope, and the newest/default-project pick for overview/project/messages).
 *  - security unchanged: cross-org 404, deactivated 401, MEMBER billing 403, staff RBAC (project:write:
 *    ADMIN ok, VIEWER/ENGINEER 403, no staff token 401), cross-tenant/nonexistent 404.
 *  - archive/unarchive emit an AuditEvent ONLY — zero PortalActivity / notification / email / job.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signSession } from '../../src/portal/auth';
import { signStaff } from '../../src/staff/auth';
import { storage, attachmentKey, __setStorageForTest } from '../../src/storage';
import { MOMENT } from '../../src/lib/relationship-moments';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string, TB: string;
let orgA: string, orgB: string;
let projActive: string, projArchived: string, projAudit: string, projB: string, projTB: string;
let ownerA: C, memberA: C, deactivatedA: C, ownerB: C;
let adminAuth: string, viewerAuth: string, engineerAuth: string, adminAuthTB: string;
let invArchived: string, fileArchived: string, ticketArchived: string, ticketAttArchived: string;

type C = { id: string; clientOrgId: string; email: string };
const cAuth = (u: C, tenant = tenantId) => ({ authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant, email: u.email })}` });
const GET = (url: string, u: C, tenant = tenantId) => app.inject({ method: 'GET', url: `/v1${url}`, headers: cAuth(u, tenant) });
const jget = async (url: string, u: C) => { const r = await GET(url, u); return { s: r.statusCode, b: JSON.parse(r.body || '{}') }; };
const sPost = (url: string, authz: string) => app.inject({ method: 'POST', url, headers: { authorization: authz } });
const mkClient = async (o: string, role: 'OWNER' | 'MEMBER', active = true) => { const e = `pa-${uid()}@ex.com`; const u = await prisma.clientUser.create({ data: { tenantId, clientOrgId: o, email: e, normalizedEmail: e, passwordHash: 'x', role, active } }); return { id: u.id, clientOrgId: o, email: e }; };
const mkStaff = async (role: 'ADMIN' | 'VIEWER' | 'ENGINEER', tenant = tenantId) => { const e = `st-${uid()}@ex.com`; const s = await prisma.staffUser.create({ data: { tenantId: tenant, email: e, normalizedEmail: e, passwordHash: 'x', role: role as never, active: true } }); return `Bearer ${signStaff({ sub: s.id, role, tenant, email: e })}`; };
const projRow = (id: string) => prisma.project.findUniqueOrThrow({ where: { id } });

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  TB = (await prisma.tenant.create({ data: { slug: `pa-tb-${uid()}`, name: 'TB' } })).id;
  orgA = (await prisma.clientOrg.create({ data: { tenantId, name: `pa A ${uid()}`, slug: `paa-${uid()}` } })).id;
  orgB = (await prisma.clientOrg.create({ data: { tenantId, name: `pa B ${uid()}`, slug: `pab-${uid()}` } })).id;
  const orgTB = (await prisma.clientOrg.create({ data: { tenantId: TB, name: `pa TB ${uid()}`, slug: `patb-${uid()}` } })).id;
  // projActive is the newest CURRENT project (so the newest-pick lands here once projArchived is archived).
  projArchived = (await prisma.project.create({ data: { tenantId, clientOrgId: orgA, name: 'Archived one', status: 'COMPLETE' } })).id;
  projAudit = (await prisma.project.create({ data: { tenantId, clientOrgId: orgA, name: 'Audit proj', status: 'IN_PROGRESS' } })).id;
  projActive = (await prisma.project.create({ data: { tenantId, clientOrgId: orgA, name: 'Active one', status: 'IN_PROGRESS' } })).id;
  projB = (await prisma.project.create({ data: { tenantId, clientOrgId: orgB, name: 'B' } })).id;
  projTB = (await prisma.project.create({ data: { tenantId: TB, clientOrgId: orgTB, name: 'TB' } })).id;
  ownerA = await mkClient(orgA, 'OWNER'); memberA = await mkClient(orgA, 'MEMBER'); deactivatedA = await mkClient(orgA, 'OWNER', false);
  ownerB = await mkClient(orgB, 'OWNER');
  adminAuth = await mkStaff('ADMIN'); viewerAuth = await mkStaff('VIEWER'); engineerAuth = await mkStaff('ENGINEER'); adminAuthTB = await mkStaff('ADMIN', TB);

  // Historical records on the to-be-archived project (all must survive archive):
  invArchived = (await prisma.invoice.create({ data: { tenantId, projectId: projArchived, number: `INV-${uid()}`, kind: 'STANDARD', status: 'SENT', amountCents: 50000, currency: 'USD', issuedAt: new Date() } })).id;
  const file = await prisma.projectFile.create({ data: { tenantId, projectId: projArchived, name: `f-${uid()}.pdf`, mimeType: 'application/pdf', sizeBytes: 3, storageProvider: 'local', version: 1, isCurrent: true, state: 'AVAILABLE', clientVisible: true } });
  const fkey = `pa-file-${file.id}`;
  await storage().put(fkey, Buffer.from('pdf'), 'application/pdf');
  await prisma.projectFile.update({ where: { id: file.id }, data: { storageKey: fkey } });
  fileArchived = file.id;
  await prisma.portalActivity.create({ data: { tenantId, clientOrgId: orgA, projectId: projArchived, type: MOMENT.PROJECT_LAUNCHED, message: 'Project launched', actorType: 'ADMIN', actorName: 'Staff' } });
  const ticket = await prisma.ticket.create({ data: { tenantId, clientOrgId: orgA, projectId: projArchived, number: `TKT-${uid()}`, subject: `s-${uid()}`, category: 'PROJECT', status: 'OPEN', createdByClientUserId: ownerA.id, lastMessageAt: new Date() } });
  ticketArchived = ticket.id;
  const tmsg = await prisma.ticketMessage.create({ data: { tenantId, ticketId: ticket.id, authorType: 'TEAM', internal: false, body: 'hi' } });
  const att = await prisma.ticketAttachment.create({ data: { tenantId, clientOrgId: orgA, ticketId: ticket.id, messageId: tmsg.id, filename: `a-${uid()}.pdf`, mimeType: 'application/pdf', sizeBytes: 3, state: 'AVAILABLE', storageProvider: 'local', fileHash: 'x' } });
  const akey = attachmentKey({ tenantId, clientOrgId: orgA, ticketId: ticket.id, attachmentId: att.id, filename: 'a.pdf' });
  await storage().put(akey, Buffer.from('pdf'), 'application/pdf');
  await prisma.ticketAttachment.update({ where: { id: att.id }, data: { storageKey: akey } });
  ticketAttArchived = att.id;
});
after(async () => { __setStorageForTest(null); await app.close(); await prisma.$disconnect(); });

const listIds = (b: { projects?: { id: string }[] }) => (b.projects ?? []).map((p) => p.id);

// ── Archive: status is never touched; CAS is safe ──
test('archive stamps archivedAt and does NOT alter Project.status; a repeat archive is a safe 409', async () => {
  const before = await projRow(projArchived);
  assert.equal(before.status, 'COMPLETE'); assert.equal(before.archivedAt, null);
  const r1 = await sPost(`/v1/admin/projects/${projArchived}/archive`, adminAuth);
  assert.equal(r1.statusCode, 200, 'ADMIN archives');
  const after = await projRow(projArchived);
  assert.notEqual(after.archivedAt, null, 'archivedAt set');
  assert.equal(after.status, 'COMPLETE', 'STATUS UNCHANGED by archive');
  // CAS: a stale/concurrent second archive matches zero rows → 409, archivedAt unchanged, no dup.
  const r2 = await sPost(`/v1/admin/projects/${projArchived}/archive`, adminAuth);
  assert.equal(r2.statusCode, 409, 'second archive is a safe conflict');
  const again = await projRow(projArchived);
  assert.equal(again.archivedAt?.getTime(), after.archivedAt?.getTime(), 'archivedAt not overwritten by the stale write');
  const audits = await prisma.auditEvent.count({ where: { entityType: 'Project', entityId: projArchived, action: 'PROJECT_ARCHIVED' } });
  assert.equal(audits, 1, 'exactly one PROJECT_ARCHIVED audit (the 409 wrote none)');
});

// ── Current-work surfaces exclude the archived project ──
test('current-work surfaces EXCLUDE the archived project; past scope + count INCLUDE it', async () => {
  const rel = await jget('/portal/relationship-overview', ownerA);
  assert.ok(!listIds(rel.b).includes(projArchived), 'Home cards exclude archived');
  assert.ok(listIds(rel.b).includes(projActive), 'Home cards keep current');
  assert.ok(rel.b.pastProjectCount >= 1, 'pastProjectCount counts archived');
  const cur = await jget('/portal/projects?scope=current', ownerA);
  assert.ok(!listIds(cur.b).includes(projArchived) && listIds(cur.b).includes(projActive), 'scope=current excludes archived');
  const past = await jget('/portal/projects?scope=past', ownerA);
  assert.ok(listIds(past.b).includes(projArchived) && !listIds(past.b).includes(projActive), 'scope=past = archived only');
  const all = await jget('/portal/projects', ownerA); // default = all (backward-compatible)
  assert.ok(listIds(all.b).includes(projArchived) && listIds(all.b).includes(projActive), 'default scope=all includes both');
});

test('default/new messaging can NEVER select an archived project (newest-pick excludes archived)', async () => {
  // Archiving bumped projArchived.updatedAt → it is now the newest row, but the newest-pick skips archived.
  const body = `slice7-${uid()}`;
  const r = await app.inject({ method: 'POST', url: '/v1/portal/messages', headers: { ...cAuth(ownerA), 'content-type': 'application/json' }, payload: JSON.stringify({ body }) });
  assert.equal(r.statusCode, 200, 'message posts to a current project');
  const msg = await prisma.portalMessage.findFirstOrThrow({ where: { body } });
  assert.notEqual(msg.projectId, projArchived, 'message never routed to the archived project');
  const target = await projRow(msg.projectId);
  assert.equal(target.archivedAt, null, 'message target is a CURRENT project');
  // overview/project newest-pick likewise never surface the archived project as "the" project.
  const ov = await jget('/portal/overview', ownerA);
  assert.notEqual(ov.b.project?.id, projArchived);
  const pj = await jget('/portal/project', ownerA);
  assert.notEqual(pj.b.project?.id, projArchived);
});

// ── Archived project stays fully readable (archive is not an auth filter) ──
test('archived project direct detail still returns 200 with its history', async () => {
  const d = await jget(`/portal/projects/${projArchived}`, ownerA);
  assert.equal(d.s, 200, 'archived detail readable');
  assert.equal(d.b.project.id, projArchived);
  assert.ok((d.b.project.activities ?? []).some((a: { type: string }) => a.type === MOMENT.PROJECT_LAUNCHED), 'curated activity still readable on detail');
});

test('cross-org access to the archived project is still 404 (scope, not archive, decides)', async () => {
  assert.equal((await GET(`/portal/projects/${projArchived}`, ownerB)).statusCode, 404, 'other org → 404');
});

test('deactivated client is still 401 on the archived project', async () => {
  assert.equal((await GET(`/portal/projects/${projArchived}`, deactivatedA)).statusCode, 401);
});

test('archived project invoices REMAIN in Slice-6 billing + aggregates', async () => {
  const r = await jget('/portal/billing', ownerA);
  assert.equal(r.s, 200);
  assert.ok((r.b.invoices as { id: string }[]).some((i) => i.id === invArchived), 'archived-project invoice still listed');
  assert.equal(r.b.aggregates.byCurrency.USD.outstandingCents, 50000, 'its SENT amount still counts toward outstanding');
});

test('archived-project files remain downloadable', async () => {
  assert.equal((await GET(`/portal/files/${fileArchived}/download`, ownerA)).statusCode, 200);
});

test('relationship activity feed still includes the archived project moment', async () => {
  const r = await jget('/portal/relationship-activity', ownerA);
  assert.ok((r.b.activities as { projectId: string | null }[]).some((a) => a.projectId === projArchived), 'archived project moment still in the org-wide feed');
});

test('existing ticket link + attachment survive archive and stay readable', async () => {
  const list = await jget('/portal/tickets', ownerA);
  assert.ok((list.b.tickets as { id: string; projectId: string | null }[]).some((t) => t.id === ticketArchived && t.projectId === projArchived), 'ticket still linked to the (now archived) project');
  const detail = await jget(`/portal/tickets/${ticketArchived}`, ownerA);
  assert.equal(detail.s, 200);
  assert.equal(detail.b.ticket.projectId, projArchived, 'link intact');
  assert.equal((await GET(`/portal/tickets/${ticketArchived}/attachments/${ticketAttArchived}/download`, ownerA)).statusCode, 200, 'attachment still downloadable');
});

test('MEMBER billing is still 403 (client security unchanged by archive)', async () => {
  assert.equal((await GET('/portal/billing', memberA)).statusCode, 403);
});

// ── Staff RBAC + isolation on the archive write ──
test('archive/unarchive RBAC: VIEWER & ENGINEER 403; no staff token 401; cross-tenant/nonexistent 404', async () => {
  assert.equal((await sPost(`/v1/admin/projects/${projActive}/archive`, viewerAuth)).statusCode, 403, 'VIEWER lacks project:write');
  assert.equal((await sPost(`/v1/admin/projects/${projActive}/archive`, engineerAuth)).statusCode, 403, 'ENGINEER lacks project:write');
  assert.equal((await app.inject({ method: 'POST', url: `/v1/admin/projects/${projActive}/archive` })).statusCode, 401, 'no staff token → 401');
  // A client token is NOT a staff token → 401 (never reaches the write).
  assert.equal((await app.inject({ method: 'POST', url: `/v1/admin/projects/${projActive}/archive`, headers: cAuth(ownerA) })).statusCode, 401, 'client token → 401 on admin route');
  // Cross-tenant project (TB) is invisible to the default-tenant admin → 404 (never archived).
  assert.equal((await sPost(`/v1/admin/projects/${projTB}/archive`, adminAuth)).statusCode, 404, 'cross-tenant project → 404');
  assert.equal((await sPost(`/v1/admin/projects/nonexistent-${uid()}/archive`, adminAuth)).statusCode, 404, 'nonexistent → 404');
  assert.equal((await projRow(projActive)).archivedAt, null, 'no failed attempt archived projActive');
});

// ── Archive/unarchive side effects: AuditEvent ONLY ──
test('archive + unarchive emit an AuditEvent ONLY — zero PortalActivity / notification / email / job', async () => {
  const [pa0, no0, se0, eo0] = await Promise.all([prisma.portalActivity.count(), prisma.notification.count(), prisma.sideEffectJob.count(), prisma.emailOutbox.count()]);
  const a = await sPost(`/v1/admin/projects/${projAudit}/archive`, adminAuth); assert.equal(a.statusCode, 200);
  const u = await sPost(`/v1/admin/projects/${projAudit}/unarchive`, adminAuth); assert.equal(u.statusCode, 200);
  const [pa1, no1, se1, eo1] = await Promise.all([prisma.portalActivity.count(), prisma.notification.count(), prisma.sideEffectJob.count(), prisma.emailOutbox.count()]);
  assert.equal(pa1 - pa0, 0, 'zero PortalActivity');
  assert.equal(no1 - no0, 0, 'zero notifications');
  assert.equal(se1 - se0, 0, 'zero side-effect jobs (no email)');
  assert.equal(eo1 - eo0, 0, 'zero email outbox rows');
  const audits = await prisma.auditEvent.count({ where: { entityType: 'Project', entityId: projAudit, action: { in: ['PROJECT_ARCHIVED', 'PROJECT_UNARCHIVED'] } } });
  assert.equal(audits, 2, 'exactly one PROJECT_ARCHIVED + one PROJECT_UNARCHIVED audit');
});

// ── Unarchive restores visibility WITHOUT reconstructing status; CAS safe ──
test('unarchive clears archivedAt, PRESERVES status, restores current-work visibility; repeat is a safe 409', async () => {
  const before = await projRow(projArchived);
  assert.notEqual(before.archivedAt, null); assert.equal(before.status, 'COMPLETE');
  const r1 = await sPost(`/v1/admin/projects/${projArchived}/unarchive`, adminAuth);
  assert.equal(r1.statusCode, 200, 'ADMIN unarchives');
  const after = await projRow(projArchived);
  assert.equal(after.archivedAt, null, 'archivedAt cleared');
  assert.equal(after.status, 'COMPLETE', 'STATUS PRESERVED — never reconstructed on unarchive');
  // Visibility restored purely by clearing archivedAt (no status was needed to bring it back).
  const cur = await jget('/portal/projects?scope=current', ownerA);
  assert.ok(listIds(cur.b).includes(projArchived), 'back in current scope');
  const rel = await jget('/portal/relationship-overview', ownerA);
  assert.ok(listIds(rel.b).includes(projArchived), 'back on Home cards');
  // CAS: a repeat unarchive (already current) → safe 409.
  assert.equal((await sPost(`/v1/admin/projects/${projArchived}/unarchive`, adminAuth)).statusCode, 409, 'second unarchive is a safe conflict');
});
