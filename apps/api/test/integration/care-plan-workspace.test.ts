/**
 * P3.4 — Client Workspace / Timeline: the money-free Care Plan status projection + the RETAINER_ACTIVATED
 * relationship-timeline moment. Proves: members see the non-financial status but NO billing (P3.3 stays
 * green); cross-org / cross-tenant isolation; DRAFT/inactive never surface; the timeline moment is emitted
 * exactly ONCE — under ordinary retry, PAUSED→ACTIVE reactivation, AND two genuinely concurrent activations.
 *
 * Run: NODE_ENV=test npx tsx --test test/integration/care-plan-workspace.test.ts
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
import { selectClientCarePlanStatus, emitRetainerActivated } from '../../src/lib/care-plan';
import { MOMENT, MOMENT_MESSAGE } from '../../src/lib/relationship-moments';

const uid = () => randomUUID().slice(0, 8);
const noon = (iso: string) => new Date(`${iso}T12:00:00.000Z`);
const FAR = noon('2099-01-15'); // keep ACTIVE fixtures invisible to any real-dated retainer sweep
const RA_MESSAGE = 'Care Plan activated — monitoring & support'; // the EXACT expected static copy

let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let tenantB: string;
let staffAuthz: string;

const mkOrg = (tenant = tenantId) => prisma.clientOrg.create({ data: { tenantId: tenant, name: `CPW ${uid()}`, slug: `cpw-${uid()}` } });
const mkUser = (clientOrgId: string, role: 'OWNER' | 'MEMBER', tenant = tenantId) => {
  const email = `${role.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId: tenant, clientOrgId, email, normalizedEmail: email, passwordHash: 'x', role } });
};
const mkProject = (clientOrgId: string, tenant = tenantId) => prisma.project.create({ data: { tenantId: tenant, clientOrgId, name: `Proj ${uid()}` } });
const mkCarePlan = (clientOrgId: string, status: string, extra: Record<string, unknown> = {}, tenant = tenantId) =>
  prisma.carePlan.create({
    data: {
      tenantId: tenant, clientOrgId, name: `Care ${uid()}`, monthlyAmountCents: 250000, currency: 'USD', status: status as any,
      nextInvoiceAt: status === 'ACTIVE' || status === 'PAST_DUE' ? FAR : null,
      ...extra,
    },
  });

const auth = (u: { id: string; clientOrgId: string; email: string }, tenant = tenantId) => ({
  authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant, email: u.email })}`,
  'content-type': 'application/json',
});
const overview = (u: any, tenant = tenantId) => app.inject({ method: 'GET', url: '/v1/portal/overview', headers: auth(u, tenant) });
const project = (u: any) => app.inject({ method: 'GET', url: '/v1/portal/project', headers: auth(u) });
const activate = (carePlanId: string) =>
  app.inject({ method: 'PATCH', url: `/v1/admin/care-plans/${carePlanId}`, headers: { authorization: staffAuthz, 'content-type': 'application/json' }, payload: JSON.stringify({ status: 'ACTIVE' }) });
// Slice 2: RETAINER_ACTIVATED is a RELATIONSHIP-level moment (projectId=null), owned directly by
// clientOrgId — so it is counted by clientOrgId, not via a project relation.
const raCount = (clientOrgId: string, tenant = tenantId) =>
  prisma.portalActivity.count({ where: { tenantId: tenant, type: MOMENT.RETAINER_ACTIVATED, clientOrgId } });

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  tenantB = (await prisma.tenant.create({ data: { slug: `tenant-b-${uid()}`, name: 'Tenant B' } })).id;
  const semail = `staff-${uid()}@example.com`;
  const staff = await prisma.staffUser.create({ data: { tenantId, email: semail, normalizedEmail: semail, passwordHash: 'x', role: 'ADMIN', active: true } });
  staffAuthz = `Bearer ${signStaff({ sub: staff.id, role: 'ADMIN', tenant: tenantId, email: semail })}`;
});
after(async () => { await app.close(); await prisma.$disconnect(); });

// ── The moment copy is EXACTLY the money-free static string (stronger than a no-$-substring check) ──
test('RETAINER_ACTIVATED message is the exact static, money-free copy', () => {
  assert.equal(MOMENT_MESSAGE[MOMENT.RETAINER_ACTIVATED], RA_MESSAGE);
  assert.doesNotMatch(RA_MESSAGE, /\$|\d|price|amount|invoice|cents/i);
});

// ── selectClientCarePlanStatus — money-free coarse status ──
test('status projection: ACTIVE → { active:true, nextReportAt }; PAST_DUE → active:true; others → null', async () => {
  const a = await mkOrg(); await mkCarePlan(a.id, 'ACTIVE', { nextReportAt: noon('2026-10-15') });
  assert.deepEqual(await selectClientCarePlanStatus(prisma, tenantId, a.id), { active: true, nextReportAt: noon('2026-10-15') });

  const pd = await mkOrg(); await mkCarePlan(pd.id, 'PAST_DUE');
  const pdRes = await selectClientCarePlanStatus(prisma, tenantId, pd.id);
  assert.equal(pdRes?.active, true); // PAST_DUE coarsened to active — the raw status never leaks

  for (const st of ['PAUSED', 'DRAFT', 'COMPLETED', 'CANCELED']) {
    const o = await mkOrg(); await mkCarePlan(o.id, st);
    assert.equal(await selectClientCarePlanStatus(prisma, tenantId, o.id), null, `${st} must not surface an active state`);
  }
  const none = await mkOrg();
  assert.equal(await selectClientCarePlanStatus(prisma, tenantId, none.id), null);
});

test('status projection: an ACTIVE plan with no next-report date → { active:true, nextReportAt:null }', async () => {
  const o = await mkOrg(); await mkCarePlan(o.id, 'ACTIVE');
  assert.deepEqual(await selectClientCarePlanStatus(prisma, tenantId, o.id), { active: true, nextReportAt: null });
});

// ── /portal/overview — owner AND member both get the money-free signal; NO financials to anyone ──
test('overview: OWNER and MEMBER both receive carePlan { active, nextReportAt } and NO money fields', async () => {
  const o = await mkOrg();
  const owner = await mkUser(o.id, 'OWNER');
  const member = await mkUser(o.id, 'MEMBER');
  await mkProject(o.id);
  await mkCarePlan(o.id, 'ACTIVE', { nextReportAt: noon('2026-10-15') });

  for (const [who, u] of [['owner', owner], ['member', member]] as const) {
    const body = (await overview(u)).body;
    const cp = JSON.parse(body).project?.carePlan;
    assert.equal(cp?.active, true, `${who} sees active care plan`);
    assert.ok('nextReportAt' in (cp || {}), `${who} sees nextReportAt`);
    // Regression: NO financial/internal field anywhere in the overview payload.
    assert.doesNotMatch(body, /monthlyAmountCents|nextReportNote|billingAnchorDay|stripe/i, `${who} overview leaks no money/internal`);
  }
});

test('overview: an inactive (PAUSED) Care Plan yields carePlan:null; DRAFT never surfaces', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER'); await mkProject(o.id);
  await mkCarePlan(o.id, 'PAUSED');
  assert.equal(JSON.parse((await overview(owner)).body).project?.carePlan, null);
});

test('overview regression: a MEMBER still gets billing:null on /portal/project (P3.3 intact)', async () => {
  const o = await mkOrg(); const member = await mkUser(o.id, 'MEMBER'); await mkProject(o.id);
  await mkCarePlan(o.id, 'ACTIVE');
  assert.equal(JSON.parse((await project(member)).body).billing, null);
});

// ── Isolation ──
test('overview: carePlan never crosses orgs', async () => {
  const withPlan = await mkOrg(); await mkProject(withPlan.id); await mkCarePlan(withPlan.id, 'ACTIVE');
  const other = await mkOrg(); const ownerOther = await mkUser(other.id, 'OWNER'); await mkProject(other.id);
  assert.equal(JSON.parse((await overview(ownerOther)).body).project?.carePlan, null, 'an owner never sees another org’s care plan');
});

test('overview: a non-default-tenant session is rejected (401) — cross-tenant enforced at auth', async () => {
  const oB = await mkOrg(tenantB); const ownerB = await mkUser(oB.id, 'OWNER', tenantB); await mkProject(oB.id, tenantB);
  await mkCarePlan(oB.id, 'ACTIVE', {}, tenantB);
  assert.equal((await overview(ownerB, tenantB)).statusCode, 401);
});

// ── RETAINER_ACTIVATED emission — atomic once-only ──
test('emitter: one call writes exactly one RELATIONSHIP-level moment (projectId=null, owned by org) with the exact message + SYSTEM actor', async () => {
  const o = await mkOrg(); await mkProject(o.id); const cp = await mkCarePlan(o.id, 'ACTIVE');
  await emitRetainerActivated(prisma, { id: cp.id, tenantId, clientOrgId: o.id });
  const rows = await prisma.portalActivity.findMany({ where: { type: MOMENT.RETAINER_ACTIVATED, clientOrgId: o.id } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].message, RA_MESSAGE);
  assert.equal(rows[0].projectId, null, 'RETAINER_ACTIVATED is relationship-level — never attached to a project (heuristic retired)');
  assert.equal(rows[0].clientOrgId, o.id);
  assert.equal(rows[0].actorType, 'SYSTEM');
  assert.equal(rows[0].id, `retainer-activated:${cp.id}`);
});

test('emitter: an ordinary retry (second call) does NOT create a duplicate', async () => {
  const o = await mkOrg(); await mkProject(o.id); const cp = await mkCarePlan(o.id, 'ACTIVE');
  await emitRetainerActivated(prisma, { id: cp.id, tenantId, clientOrgId: o.id });
  await emitRetainerActivated(prisma, { id: cp.id, tenantId, clientOrgId: o.id });
  assert.equal(await raCount(o.id), 1);
});

test('emitter: TWO CONCURRENT emissions produce exactly one moment (DB primary-key atomicity)', async () => {
  const o = await mkOrg(); await mkProject(o.id); const cp = await mkCarePlan(o.id, 'ACTIVE');
  const plan = { id: cp.id, tenantId, clientOrgId: o.id };
  await Promise.all([emitRetainerActivated(prisma, plan), emitRetainerActivated(prisma, plan)]);
  assert.equal(await raCount(o.id), 1);
});

test('emitter: an org with a live plan and ZERO projects now RECORDS the moment (Slice 2 — heuristic retired)', async () => {
  const o = await mkOrg(); const cp = await mkCarePlan(o.id, 'ACTIVE'); // no project at all
  await emitRetainerActivated(prisma, { id: cp.id, tenantId, clientOrgId: o.id });
  assert.equal(await raCount(o.id), 1, 'a project-less org used to drop the moment; it is now relationship-level and recorded');
  const row = await prisma.portalActivity.findFirst({ where: { type: MOMENT.RETAINER_ACTIVATED, clientOrgId: o.id } });
  assert.equal(row?.projectId, null);
});

// ── Endpoint-level: two CONCURRENT activation requests → exactly one moment ──
test('activation endpoint: two concurrent PATCH →ACTIVE create exactly one RETAINER_ACTIVATED moment', async () => {
  const o = await mkOrg(); await mkProject(o.id);
  const cp = await mkCarePlan(o.id, 'DRAFT');
  const [r1, r2] = await Promise.all([activate(cp.id), activate(cp.id)]);
  assert.ok([200, 409].includes(r1.statusCode) && [200, 409].includes(r2.statusCode));
  assert.equal(await raCount(o.id), 1, 'exactly one moment despite two concurrent activations');
  const moment = await prisma.portalActivity.findFirst({ where: { type: MOMENT.RETAINER_ACTIVATED, clientOrgId: o.id } });
  assert.equal(moment?.message, RA_MESSAGE);
});

test('activation endpoint: PAUSED→ACTIVE reactivation does NOT emit a second moment', async () => {
  const o = await mkOrg(); await mkProject(o.id);
  const cp = await mkCarePlan(o.id, 'DRAFT');
  assert.equal((await activate(cp.id)).statusCode, 200);         // DRAFT→ACTIVE (emits)
  assert.equal(await raCount(o.id), 1);
  await app.inject({ method: 'PATCH', url: `/v1/admin/care-plans/${cp.id}`, headers: { authorization: staffAuthz, 'content-type': 'application/json' }, payload: JSON.stringify({ status: 'PAUSED' }) });
  assert.equal((await activate(cp.id)).statusCode, 200);         // PAUSED→ACTIVE (must NOT re-emit)
  assert.equal(await raCount(o.id), 1, 'reactivation reuses the deterministic id → still one moment');
});

test('timeline: the emitted moment is client-visible on the RELATIONSHIP activity feed (org-wide), scoped to the org', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER'); await mkProject(o.id);
  const cp = await mkCarePlan(o.id, 'DRAFT');
  await activate(cp.id);
  // Slice 2: relationship-level moments surface on /portal/relationship-activity, NOT the project overview.
  const feed = JSON.parse((await app.inject({ method: 'GET', url: '/v1/portal/relationship-activity', headers: auth(owner) })).body).activities ?? [];
  const ra = feed.find((a: any) => a.type === MOMENT.RETAINER_ACTIVATED);
  assert.ok(ra && ra.message === RA_MESSAGE, 'moment shows on the relationship activity feed');
  assert.equal(ra.projectId, null, 'served as a relationship-level (projectId=null) row');

  const other = await mkOrg(); const ownerOther = await mkUser(other.id, 'OWNER'); await mkProject(other.id);
  const otherFeed = JSON.parse((await app.inject({ method: 'GET', url: '/v1/portal/relationship-activity', headers: auth(ownerOther) })).body).activities ?? [];
  assert.ok(!otherFeed.some((a: any) => a.type === MOMENT.RETAINER_ACTIVATED), 'another org never sees the moment');
});
