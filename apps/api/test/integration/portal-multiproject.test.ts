/**
 * Slice 1 — multi-project Relationship Home foundation.
 *
 * Proves the additive relationship endpoints without touching /portal/overview or /portal/project:
 *   • /portal/relationship-overview returns compact cards (no activities/team/reports/files) + ONE
 *     money-free Care Plan band + canBilling; deterministic active→planning→done ordering; completed
 *     projects stay visible; OWNER sees a PROJECT-LINKED payable invoice on the right card only;
 *     relationship-level (projectId=null) invoices appear on NO card; MEMBER gets payableInvoice:null
 *     on every card and zero financial data.
 *   • query count is CONSTANT in the number of projects (no N+1).
 *   • /portal/projects is a lean, financial-data-free list; /portal/projects/:id is scoped (foreign→404,
 *     no newest-project fallback); deactivated user → 401 (Slice 0 still holds).
 *   • /portal/me.canBilling is OWNER=true / MEMBER=false.
 *   • legacy /portal/overview → { ok, project } and /portal/project → { ok, project, billing } unchanged.
 *
 * Run: NODE_ENV=test npx tsx --test test/integration/portal-multiproject.test.ts
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signSession } from '../../src/portal/auth';

const uid = () => randomUUID().slice(0, 8);
const FAR_FUTURE = new Date('2099-01-15T12:00:00.000Z');
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;

const mkOrg = () => prisma.clientOrg.create({ data: { tenantId, name: `Org ${uid()}`, slug: `org-${uid()}` } });
const mkUser = (clientOrgId: string, role: 'OWNER' | 'MEMBER') => {
  const e = `${role.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId, clientOrgId, email: e, normalizedEmail: e, passwordHash: 'x', role } });
};
const mkProject = (clientOrgId: string, status: string) => prisma.project.create({ data: { tenantId, clientOrgId, name: `P-${status}-${uid()}`, status: status as never } });
const mkInvoice = (clientOrgId: string, projectId: string | null, status = 'SENT') =>
  prisma.invoice.create({ data: { tenantId, clientOrgId, projectId, kind: (projectId ? 'STANDARD' : 'RETAINER') as never, number: `INV-${uid()}`, amountCents: 100000, status: status as never } });
const mkCarePlan = (clientOrgId: string) =>
  prisma.carePlan.create({ data: { tenantId, clientOrgId, name: `Care ${uid()}`, monthlyAmountCents: 250000, currency: 'USD', status: 'ACTIVE' as never, nextInvoiceAt: FAR_FUTURE, nextReportAt: FAR_FUTURE } });

const sess = (u: { id: string; clientOrgId: string; email: string }) => signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email });
const get = (url: string, token: string) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

// Query-count spy: wraps the batched DB methods the endpoint uses. Proves no per-project loop.
function querySpy() {
  let n = 0;
  const patched: Array<() => void> = [];
  const targets: Array<[Record<string, unknown>, string]> = [
    [prisma.project as never, 'findMany'], [prisma.approval as never, 'findMany'], [prisma.invoice as never, 'findMany'],
    [prisma.carePlan as never, 'findFirst'], [prisma.clientUser as never, 'findFirst'],
  ];
  for (const [obj, m] of targets) {
    const orig = (obj[m] as (...a: unknown[]) => unknown).bind(obj);
    obj[m] = (...a: unknown[]) => { n += 1; return orig(...a); };
    patched.push(() => { obj[m] = orig; });
  }
  return { count: () => n, restore: () => patched.forEach((f) => f()) };
}

// Fixtures
let orgMain: { id: string }, ownerMain: { id: string; clientOrgId: string; email: string }, memberMain: { id: string; clientOrgId: string; email: string };
let projActive: { id: string }, projPlanning: { id: string }, projDone: { id: string };
let org1: { id: string }, owner1: { id: string; clientOrgId: string; email: string };
let orgN: { id: string }, ownerN: { id: string; clientOrgId: string; email: string };
let org0: { id: string }, owner0: { id: string; clientOrgId: string; email: string };
let orgB: { id: string }, ownerB: { id: string; clientOrgId: string; email: string }, projB: { id: string };

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;

  orgMain = await mkOrg();
  ownerMain = await mkUser(orgMain.id, 'OWNER');
  memberMain = await mkUser(orgMain.id, 'MEMBER');
  projActive = await mkProject(orgMain.id, 'IN_PROGRESS');
  projPlanning = await mkProject(orgMain.id, 'DISCOVERY');
  projDone = await mkProject(orgMain.id, 'COMPLETE');
  await mkInvoice(orgMain.id, projActive.id, 'SENT'); // project-linked payable (owner)
  await mkInvoice(orgMain.id, null, 'SENT'); // relationship-level RETAINER (projectId=null) — must be on NO card
  await mkCarePlan(orgMain.id); // one relationship-level Care Plan band

  org1 = await mkOrg(); owner1 = await mkUser(org1.id, 'OWNER'); await mkProject(org1.id, 'IN_PROGRESS');
  orgN = await mkOrg(); ownerN = await mkUser(orgN.id, 'OWNER');
  for (const s of ['IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS', 'LAUNCHED', 'ON_HOLD', 'DISCOVERY', 'DISCOVERY', 'COMPLETE']) await mkProject(orgN.id, s);
  org0 = await mkOrg(); owner0 = await mkUser(org0.id, 'OWNER');
  orgB = await mkOrg(); ownerB = await mkUser(orgB.id, 'OWNER'); projB = await mkProject(orgB.id, 'IN_PROGRESS');
});
after(async () => { await app.close(); await prisma.$disconnect(); });

test('1. /portal/me.canBilling — OWNER true / MEMBER false', async () => {
  assert.equal((await get('/v1/portal/me', sess(ownerMain))).json().canBilling, true);
  assert.equal((await get('/v1/portal/me', sess(memberMain))).json().canBilling, false);
});

test('2. relationship-overview: 0-project Home works', async () => {
  const b = (await get('/v1/portal/relationship-overview', sess(owner0))).json();
  assert.equal(b.ok, true);
  assert.deepEqual(b.projects, []);
  assert.equal(b.canBilling, true);
});

test('3. relationship-overview: 1-project Home works', async () => {
  const b = (await get('/v1/portal/relationship-overview', sess(owner1))).json();
  assert.equal(b.projects.length, 1);
});

test('4. relationship-overview: N-project Home + deterministic active→planning→done ordering; completed stays visible', async () => {
  const b = (await get('/v1/portal/relationship-overview', sess(ownerN))).json();
  assert.equal(b.projects.length, 8);
  const rank: Record<string, number> = { IN_PROGRESS: 0, UAT: 0, LAUNCHED: 0, ON_HOLD: 0, DISCOVERY: 1, COMPLETE: 2 };
  const ranks = b.projects.map((p: { status: string }) => rank[p.status]);
  for (let i = 1; i < ranks.length; i++) assert.ok(ranks[i - 1] <= ranks[i], `ordering must be non-decreasing by group, got ${ranks}`);
  assert.ok(b.projects.some((p: { status: string }) => p.status === 'COMPLETE'), 'completed project remains visible');
});

test('5. compact card shape — no heavy collections; carePlan is one relationship band, not per-card', async () => {
  const b = (await get('/v1/portal/relationship-overview', sess(ownerMain))).json();
  assert.ok(b.carePlan && b.carePlan.active === true, 'Care Plan appears once at the top');
  for (const c of b.projects) {
    for (const heavy of ['activities', 'team', 'reports', 'files']) assert.equal(c[heavy], undefined, `card must not carry ${heavy}`);
    assert.equal(c.carePlan, undefined, 'card must not carry carePlan');
    assert.ok('milestonesDone' in c && 'milestonesTotal' in c && 'payableInvoice' in c);
  }
});

test('6. OWNER sees a PROJECT-LINKED payable invoice on the correct card only; relationship-level invoice on NO card', async () => {
  const b = (await get('/v1/portal/relationship-overview', sess(ownerMain))).json();
  const active = b.projects.find((p: { id: string }) => p.id === projActive.id);
  const planning = b.projects.find((p: { id: string }) => p.id === projPlanning.id);
  assert.ok(active.payableInvoice, 'the project with a SENT project-linked invoice shows payableInvoice');
  assert.equal(planning.payableInvoice, null, 'a project with no linked invoice shows null');
  // the projectId=null RETAINER invoice must not appear on any card
  const numbers = b.projects.map((p: { payableInvoice: { number?: string } | null }) => p.payableInvoice?.number).filter(Boolean);
  const retainers = await prisma.invoice.findMany({ where: { clientOrgId: orgMain.id, projectId: null }, select: { number: true } });
  for (const r of retainers) assert.ok(!numbers.includes(r.number), 'relationship-level invoice leaked onto a card');
});

test('7. MEMBER gets payableInvoice:null on every card (zero financial data) — stable shape', async () => {
  const b = (await get('/v1/portal/relationship-overview', sess(memberMain))).json();
  assert.equal(b.canBilling, false);
  for (const c of b.projects) assert.strictEqual(c.payableInvoice, null, 'member card payableInvoice must be exactly null');
  assert.ok(b.carePlan, 'member still gets the money-free Care Plan band');
});

test('8. query count is CONSTANT in project count (no N+1): 1-project vs 8-project request', async () => {
  const s1 = querySpy();
  await get('/v1/portal/relationship-overview', sess(owner1));
  const c1 = s1.count(); s1.restore();
  const s8 = querySpy();
  await get('/v1/portal/relationship-overview', sess(ownerN));
  const c8 = s8.count(); s8.restore();
  assert.equal(c8, c1, `query count must not scale with N (1-project=${c1}, 8-project=${c8})`);
});

test('9. /portal/projects is a lean, financial-data-free list', async () => {
  const b = (await get('/v1/portal/projects', sess(ownerN))).json();
  assert.equal(b.projects.length, 8);
  for (const p of b.projects) {
    assert.deepEqual(Object.keys(p).sort(), ['id', 'name', 'status']);
    assert.equal(p.payableInvoice, undefined);
  }
});

test('10. /portal/projects/:id loads the EXPLICIT project; foreign/missing → 404 (no newest fallback)', async () => {
  const own = (await get(`/v1/portal/projects/${projActive.id}`, sess(ownerMain)));
  assert.equal(own.statusCode, 200);
  assert.equal(own.json().project.id, projActive.id);
  assert.equal((await get(`/v1/portal/projects/${projB.id}`, sess(ownerMain))).statusCode, 404, 'cross-org project → 404');
  assert.equal((await get(`/v1/portal/projects/does-not-exist`, sess(ownerMain))).statusCode, 404);
});

test('11. deactivated user → 401 on the new endpoints (Slice 0 invariant holds)', async () => {
  const gone = await mkUser(orgMain.id, 'MEMBER');
  const tok = sess(gone);
  assert.equal((await get('/v1/portal/relationship-overview', tok)).statusCode, 200);
  await prisma.clientUser.update({ where: { id: gone.id }, data: { active: false } });
  assert.equal((await get('/v1/portal/relationship-overview', tok)).statusCode, 401);
  assert.equal((await get('/v1/portal/projects', tok)).statusCode, 401);
});

test('12. legacy /portal/overview → { ok, project } and /portal/project → { ok, project, billing } shapes UNCHANGED', async () => {
  const ov = (await get('/v1/portal/overview', sess(ownerMain))).json();
  assert.equal(ov.ok, true);
  assert.ok('project' in ov && !('projects' in ov), '/portal/overview must still be { ok, project } (no projects[])');
  const pr = (await get('/v1/portal/project', sess(ownerMain))).json();
  assert.ok('project' in pr && 'billing' in pr, '/portal/project must still carry { project, billing }');
  // member still gets billing:null from the legacy route
  assert.equal((await get('/v1/portal/project', sess(memberMain))).json().billing, null);
});
