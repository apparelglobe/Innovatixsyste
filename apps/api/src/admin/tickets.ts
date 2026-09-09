/**
 * Slice 4 — STAFF ticket endpoints (/v1/admin/tickets*). Tenant-scoped via requireStaff (role from the
 * signed staff token, tenant resolved + matched). Cross-tenant ids resolve to null → 404 (no existence
 * leak). Reply/note require an Idempotency-Key header (DB-backed idempotency, namespaced per operation).
 * Staff serializers (lib/admin-tickets.ts) surface internal notes only for roles with ticket:note.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { cleanMultiline } from '../lib/sanitize';
import { requireStaff } from './routes';
import {
  listStaffTickets, getStaffTicketDetail, staffReply, addInternalNote, changeStatus,
  type StaffTicketCtx,
} from '../lib/admin-tickets';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED'] as const;
const TICKET_CATEGORIES = ['GENERAL', 'PROJECT', 'BILLING', 'TECHNICAL', 'CARE_PLAN', 'OTHER'] as const;

// Extract + validate the staff Idempotency-Key; 400 (returns null) if missing/malformed.
function idempotencyKey(req: FastifyRequest, reply: FastifyReply): string | null {
  const raw = req.headers['idempotency-key'];
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key || !/^[A-Za-z0-9_-]{8,200}$/.test(key)) {
    reply.code(400).send({ ok: false, message: 'A valid Idempotency-Key header is required.' });
    return null;
  }
  return key;
}

export async function registerAdminTicketRoutes(app: FastifyInstance): Promise<void> {
  const ctxOf = (c: { session: { sub: string; role: StaffTicketCtx['role'] }; tenantId: string; staffName: string }): StaffTicketCtx =>
    ({ tenantId: c.tenantId, staffId: c.session.sub, staffName: c.staffName, role: c.session.role });

  // ── Queue: tenant-wide, filtered, keyset-paginated ──
  app.get('/admin/tickets', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:read');
    if (!ctx) return;
    const q = req.query as Record<string, string | undefined>;
    const statusParam = (q.status ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const badStatus = statusParam.find((s) => !TICKET_STATUSES.includes(s as never));
    if (badStatus) return reply.code(400).send({ ok: false, message: 'Invalid status filter.' });
    const category = q.category && TICKET_CATEGORIES.includes(q.category as never) ? (q.category as (typeof TICKET_CATEGORIES)[number]) : undefined;
    const limit = q.limit ? Number(q.limit) : undefined;
    const res = await listStaffTickets(prisma, ctxOf(ctx), {
      status: statusParam.length ? (statusParam as (typeof TICKET_STATUSES)[number][]) : undefined,
      category,
      clientOrgId: q.clientOrgId || undefined,
      projectId: q.projectId || undefined,
      cursor: q.cursor || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return reply.send({ ok: true, tickets: res.tickets, nextCursor: res.nextCursor });
  });

  // ── Detail: full conversation; internal notes only for ticket:note roles (enforced in the service query) ──
  app.get('/admin/tickets/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:read');
    if (!ctx) return;
    const ticket = await getStaffTicketDetail(prisma, ctxOf(ctx), (req.params as { id: string }).id);
    if (!ticket) return reply.code(404).send({ ok: false, message: 'Not found' });
    return reply.send({ ok: true, ticket });
  });

  // ── Client-visible reply (TEAM). Terminal ticket → 409 ticket_not_repliable. ──
  app.post('/admin/tickets/:id/replies', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:reply');
    if (!ctx) return;
    const key = idempotencyKey(req, reply);
    if (!key) return;
    const body = z.object({ body: z.string().trim().min(1).max(8000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false });
    const r = await staffReply(prisma, ctxOf(ctx), (req.params as { id: string }).id, { body: cleanMultiline(body.data.body, 8000), opaqueKey: key });
    if (r.ok === 'ticket_not_found') return reply.code(404).send({ ok: false, message: 'Not found' });
    if (r.ok === 'not_repliable') return reply.code(409).send({ ok: false, error: 'ticket_not_repliable', message: 'Reopen this ticket before replying.' });
    if (r.ok === 'conflict') return reply.code(409).send({ ok: false, error: 'idempotency_key_conflict', message: 'Idempotency-Key was already used with a different request.' });
    return reply.code(r.ok === 'created' ? 201 : 200).send({ ok: true, idempotentReplay: r.ok === 'replay', message: r.message });
  });

  // ── Internal note (TEAM, internal). Allowed on any status; zero client side effect. ──
  app.post('/admin/tickets/:id/notes', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:note');
    if (!ctx) return;
    const key = idempotencyKey(req, reply);
    if (!key) return;
    const body = z.object({ body: z.string().trim().min(1).max(8000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false });
    const r = await addInternalNote(prisma, ctxOf(ctx), (req.params as { id: string }).id, { body: cleanMultiline(body.data.body, 8000), opaqueKey: key });
    if (r.ok === 'ticket_not_found') return reply.code(404).send({ ok: false, message: 'Not found' });
    if (r.ok === 'conflict') return reply.code(409).send({ ok: false, error: 'idempotency_key_conflict', message: 'Idempotency-Key was already used with a different request.' });
    return reply.code(r.ok === 'created' ? 201 : 200).send({ ok: true, idempotentReplay: r.ok === 'replay', message: r.message });
  });

  // ── Status transition (expectedStatus compare-and-swap) ──
  app.patch('/admin/tickets/:id/status', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:status');
    if (!ctx) return;
    const body = z.object({ status: z.enum(TICKET_STATUSES), expectedStatus: z.enum(TICKET_STATUSES) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false });
    const r = await changeStatus(prisma, ctxOf(ctx), (req.params as { id: string }).id, body.data.status, body.data.expectedStatus);
    if (r.ok === 'ticket_not_found') return reply.code(404).send({ ok: false, message: 'Not found' });
    if (r.ok === 'invalid_transition') return reply.code(400).send({ ok: false, error: 'invalid_transition', message: `Cannot move ${body.data.expectedStatus} → ${body.data.status}.` });
    if (r.ok === 'conflict') return reply.code(409).send({ ok: false, error: 'ticket_status_conflict', currentStatus: r.current, message: 'Ticket status changed since you loaded it.' });
    return reply.send({ ok: true, status: r.status });
  });
}
