/**
 * Slice 4 — staff ticket workflow. Proves RBAC (VIEWER read-only + internal-note exclusion), tenant scoping,
 * expectedStatus CAS (stale writer loses, closedAt, AuditEvent atomicity), terminal-reply rejection + reopen,
 * reply auto→WAITING_ON_CLIENT, internal notes on terminal tickets, namespaced staff/client idempotency,
 * replay/409/concurrency, per-recipient TICKET_NOTIFY jobs (active-only) + worker skip + legacy no-direction
 * backward-compat, keyset pagination with equal lastMessageAt, and the client internal-note redaction regression.
 *
 * Run: NODE_ENV=test npx tsx --test test/integration/admin-tickets.test.ts
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
import { processDueJobs } from '../../src/jobs/processor';
import { config } from '../../src/config';

const uid = () => randomUUID().slice(0, 8);
const KEY = () => randomUUID();
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let tenantB: string;

const mkOrg = (tenant = tenantId) => prisma.clientOrg.create({ data: { tenantId: tenant, name: `AT ${uid()}`, slug: `at-${uid()}` } });
const mkClient = (clientOrgId: string, active = true, fn = 'Cli', tenant = tenantId) => { const e = `${fn.toLowerCase()}-${uid()}@example.com`; return prisma.clientUser.create({ data: { tenantId: tenant, clientOrgId, email: e, normalizedEmail: e, passwordHash: 'x', role: 'OWNER', firstName: fn, lastName: 'X', active } }); };
async function mkStaff(role: 'ADMIN' | 'DELIVERY_LEAD' | 'ENGINEER' | 'VIEWER', tenant = tenantId) {
  const e = `staff-${role.toLowerCase()}-${uid()}@example.com`;
  const s = await prisma.staffUser.create({ data: { tenantId: tenant, email: e, normalizedEmail: e, passwordHash: 'x', role: role as never, active: true, firstName: role, lastName: 'S' } });
  return { id: s.id, token: `Bearer ${signStaff({ sub: s.id, role: role as never, tenant, email: e })}` };
}
const mkTicket = (clientOrgId: string, opts: { status?: string; projectId?: string | null; lastMessageAt?: Date; tenant?: string } = {}) =>
  prisma.ticket.create({ data: { tenantId: opts.tenant ?? tenantId, clientOrgId, projectId: opts.projectId ?? null, number: `TKT-${uid()}`, subject: `Subj ${uid()}`, category: 'GENERAL', status: (opts.status ?? 'OPEN') as never, createdByClientUserId: 'seed-user', createdByName: 'Seed', lastMessageAt: opts.lastMessageAt ?? new Date() } });

const sget = (url: string, token: string) => app.inject({ method: 'GET', url, headers: { authorization: token } });
const spost = (url: string, token: string, body: unknown, key?: string) => app.inject({ method: 'POST', url, headers: { authorization: token, 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) }, payload: JSON.stringify(body) });
const spatch = (url: string, token: string, body: unknown) => app.inject({ method: 'PATCH', url, headers: { authorization: token, 'content-type': 'application/json' }, payload: JSON.stringify(body) });
const cpost = (url: string, u: { id: string; clientOrgId: string; email: string }, body: unknown, key: string) => app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email })}`, 'content-type': 'application/json', 'idempotency-key': key }, payload: JSON.stringify(body) });
const cget = (url: string, u: { id: string; clientOrgId: string; email: string }) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email })}` } });

let ADMIN: { id: string; token: string }, LEAD: { id: string; token: string }, ENG: { id: string; token: string }, VIEW: { id: string; token: string };

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  tenantB = (await prisma.tenant.create({ data: { slug: `tb-${uid()}`, name: 'TB' } })).id;
  ADMIN = await mkStaff('ADMIN'); LEAD = await mkStaff('DELIVERY_LEAD'); ENG = await mkStaff('ENGINEER'); VIEW = await mkStaff('VIEWER');
});
after(async () => { await app.close(); await prisma.$disconnect(); });

test('1. RBAC: VIEWER read-only (reply/note/status → 403); ENGINEER/LEAD/ADMIN can write', async () => {
  const o = await mkOrg(); const t = await mkTicket(o.id);
  assert.equal((await sget('/v1/admin/tickets', VIEW.token)).statusCode, 200);
  assert.equal((await sget(`/v1/admin/tickets/${t.id}`, VIEW.token)).statusCode, 200);
  assert.equal((await spost(`/v1/admin/tickets/${t.id}/replies`, VIEW.token, { body: 'x' }, KEY())).statusCode, 403);
  assert.equal((await spost(`/v1/admin/tickets/${t.id}/notes`, VIEW.token, { body: 'x' }, KEY())).statusCode, 403);
  assert.equal((await spatch(`/v1/admin/tickets/${t.id}/status`, VIEW.token, { status: 'IN_PROGRESS', expectedStatus: 'OPEN' })).statusCode, 403);
  for (const s of [ENG, LEAD, ADMIN]) {
    const tk = await mkTicket(o.id);
    assert.equal((await spost(`/v1/admin/tickets/${tk.id}/replies`, s.token, { body: 'reply' }, KEY())).statusCode, 201);
    assert.equal((await spost(`/v1/admin/tickets/${tk.id}/notes`, s.token, { body: 'note' }, KEY())).statusCode, 201);
  }
});

test('2. VIEWER never sees internal notes (enforced at API); ticket:note roles do', async () => {
  const o = await mkOrg(); const t = await mkTicket(o.id);
  await spost(`/v1/admin/tickets/${t.id}/notes`, ADMIN.token, { body: 'INTERNAL secret' }, KEY());
  const asView = (await sget(`/v1/admin/tickets/${t.id}`, VIEW.token)).json().ticket.messages as Array<{ internal: boolean; body: string }>;
  assert.ok(!asView.some((m) => m.internal || m.body.includes('INTERNAL')), 'VIEWER response excludes internal notes');
  const asEng = (await sget(`/v1/admin/tickets/${t.id}`, ENG.token)).json().ticket.messages as Array<{ internal: boolean; body: string }>;
  assert.ok(asEng.some((m) => m.internal && m.body.includes('INTERNAL')), 'ENGINEER sees the internal note');
});

test('3. cross-tenant ticket id → 404 (no leak)', async () => {
  const oB = await mkOrg(tenantB); const tB = await mkTicket(oB.id, { tenant: tenantB });
  assert.equal((await sget(`/v1/admin/tickets/${tB.id}`, ADMIN.token)).statusCode, 404);
});

test('4. expectedStatus CAS: stale writer loses (the exact example) + AuditEvent atomicity', async () => {
  const o = await mkOrg(); const t = await mkTicket(o.id, { status: 'OPEN' });
  const a = await spatch(`/v1/admin/tickets/${t.id}/status`, ADMIN.token, { status: 'RESOLVED', expectedStatus: 'OPEN' });
  const b = await spatch(`/v1/admin/tickets/${t.id}/status`, LEAD.token, { status: 'CLOSED', expectedStatus: 'OPEN' });
  assert.equal(a.statusCode, 200);
  assert.equal(b.statusCode, 409);
  assert.equal(b.json().error, 'ticket_status_conflict');
  assert.equal(b.json().currentStatus, 'RESOLVED');
  // AuditEvent only for the successful transition (exactly one), and none for the conflict
  const audits = await prisma.auditEvent.findMany({ where: { entityType: 'Ticket', entityId: t.id, action: 'TICKET_STATUS_CHANGED' } });
  assert.equal(audits.length, 1);
  assert.deepEqual(audits[0].data, { from: 'OPEN', to: 'RESOLVED' });
});

test('5. closedAt set on CLOSE, cleared on reopen; invalid transition → 400', async () => {
  const o = await mkOrg(); const t = await mkTicket(o.id, { status: 'RESOLVED' });
  assert.equal((await spatch(`/v1/admin/tickets/${t.id}/status`, ADMIN.token, { status: 'CLOSED', expectedStatus: 'RESOLVED' })).statusCode, 200);
  assert.ok((await prisma.ticket.findUnique({ where: { id: t.id } }))!.closedAt !== null, 'closedAt set on CLOSE');
  assert.equal((await spatch(`/v1/admin/tickets/${t.id}/status`, ADMIN.token, { status: 'OPEN', expectedStatus: 'CLOSED' })).statusCode, 200);
  assert.equal((await prisma.ticket.findUnique({ where: { id: t.id } }))!.closedAt, null, 'closedAt cleared on reopen');
  // disallowed pair (RESOLVED → WAITING_ON_CLIENT not in the table)
  const t2 = await mkTicket(o.id, { status: 'RESOLVED' });
  const bad = await spatch(`/v1/admin/tickets/${t2.id}/status`, ADMIN.token, { status: 'WAITING_ON_CLIENT', expectedStatus: 'RESOLVED' });
  assert.equal(bad.statusCode, 400);
  assert.equal(bad.json().error, 'invalid_transition');
});

test('6. staff reply auto-moves OPEN → WAITING_ON_CLIENT; terminal → 409 not_repliable; notes allowed on terminal', async () => {
  const o = await mkOrg();
  const open = await mkTicket(o.id, { status: 'IN_PROGRESS' });
  assert.equal((await spost(`/v1/admin/tickets/${open.id}/replies`, ADMIN.token, { body: 'hi' }, KEY())).statusCode, 201);
  assert.equal((await prisma.ticket.findUnique({ where: { id: open.id } }))!.status, 'WAITING_ON_CLIENT');
  for (const st of ['RESOLVED', 'CLOSED'] as const) {
    const t = await mkTicket(o.id, { status: st });
    const r = await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'x' }, KEY());
    assert.equal(r.statusCode, 409);
    assert.equal(r.json().error, 'ticket_not_repliable');
    // internal note IS allowed on terminal
    assert.equal((await spost(`/v1/admin/tickets/${t.id}/notes`, ADMIN.token, { body: 'note ok' }, KEY())).statusCode, 201);
  }
});

test('7. explicit reopen then reply works', async () => {
  const o = await mkOrg(); const t = await mkTicket(o.id, { status: 'CLOSED' });
  assert.equal((await spatch(`/v1/admin/tickets/${t.id}/status`, ADMIN.token, { status: 'IN_PROGRESS', expectedStatus: 'CLOSED' })).statusCode, 200);
  assert.equal((await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'after reopen' }, KEY())).statusCode, 201);
  assert.equal((await prisma.ticket.findUnique({ where: { id: t.id } }))!.status, 'WAITING_ON_CLIENT');
});

test('8. idempotency namespace isolation: same key as staff-reply + staff-note + client reply → 3 distinct rows', async () => {
  const o = await mkOrg(); const owner = await mkClient(o.id); const t = await mkTicket(o.id, { status: 'OPEN' });
  const k = KEY();
  assert.equal((await cpost(`/v1/portal/tickets/${t.id}/replies`, owner, { body: 'client' }, k)).statusCode, 201);
  assert.equal((await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'staff reply' }, k)).statusCode, 201);
  assert.equal((await spost(`/v1/admin/tickets/${t.id}/notes`, ADMIN.token, { body: 'staff note' }, k)).statusCode, 201);
  const keys = (await prisma.ticketMessage.findMany({ where: { ticketId: t.id, clientRequestId: { not: null } }, select: { clientRequestId: true } })).map((m) => m.clientRequestId).sort();
  assert.deepEqual(keys, [k, `staff-note:${k}`, `staff-reply:${k}`].sort(), 'three distinct namespaced keys, no interference');
});

test('9. staff reply idempotency: replay 200 / changed 409 / concurrent one', async () => {
  const o = await mkOrg(); const t = await mkTicket(o.id, { status: 'OPEN' });
  const k = KEY();
  const first = await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'same' }, k);
  const replay = await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'same' }, k);
  assert.equal(first.statusCode, 201);
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.json().idempotentReplay, true);
  assert.equal(first.json().message.id, replay.json().message.id);
  assert.equal((await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'CHANGED' }, k)).statusCode, 409);
  // concurrent identical (fresh key) → exactly one message
  const t2 = await mkTicket(o.id, { status: 'OPEN' }); const k2 = KEY();
  const [x, y] = await Promise.all([spost(`/v1/admin/tickets/${t2.id}/replies`, ADMIN.token, { body: 'race' }, k2), spost(`/v1/admin/tickets/${t2.id}/replies`, ADMIN.token, { body: 'race' }, k2)]);
  assert.ok([200, 201].includes(x.statusCode) && [200, 201].includes(y.statusCode));
  assert.equal(x.json().message.id, y.json().message.id);
  assert.equal(await prisma.ticketMessage.count({ where: { ticketId: t2.id, clientRequestId: `staff-reply:${k2}` } }), 1);
});

test('10. per-recipient TICKET_NOTIFY jobs for ACTIVE client users only; in-app rows for active only', async () => {
  const o = await mkOrg();
  const a1 = await mkClient(o.id, true), a2 = await mkClient(o.id, true), a3 = await mkClient(o.id, true);
  const inactive = await mkClient(o.id, false);
  const t = await mkTicket(o.id, { status: 'OPEN' });
  const r = await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'to clients' }, KEY());
  const msgId = r.json().message.id;
  const jobs = await prisma.sideEffectJob.findMany({ where: { type: 'TICKET_NOTIFY', idempotencyKey: { startsWith: `ticket-client-notify:${msgId}:` } } });
  const jobUsers = jobs.map((j) => (j.payload as { clientUserId: string }).clientUserId).sort();
  assert.deepEqual(jobUsers, [a1.id, a2.id, a3.id].sort(), 'one job per ACTIVE recipient, none for inactive');
  jobs.forEach((j) => assert.equal(j.idempotencyKey, `ticket-client-notify:${msgId}:${(j.payload as { clientUserId: string }).clientUserId}`));
  const notifs = await prisma.notification.findMany({ where: { type: 'TICKET_MESSAGE', recipientId: { in: [a1.id, a2.id, a3.id, inactive.id] } } });
  assert.equal(notifs.length, 3, 'in-app notifications for active recipients only');
  assert.ok(!notifs.some((n) => n.recipientId === inactive.id));
});

test('11. worker: to_client email for active; SKIP for deactivated; legacy no-direction → internal email', async () => {
  const o = await mkOrg(); const user = await mkClient(o.id, true, 'Rex'); const t = await mkTicket(o.id, { status: 'OPEN' });
  // to_client (active) → EmailOutbox row to the user
  await prisma.sideEffectJob.create({ data: { tenantId, type: 'TICKET_NOTIFY', payload: { ticketId: t.id, messageId: 'm', direction: 'to_client', clientUserId: user.id }, idempotencyKey: `probe-active:${uid()}` } });
  await processDueJobs(prisma, new Date());
  assert.ok(await prisma.emailOutbox.findFirst({ where: { toAddress: user.email, subject: { contains: 'Reply on your support ticket' } } }), 'active recipient emailed');
  // to_client (deactivated) → safe skip, no email, job SUCCEEDED
  const gone = await mkClient(o.id, true, 'Gone');
  const skipKey = `probe-skip:${uid()}`;
  await prisma.sideEffectJob.create({ data: { tenantId, type: 'TICKET_NOTIFY', payload: { ticketId: t.id, messageId: 'm', direction: 'to_client', clientUserId: gone.id }, idempotencyKey: skipKey } });
  await prisma.clientUser.update({ where: { id: gone.id }, data: { active: false } });
  await processDueJobs(prisma, new Date());
  assert.equal((await prisma.sideEffectJob.findUnique({ where: { idempotencyKey: skipKey } }))!.status, 'SUCCEEDED', 'skip job succeeds');
  assert.equal(await prisma.emailOutbox.count({ where: { toAddress: gone.email } }), 0, 'deactivated recipient never emailed');
  // legacy no-direction (Slice 3 shape) → internal email
  await prisma.sideEffectJob.create({ data: { tenantId, type: 'TICKET_NOTIFY', payload: { ticketId: t.id, messageId: 'm', event: 'replied' }, idempotencyKey: `probe-legacy:${uid()}` } });
  await processDueJobs(prisma, new Date());
  assert.ok(await prisma.emailOutbox.findFirst({ where: { toAddress: config.EMAIL_INTERNAL_TO, subject: { contains: 'Support reply' } } }), 'legacy no-direction job emails internal');
});

test('12. keyset pagination is stable with EQUAL lastMessageAt (no dup, no skip)', async () => {
  const o = await mkOrg();
  const ts = new Date('2098-01-01T00:00:00.000Z');
  const ids = new Set<string>();
  for (let i = 0; i < 5; i++) ids.add((await mkTicket(o.id, { status: 'OPEN', lastMessageAt: ts })).id);
  const seen: string[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 6; page++) {
    const url: string = `/v1/admin/tickets?clientOrgId=${o.id}&limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const body = (await sget(url, ADMIN.token)).json();
    seen.push(...body.tickets.map((t: { id: string }) => t.id));
    cursor = body.nextCursor;
    if (!cursor) break;
  }
  const mine = seen.filter((id) => ids.has(id));
  assert.equal(mine.length, 5, 'all 5 equal-timestamp tickets returned');
  assert.equal(new Set(mine).size, 5, 'no duplicates across pages');
});

test('13. default queue excludes CLOSED; RESOLVED included; explicit filter can fetch CLOSED', async () => {
  const o = await mkOrg();
  const open = await mkTicket(o.id, { status: 'OPEN' });
  const resolved = await mkTicket(o.id, { status: 'RESOLVED' });
  const closed = await mkTicket(o.id, { status: 'CLOSED' });
  const def = (await sget(`/v1/admin/tickets?clientOrgId=${o.id}`, ADMIN.token)).json().tickets.map((t: { id: string }) => t.id);
  assert.ok(def.includes(open.id) && def.includes(resolved.id) && !def.includes(closed.id), 'default: non-CLOSED');
  const withClosed = (await sget(`/v1/admin/tickets?clientOrgId=${o.id}&status=CLOSED`, ADMIN.token)).json().tickets.map((t: { id: string }) => t.id);
  assert.ok(withClosed.includes(closed.id) && !withClosed.includes(open.id), 'explicit CLOSED filter');
});

test('14. regression: client GET /portal/tickets/:id still excludes internal notes', async () => {
  const o = await mkOrg(); const owner = await mkClient(o.id); const t = await mkTicket(o.id, { status: 'OPEN' });
  await spost(`/v1/admin/tickets/${t.id}/notes`, ADMIN.token, { body: 'CLIENT MUST NOT SEE THIS' }, KEY());
  await spost(`/v1/admin/tickets/${t.id}/replies`, ADMIN.token, { body: 'client-visible reply' }, KEY());
  const msgs = (await cget(`/v1/portal/tickets/${t.id}`, owner)).json().ticket.messages as Array<{ body: string }>;
  assert.ok(!msgs.some((m) => m.body.includes('CLIENT MUST NOT SEE')), 'internal note never reaches the client endpoint');
  assert.ok(msgs.some((m) => m.body.includes('client-visible reply')), 'client-visible staff reply does reach the client');
});
