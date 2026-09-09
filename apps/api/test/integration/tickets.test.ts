/**
 * Slice 3 — client support tickets. Proves the dedicated Ticket/TicketMessage model + client API:
 * relationship ownership (tenant+org), optional validated project link, both-roles participation, org-scoped
 * listing + detail, internal-note redaction, deactivation (Slice 0), and the DB-backed idempotency algorithm
 * (create scoped per-org, reply scoped per-ticket, replay vs 409, concurrency = exactly one, durable job).
 *
 * Run: NODE_ENV=test npx tsx --test test/integration/tickets.test.ts
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
const key = () => randomUUID(); // 36 chars, matches ^[A-Za-z0-9_-]{8,200}$
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let tenantB: string;

const mkOrg = (tenant = tenantId) => prisma.clientOrg.create({ data: { tenantId: tenant, name: `TKT ${uid()}`, slug: `tkt-${uid()}` } });
const mkUser = (clientOrgId: string, role: 'OWNER' | 'MEMBER', fn: string, ln: string, tenant = tenantId) => {
  const e = `${fn.toLowerCase()}-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId: tenant, clientOrgId, email: e, normalizedEmail: e, passwordHash: 'x', role, firstName: fn, lastName: ln } });
};
const mkProject = (clientOrgId: string, tenant = tenantId) => prisma.project.create({ data: { tenantId: tenant, clientOrgId, name: `P-${uid()}`, status: 'IN_PROGRESS' as never } });

const sess = (u: { id: string; clientOrgId: string; email: string }, tenant = tenantId) => signSession({ sub: u.id, org: u.clientOrgId, tenant, email: u.email });
const hdr = (u: { id: string; clientOrgId: string; email: string }, k?: string, tenant = tenantId) => ({ authorization: `Bearer ${sess(u, tenant)}`, 'content-type': 'application/json', ...(k ? { 'idempotency-key': k } : {}) });
const post = (url: string, u: any, bodyObj: unknown, k?: string, tenant = tenantId) => app.inject({ method: 'POST', url, headers: hdr(u, k, tenant), payload: JSON.stringify(bodyObj) });
const get = (url: string, u: any, tenant = tenantId) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${sess(u, tenant)}` } });

before(async () => {
  app = await buildApp();
  tenantId = (await resolveDefaultTenant(prisma)).id;
  tenantB = (await prisma.tenant.create({ data: { slug: `tenant-b-${uid()}`, name: 'Tenant B' } })).id;
});
after(async () => { await app.close(); await prisma.$disconnect(); });

test('1. OWNER opens a relationship ticket (no project); number is TKT-000NNN 6-digit; first message stored', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Olga', 'Owner');
  const r = await post('/v1/portal/tickets', owner, { subject: 'Need help', category: 'TECHNICAL', body: 'Something broke' }, key());
  assert.equal(r.statusCode, 201);
  const t = r.json().ticket;
  assert.match(t.number, /^TKT-\d{6}$/);
  assert.equal(t.status, 'OPEN');
  assert.equal(t.projectId, null);
  const detail = (await get(`/v1/portal/tickets/${t.id}`, owner)).json().ticket;
  assert.equal(detail.messages.length, 1);
  assert.equal(detail.messages[0].authorType, 'CLIENT');
  assert.equal(detail.messages[0].authorName, 'Olga Owner');
  assert.doesNotMatch(detail.messages[0].body, /\byou\b/i);
});

test('2. MEMBER can also create + reply (both roles participate)', async () => {
  const o = await mkOrg(); const member = await mkUser(o.id, 'MEMBER', 'Mia', 'Member');
  const c = await post('/v1/portal/tickets', member, { subject: 'Question', category: 'GENERAL', body: 'hi' }, key());
  assert.equal(c.statusCode, 201);
  const rep = await post(`/v1/portal/tickets/${c.json().ticket.id}/replies`, member, { body: 'more info' }, key());
  assert.equal(rep.statusCode, 201);
});

test('3. optional project link works when it belongs to the caller org', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Pat', 'P'); const p = await mkProject(o.id);
  const r = await post('/v1/portal/tickets', owner, { subject: 'About project', category: 'PROJECT', projectId: p.id, body: 'x' }, key());
  assert.equal(r.statusCode, 201);
  assert.equal(r.json().ticket.projectId, p.id);
});

test('4. a foreign-org project id is rejected (404) — ownership-safe', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Ann', 'A');
  const other = await mkOrg(); const foreignProj = await mkProject(other.id);
  const r = await post('/v1/portal/tickets', owner, { subject: 'x', category: 'PROJECT', projectId: foreignProj.id, body: 'x' }, key());
  assert.equal(r.statusCode, 404);
  assert.equal(await prisma.ticket.count({ where: { clientOrgId: o.id } }), 0);
});

test('5. cross-tenant session is rejected (401)', async () => {
  const oB = await mkOrg(tenantB); const ownerB = await mkUser(oB.id, 'OWNER', 'Ben', 'B', tenantB);
  assert.equal((await post('/v1/portal/tickets', ownerB, { subject: 'x', category: 'GENERAL', body: 'x' }, key(), tenantB)).statusCode, 401);
  assert.equal((await get('/v1/portal/tickets', ownerB, tenantB)).statusCode, 401);
});

test('6. client lists only their own org tickets; cross-org ticket id → 404', async () => {
  const oA = await mkOrg(); const ownerA = await mkUser(oA.id, 'OWNER', 'Amy', 'A');
  const oB = await mkOrg(); const ownerB = await mkUser(oB.id, 'OWNER', 'Bob', 'B');
  const a1 = (await post('/v1/portal/tickets', ownerA, { subject: 'A1', category: 'GENERAL', body: 'x' }, key())).json().ticket;
  await post('/v1/portal/tickets', ownerB, { subject: 'B1', category: 'GENERAL', body: 'x' }, key());
  const listA = (await get('/v1/portal/tickets', ownerA)).json().tickets;
  assert.ok(listA.every((t: { id: string }) => t.id === a1.id) && listA.length === 1, 'A sees only its own ticket');
  assert.equal((await get(`/v1/portal/tickets/${a1.id}`, ownerB)).statusCode, 404, 'B cannot read A’s ticket');
});

test('7. deactivated user → 401 on list/create/read/reply; reactivation restores', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Deb', 'D');
  const t = (await post('/v1/portal/tickets', owner, { subject: 'x', category: 'GENERAL', body: 'x' }, key())).json().ticket;
  await prisma.clientUser.update({ where: { id: owner.id }, data: { active: false } });
  assert.equal((await get('/v1/portal/tickets', owner)).statusCode, 401);
  assert.equal((await get(`/v1/portal/tickets/${t.id}`, owner)).statusCode, 401);
  assert.equal((await post('/v1/portal/tickets', owner, { subject: 'x', category: 'GENERAL', body: 'x' }, key())).statusCode, 401);
  assert.equal((await post(`/v1/portal/tickets/${t.id}/replies`, owner, { body: 'x' }, key())).statusCode, 401);
  await prisma.clientUser.update({ where: { id: owner.id }, data: { active: true } });
  assert.equal((await get('/v1/portal/tickets', owner)).statusCode, 200);
});

test('8. replies preserve the correct author snapshot for two different teammates; no viewer-relative copy', async () => {
  const o = await mkOrg(); const alice = await mkUser(o.id, 'OWNER', 'Alice', 'Anderson'); const bob = await mkUser(o.id, 'MEMBER', 'Bob', 'Brown');
  const t = (await post('/v1/portal/tickets', alice, { subject: 'thread', category: 'GENERAL', body: 'alice opens' }, key())).json().ticket;
  await post(`/v1/portal/tickets/${t.id}/replies`, bob, { body: 'bob replies' }, key());
  const msgs = (await get(`/v1/portal/tickets/${t.id}`, alice)).json().ticket.messages;
  const names = msgs.map((m: { authorName: string }) => m.authorName).sort();
  assert.deepEqual(names, ['Alice Anderson', 'Bob Brown']);
  for (const m of msgs) assert.doesNotMatch(m.body, /\byou\b/i);
});

test('9. internal staff notes never appear in the client detail', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Ivy', 'I');
  const t = (await post('/v1/portal/tickets', owner, { subject: 'x', category: 'GENERAL', body: 'client msg' }, key())).json().ticket;
  await prisma.ticketMessage.create({ data: { tenantId, ticketId: t.id, authorType: 'TEAM', authorName: 'Staff', internal: true, body: 'SECRET internal note' } });
  const msgs = (await get(`/v1/portal/tickets/${t.id}`, owner)).json().ticket.messages;
  assert.ok(!msgs.some((m: { body: string }) => m.body.includes('SECRET')), 'internal note must never leak to the client');
});

test('10. relationship ticket works for an org with ZERO projects', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Zoe', 'Z'); // no projects at all
  const r = await post('/v1/portal/tickets', owner, { subject: 'no project', category: 'CARE_PLAN', body: 'x' }, key());
  assert.equal(r.statusCode, 201);
  assert.equal(r.json().ticket.projectId, null);
});

test('11. Idempotency-Key is REQUIRED on client create + reply (400 if missing)', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Kay', 'K');
  assert.equal((await post('/v1/portal/tickets', owner, { subject: 'x', category: 'GENERAL', body: 'x' } /* no key */)).statusCode, 400);
  const t = (await post('/v1/portal/tickets', owner, { subject: 'x', category: 'GENERAL', body: 'x' }, key())).json().ticket;
  assert.equal((await post(`/v1/portal/tickets/${t.id}/replies`, owner, { body: 'x' } /* no key */)).statusCode, 400);
});

test('12. create retry (same key + same payload) → 200 replay, same ticket, no duplicate', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Rex', 'R');
  const k = key(); const payload = { subject: 'dup', category: 'GENERAL', body: 'once' };
  const first = await post('/v1/portal/tickets', owner, payload, k);
  const second = await post('/v1/portal/tickets', owner, payload, k);
  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 200);
  assert.equal(second.json().idempotentReplay, true);
  assert.equal(first.json().ticket.id, second.json().ticket.id);
  assert.equal(await prisma.ticket.count({ where: { clientOrgId: o.id, clientRequestId: k } }), 1);
});

test('13. same key + DIFFERENT payload → 409 conflict; original preserved, no new row', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Cid', 'C');
  const k = key();
  const first = await post('/v1/portal/tickets', owner, { subject: 'A', category: 'GENERAL', body: 'first' }, k);
  const conflict = await post('/v1/portal/tickets', owner, { subject: 'B', category: 'BILLING', body: 'different' }, k);
  assert.equal(first.statusCode, 201);
  assert.equal(conflict.statusCode, 409);
  assert.equal(await prisma.ticket.count({ where: { clientOrgId: o.id, clientRequestId: k } }), 1);
  assert.equal((await get(`/v1/portal/tickets/${first.json().ticket.id}`, owner)).json().ticket.subject, 'A');
});

test('14. concurrent identical create (same key) → exactly one committed ticket', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Con', 'C');
  const k = key(); const payload = { subject: 'race', category: 'GENERAL', body: 'x' };
  const [a, b] = await Promise.all([post('/v1/portal/tickets', owner, payload, k), post('/v1/portal/tickets', owner, payload, k)]);
  assert.ok([200, 201].includes(a.statusCode) && [200, 201].includes(b.statusCode));
  assert.equal(a.json().ticket.id, b.json().ticket.id);
  assert.equal(await prisma.ticket.count({ where: { clientOrgId: o.id, clientRequestId: k } }), 1, 'exactly one ticket despite concurrency');
});

test('15. reply idempotency: retry (same key) → replay; concurrent same reply → exactly one message', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Rae', 'R');
  const t = (await post('/v1/portal/tickets', owner, { subject: 'x', category: 'GENERAL', body: 'open' }, key())).json().ticket;
  const k = key();
  const [a, b] = await Promise.all([post(`/v1/portal/tickets/${t.id}/replies`, owner, { body: 'same' }, k), post(`/v1/portal/tickets/${t.id}/replies`, owner, { body: 'same' }, k)]);
  assert.ok([200, 201].includes(a.statusCode) && [200, 201].includes(b.statusCode));
  assert.equal(a.json().message.id, b.json().message.id);
  assert.equal(await prisma.ticketMessage.count({ where: { ticketId: t.id, clientRequestId: k } }), 1);
  // a DIFFERENT reply body with the SAME key → 409 (never suppress a legitimate different message silently)
  assert.equal((await post(`/v1/portal/tickets/${t.id}/replies`, owner, { body: 'CHANGED' }, k)).statusCode, 409);
});

test('16. a durable TICKET_NOTIFY SideEffectJob is enqueued atomically for each new message', async () => {
  const o = await mkOrg(); const owner = await mkUser(o.id, 'OWNER', 'Joe', 'J');
  const t = (await post('/v1/portal/tickets', owner, { subject: 'notif', category: 'GENERAL', body: 'x' }, key())).json().ticket;
  const firstMsg = await prisma.ticketMessage.findFirst({ where: { ticketId: t.id }, orderBy: { createdAt: 'asc' } });
  const job = await prisma.sideEffectJob.findUnique({ where: { idempotencyKey: `${firstMsg!.id}:TICKET_NOTIFY` } });
  assert.ok(job && job.type === 'TICKET_NOTIFY', 'ticket-open enqueues a durable notify job in the same tx');
  await post(`/v1/portal/tickets/${t.id}/replies`, owner, { body: 'reply' }, key());
  const replyMsg = await prisma.ticketMessage.findFirst({ where: { ticketId: t.id }, orderBy: { createdAt: 'desc' } });
  assert.ok(await prisma.sideEffectJob.findUnique({ where: { idempotencyKey: `${replyMsg!.id}:TICKET_NOTIFY` } }), 'reply enqueues its own durable job');
});
