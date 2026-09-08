/**
 * Slice 2 — PortalActivity relationship ownership + snapshot actors.
 *
 * Proves the ownership model end to end:
 *   • every activity carries a clientOrgId; the four migration invariants hold for freshly-written rows
 *     across the WHOLE table (no writer can produce a tenant/org-inconsistent row);
 *   • deterministic idempotent moments emit exactly ONE row under concurrency (PROJECT_LAUNCHED,
 *     NEW_PROJECT_STARTED, and the relationship writer generally);
 *   • client MESSAGE activities are attributed to the true author (CLIENT actor snapshot), carry NO
 *     viewer-relative "You sent…" copy, and are correct for two different teammates;
 *   • the actor snapshot survives the author's rename AND deletion (soft ref, no FK);
 *   • NEW_PROJECT_STARTED is relationship-level (projectId=null, org-owned) with an ADMIN actor;
 *   • the relationship feed is curated + org-wide (relationship + project moments); the project feed is
 *     that project's curated rows only (no relationship rows, no other project's); raw events never leak;
 *   • cross-org isolation on both feeds; deactivated client → 401 (Slice 0 invariant holds).
 *
 * Run: NODE_ENV=test npx tsx --test test/integration/portal-activity-ownership.test.ts
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
import { createEngagementProject } from '../../src/admin/conversion';
import { writeRelationshipActivity, writeProjectActivity, clientActor, systemActor } from '../../src/lib/portal-activity';
import { emitRetainerActivated } from '../../src/lib/care-plan';
import { MOMENT, CURATED_MOMENT_TYPES } from '../../src/lib/relationship-moments';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let staffAuthz: string;
let staffId: string;

const mkOrg = () => prisma.clientOrg.create({ data: { tenantId, name: `AO ${uid()}`, slug: `ao-${uid()}` } });
const mkUser = (clientOrgId: string, role: 'OWNER' | 'MEMBER', firstName: string, lastName: string) => {
  const e = `${firstName.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId, clientOrgId, email: e, normalizedEmail: e, passwordHash: 'x', role, firstName, lastName } });
};
const mkProject = (clientOrgId: string, status = 'IN_PROGRESS') => prisma.project.create({ data: { tenantId, clientOrgId, name: `P-${uid()}`, status: status as never } });

const sess = (u: { id: string; clientOrgId: string; email: string }) => signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email });
const cAuth = (u: { id: string; clientOrgId: string; email: string }) => ({ authorization: `Bearer ${sess(u)}`, 'content-type': 'application/json' });
const get = (url: string, u: { id: string; clientOrgId: string; email: string }) => app.inject({ method: 'GET', url, headers: cAuth(u) });
const sendMessage = (u: { id: string; clientOrgId: string; email: string }, body: string) =>
  app.inject({ method: 'POST', url: '/v1/portal/messages', headers: cAuth(u), payload: JSON.stringify({ body }) });
const patchProject = (id: string, status: string) =>
  app.inject({ method: 'PATCH', url: `/v1/admin/projects/${id}`, headers: { authorization: staffAuthz, 'content-type': 'application/json' }, payload: JSON.stringify({ status }) });

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  const semail = `staff-${uid()}@example.com`;
  const staff = await prisma.staffUser.create({ data: { tenantId, email: semail, normalizedEmail: semail, passwordHash: 'x', role: 'ADMIN', active: true, firstName: 'Sam', lastName: 'Staff' } });
  staffId = staff.id;
  staffAuthz = `Bearer ${signStaff({ sub: staff.id, role: 'ADMIN', tenant: tenantId, email: semail })}`;
});
after(async () => { await app.close(); await prisma.$disconnect(); });

// ── Ownership invariants ───────────────────────────────────────────────────────
test('1. GLOBAL invariant: every portal_activity across the whole table satisfies the 4 migration invariants', async () => {
  // Same predicates the migration asserts, evaluated at runtime over everything every writer produced.
  const [nullOrg] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM portal_activities WHERE "clientOrgId" IS NULL`);
  const [tenantVsOrg] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM portal_activities a JOIN client_orgs o ON a."clientOrgId"=o.id WHERE o."tenantId" <> a."tenantId"`);
  const [tenantVsProj] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM portal_activities a JOIN projects p ON a."projectId"=p.id WHERE p."tenantId" <> a."tenantId"`);
  const [orgVsProj] = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM portal_activities a JOIN projects p ON a."projectId"=p.id WHERE p."clientOrgId" <> a."clientOrgId"`);
  assert.equal(Number(nullOrg.n), 0, 'no activity has a null clientOrgId');
  assert.equal(Number(tenantVsOrg.n), 0, 'activity.tenantId always equals its org.tenantId');
  assert.equal(Number(tenantVsProj.n), 0, 'activity.tenantId always equals its project.tenantId');
  assert.equal(Number(orgVsProj.n), 0, 'activity.clientOrgId always equals its project.clientOrgId');
});

// ── Deterministic idempotent moments — exactly one under concurrency ────────────
test('2. PROJECT_LAUNCHED: two CONCURRENT status→LAUNCHED PATCHes create exactly one moment (deterministic PK)', async () => {
  const o = await mkOrg(); const p = await mkProject(o.id, 'IN_PROGRESS');
  const [r1, r2] = await Promise.all([patchProject(p.id, 'LAUNCHED'), patchProject(p.id, 'LAUNCHED')]);
  assert.ok([200].includes(r1.statusCode) && [200].includes(r2.statusCode));
  const rows = await prisma.portalActivity.findMany({ where: { type: MOMENT.PROJECT_LAUNCHED, projectId: p.id } });
  assert.equal(rows.length, 1, 'exactly one PROJECT_LAUNCHED despite concurrency');
  assert.equal(rows[0].projectId, p.id, 'PROJECT_LAUNCHED stays project-scoped');
  assert.equal(rows[0].clientOrgId, o.id);
  assert.equal(rows[0].actorType, 'ADMIN');
  assert.equal(rows[0].id, `project-launched:${p.id}`);
});

test('3. PROJECT_LAUNCHED: a LAUNCHED→ON_HOLD→LAUNCHED round-trip does NOT add a second moment', async () => {
  const o = await mkOrg(); const p = await mkProject(o.id, 'IN_PROGRESS');
  assert.equal((await patchProject(p.id, 'LAUNCHED')).statusCode, 200);
  assert.equal((await patchProject(p.id, 'ON_HOLD')).statusCode, 200);
  assert.equal((await patchProject(p.id, 'LAUNCHED')).statusCode, 200);
  assert.equal(await prisma.portalActivity.count({ where: { type: MOMENT.PROJECT_LAUNCHED, projectId: p.id } }), 1);
});

test('4. NEW_PROJECT_STARTED: createEngagementProject emits exactly one relationship-level moment (projectId=null, org-owned, ADMIN actor)', async () => {
  const o = await mkOrg();
  const proj = await prisma.$transaction((tx) => createEngagementProject(tx, { tenantId, clientOrgId: o.id, leadId: null, staffId, staffName: 'Sam Staff', name: 'Second Engagement' }));
  const rows = await prisma.portalActivity.findMany({ where: { type: MOMENT.NEW_PROJECT_STARTED, clientOrgId: o.id } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].projectId, null, 'NEW_PROJECT_STARTED is relationship-level');
  assert.equal(rows[0].clientOrgId, o.id);
  assert.equal(rows[0].actorType, 'ADMIN');
  assert.equal(rows[0].id, `new-project-started:${proj.id}`);
  // The additional project also gets its own project-scoped "Project created" row.
  assert.equal(await prisma.portalActivity.count({ where: { type: 'PROJECT', projectId: proj.id } }), 1);
});

test('5. relationship writer is idempotent under concurrency (two same-id writes → one row)', async () => {
  const o = await mkOrg();
  const id = `new-project-started:${uid()}`;
  const w = () => writeRelationshipActivity(prisma, { tenantId, clientOrgId: o.id }, { id, type: MOMENT.NEW_PROJECT_STARTED, message: 'New project started', actor: systemActor() });
  await Promise.all([w(), w()]);
  assert.equal(await prisma.portalActivity.count({ where: { id } }), 1);
});

// ── Actor attribution on client messages ────────────────────────────────────────
test('6. client MESSAGE: two different teammates each get the correct actor snapshot; NO "You sent…" copy', async () => {
  const o = await mkOrg(); await mkProject(o.id);
  const alice = await mkUser(o.id, 'OWNER', 'Alice', 'Anderson');
  const bob = await mkUser(o.id, 'MEMBER', 'Bob', 'Brown');
  assert.equal((await sendMessage(alice, 'hi from alice')).statusCode, 200);
  assert.equal((await sendMessage(bob, 'hi from bob')).statusCode, 200);

  const acts = await prisma.portalActivity.findMany({ where: { type: 'MESSAGE', clientOrgId: o.id }, orderBy: { createdAt: 'asc' } });
  assert.equal(acts.length, 2);
  const names = acts.map((a) => a.actorName).sort();
  assert.deepEqual(names, ['Alice Anderson', 'Bob Brown'], 'each message is attributed to its true author');
  for (const a of acts) {
    assert.equal(a.actorType, 'CLIENT');
    assert.doesNotMatch(a.message, /\byou\b/i, 'persisted copy must not contain viewer-relative "you"');
  }
  // actorId is the soft ref to the authoring user (never dereferenced for display).
  const aliceRow = acts.find((a) => a.actorName === 'Alice Anderson');
  assert.equal(aliceRow?.actorId, alice.id);
});

// ── Actor snapshot survives rename + deletion (soft ref, no FK) ─────────────────
test('7. actor snapshot survives the author being RENAMED and then DELETED', async () => {
  const o = await mkOrg(); const p = await mkProject(o.id);
  const user = await mkUser(o.id, 'OWNER', 'Original', 'Name');
  // Use the writer directly with the snapshot captured now.
  await writeProjectActivity(prisma, { id: p.id, tenantId, clientOrgId: o.id }, { type: 'MESSAGE', message: 'Message sent to the delivery team', actor: clientActor(user.id, 'Original Name') });
  const before = await prisma.portalActivity.findFirst({ where: { type: 'MESSAGE', clientOrgId: o.id } });
  assert.equal(before?.actorName, 'Original Name');

  // Rename the user → the historical snapshot must NOT change.
  await prisma.clientUser.update({ where: { id: user.id }, data: { firstName: 'Renamed', lastName: 'Person' } });
  const afterRename = await prisma.portalActivity.findFirst({ where: { id: before!.id } });
  assert.equal(afterRename?.actorName, 'Original Name', 'rename does not rewrite historical attribution');

  // Delete the user → no FK from activity → the row survives, still readable with its snapshot.
  await prisma.clientUser.delete({ where: { id: user.id } });
  const afterDelete = await prisma.portalActivity.findFirst({ where: { id: before!.id } });
  assert.ok(afterDelete, 'activity row survives author deletion');
  assert.equal(afterDelete?.actorName, 'Original Name');
  assert.equal(afterDelete?.actorType, 'CLIENT');
  assert.equal(afterDelete?.actorId, user.id, 'soft actorId is retained (dangling is fine — never dereferenced)');
});

// ── Feed filtering: relationship (org-wide curated) vs project (this project curated only) ──
test('8. relationship feed = org-wide CURATED (relationship + project moments); raw events never leak', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Olga', 'Owner');
  const p = await mkProject(o.id, 'IN_PROGRESS');
  await patchProject(p.id, 'LAUNCHED'); // curated project moment (projectId set)
  const cp = await prisma.carePlan.create({ data: { tenantId, clientOrgId: o.id, name: `C ${uid()}`, monthlyAmountCents: 250000, currency: 'USD', status: 'ACTIVE' as never } });
  await emitRetainerActivated(prisma, { id: cp.id, tenantId, clientOrgId: o.id }); // relationship moment (projectId=null)
  await sendMessage(owner, 'a raw message'); // raw MESSAGE (not curated)

  const feed = (await get('/v1/portal/relationship-activity', owner)).json().activities as Array<{ type: string; projectId: string | null }>;
  const types = feed.map((a) => a.type);
  assert.ok(types.includes(MOMENT.PROJECT_LAUNCHED), 'curated project moment appears');
  assert.ok(types.includes(MOMENT.RETAINER_ACTIVATED), 'relationship-level moment appears');
  assert.ok(feed.some((a) => a.type === MOMENT.RETAINER_ACTIVATED && a.projectId === null), 'relationship moment served with projectId=null');
  assert.ok(!types.includes('MESSAGE'), 'raw MESSAGE never leaks onto the curated relationship feed');
  for (const a of feed) assert.ok(CURATED_MOMENT_TYPES.includes(a.type), `feed contains only curated types (saw ${a.type})`);
});

test('9. project feed = ONLY that project’s curated rows (no relationship rows, no other project’s rows, no raw)', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Pat', 'Project');
  const p1 = await mkProject(o.id, 'IN_PROGRESS');
  const p2 = await mkProject(o.id, 'IN_PROGRESS');
  await patchProject(p1.id, 'LAUNCHED'); // p1 curated
  await patchProject(p2.id, 'LAUNCHED'); // p2 curated (must not appear under p1)
  const cp = await prisma.carePlan.create({ data: { tenantId, clientOrgId: o.id, name: `C ${uid()}`, monthlyAmountCents: 250000, currency: 'USD', status: 'ACTIVE' as never } });
  await emitRetainerActivated(prisma, { id: cp.id, tenantId, clientOrgId: o.id }); // relationship (projectId=null)
  await sendMessage(owner, 'raw on newest project'); // raw MESSAGE

  const detail = (await get(`/v1/portal/projects/${p1.id}`, owner)).json();
  const acts = detail.project.activities as Array<{ type: string }>;
  assert.ok(acts.some((a) => a.type === MOMENT.PROJECT_LAUNCHED), 'p1 curated moment present');
  for (const a of acts) assert.ok(CURATED_MOMENT_TYPES.includes(a.type), `only curated types on project feed (saw ${a.type})`);
  assert.ok(!acts.some((a) => a.type === MOMENT.RETAINER_ACTIVATED), 'relationship-level moment never appears on a project feed');
  // Every row belongs to p1 (verified at the DB level — the relation is keyed on projectId).
  const p1Only = await prisma.portalActivity.count({ where: { projectId: p1.id, type: { in: CURATED_MOMENT_TYPES } } });
  assert.equal(acts.length, p1Only);
});

// ── Cross-org isolation + Slice 0 deactivation invariant ────────────────────────
test('10. cross-org isolation: another org sees NONE of the first org’s relationship activity', async () => {
  const oA = await mkOrg(); const ownerA = await mkUser(oA.id, 'OWNER', 'Ana', 'A'); const pA = await mkProject(oA.id);
  await patchProject(pA.id, 'LAUNCHED');
  const oB = await mkOrg(); const ownerB = await mkUser(oB.id, 'OWNER', 'Ben', 'B');
  const feedB = (await get('/v1/portal/relationship-activity', ownerB)).json().activities as Array<{ id: string }>;
  const aIds = new Set((await prisma.portalActivity.findMany({ where: { clientOrgId: oA.id }, select: { id: true } })).map((r) => r.id));
  assert.ok(!feedB.some((a) => aIds.has(a.id)), 'org B never receives org A’s activity rows');
});

test('11. deactivated client → 401 on /portal/relationship-activity (Slice 0 invariant holds)', async () => {
  const o = await mkOrg(); const gone = await mkUser(o.id, 'MEMBER', 'Gone', 'User');
  assert.equal((await get('/v1/portal/relationship-activity', gone)).statusCode, 200);
  await prisma.clientUser.update({ where: { id: gone.id }, data: { active: false } });
  assert.equal((await get('/v1/portal/relationship-activity', gone)).statusCode, 401);
});
