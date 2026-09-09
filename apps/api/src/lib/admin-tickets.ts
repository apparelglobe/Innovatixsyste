/**
 * Slice 4 — STAFF ticket service. Deliberately SEPARATE from the client `lib/tickets.ts` (no shared DTO):
 * staff serializers surface `internal`/`authorId`, the client ones never can. All reads are TENANT-scoped
 * (never org-scoped) — a cross-tenant id resolves to null → 404. Reuses the Slice 3 TicketMessage table +
 * idempotency columns + the exact `isRequestIdConflict` P2002-target check.
 *
 * Locked behaviour (Slice 4):
 *  • status via expectedStatus CAS (WHERE status=expectedStatus) → real compare-and-swap, AuditEvent in the
 *    same tx, written only on a successful (count===1) transition.
 *  • staff client-visible reply allowed only from a NON-TERMINAL status; the guarded flip → WAITING_ON_CLIENT
 *    IS the gate (count===0 ⇒ terminal ⇒ abort tx ⇒ 409 not_repliable). One tx: flip + TEAM message +
 *    active-recipient in-app Notifications + one deterministic TICKET_NOTIFY job PER active recipient.
 *  • internal note: TEAM internal=true; does NOT bump lastMessageAt; zero client Notification/job/email;
 *    allowed on RESOLVED/CLOSED; visible only to roles with `ticket:note` (VIEWER excluded at the query).
 *  • idempotency keys are NAMESPACED (`staff-reply:`/`staff-note:`) + hash is namespaced by `kind`, so staff
 *    reply, staff note, and Slice 3 client keys share the (ticketId, clientRequestId) scope without interfering.
 */
import { createHash } from 'node:crypto';
import type { PrismaClient, StaffRole, TicketCategory, TicketStatus } from '@prisma/client';
import { can } from '../staff/rbac';
import { isRequestIdConflict } from './tickets';

export type StaffTicketCtx = { tenantId: string; staffId: string; staffName: string | null; role: StaffRole };

const NON_TERMINAL: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CLIENT'];

// Allowed manual (staff) status transitions. Client auto-flips (WAITING_ON_CLIENT→OPEN on client reply,
// non-terminal→WAITING_ON_CLIENT on staff reply) are NOT driven through here.
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED'],
  WAITING_ON_CLIENT: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: ['OPEN', 'IN_PROGRESS'],
};
export const isAllowedTransition = (from: TicketStatus, to: TicketStatus): boolean => TRANSITIONS[from]?.includes(to) ?? false;

const sha256 = (obj: unknown) => createHash('sha256').update(JSON.stringify(obj)).digest('hex');
class NotRepliableError extends Error {}

// ── DTOs (staff — surface internal + authorId) ──────────────────────────────
export type StaffMessageDTO = { id: string; authorType: 'CLIENT' | 'TEAM'; authorId: string | null; authorName: string | null; internal: boolean; body: string; createdAt: Date };
export type StaffTicketDTO = { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; clientOrgId: string; projectId: string | null; createdByClientUserId: string; createdByName: string | null; lastMessageAt: Date; createdAt: Date; closedAt: Date | null };
export type StaffTicketListItem = { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; clientOrgId: string; clientOrgName: string; projectId: string | null; lastMessageAt: Date; createdAt: Date };

const toMsg = (m: { id: string; authorType: 'CLIENT' | 'TEAM'; authorId: string | null; authorName: string | null; internal: boolean; body: string; createdAt: Date }): StaffMessageDTO =>
  ({ id: m.id, authorType: m.authorType, authorId: m.authorId, authorName: m.authorName, internal: m.internal, body: m.body, createdAt: m.createdAt });
const toTicket = (t: { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; clientOrgId: string; projectId: string | null; createdByClientUserId: string; createdByName: string | null; lastMessageAt: Date; createdAt: Date; closedAt: Date | null }): StaffTicketDTO =>
  ({ id: t.id, number: t.number, subject: t.subject, category: t.category, status: t.status, clientOrgId: t.clientOrgId, projectId: t.projectId, createdByClientUserId: t.createdByClientUserId, createdByName: t.createdByName, lastMessageAt: t.lastMessageAt, createdAt: t.createdAt, closedAt: t.closedAt });

// ── Keyset cursor on (lastMessageAt desc, id desc) ──────────────────────────
const encodeCursor = (r: { lastMessageAt: Date; id: string }) => Buffer.from(`${r.lastMessageAt.toISOString()}|${r.id}`).toString('base64url');
function cursorPredicate(cursor: string): { OR: unknown[] } | Record<string, never> {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const sep = raw.lastIndexOf('|');
  if (sep < 0) return {};
  const ts = new Date(raw.slice(0, sep));
  const id = raw.slice(sep + 1);
  if (Number.isNaN(ts.getTime()) || !id) return {};
  // rows strictly AFTER (ts,id) in (lastMessageAt desc, id desc): the id tie-breaker is in BOTH the ORDER BY
  // and this predicate, so equal-lastMessageAt rows are neither duplicated nor skipped across pages.
  return { OR: [{ lastMessageAt: { lt: ts } }, { AND: [{ lastMessageAt: ts }, { id: { lt: id } }] }] };
}

export type ListFilters = { status?: TicketStatus[]; category?: TicketCategory; clientOrgId?: string; projectId?: string; cursor?: string; limit?: number };

export async function listStaffTickets(prisma: PrismaClient, ctx: StaffTicketCtx, f: ListFilters): Promise<{ tickets: StaffTicketListItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 100);
  const where: Record<string, unknown> = {
    tenantId: ctx.tenantId,
    // default queue EXCLUDES CLOSED (RESOLVED included); an explicit status filter overrides.
    ...(f.status && f.status.length ? { status: { in: f.status } } : { status: { not: 'CLOSED' } }),
    ...(f.category ? { category: f.category } : {}),
    ...(f.clientOrgId ? { clientOrgId: f.clientOrgId } : {}),
    ...(f.projectId ? { projectId: f.projectId } : {}),
    ...(f.cursor ? cursorPredicate(f.cursor) : {}),
  };
  const rows = await prisma.ticket.findMany({
    where,
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: { id: true, number: true, subject: true, category: true, status: true, clientOrgId: true, projectId: true, lastMessageAt: true, createdAt: true, clientOrg: { select: { name: true } } },
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    tickets: page.map((r) => ({ id: r.id, number: r.number, subject: r.subject, category: r.category, status: r.status, clientOrgId: r.clientOrgId, clientOrgName: r.clientOrg.name, projectId: r.projectId, lastMessageAt: r.lastMessageAt, createdAt: r.createdAt })),
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function getStaffTicketDetail(prisma: PrismaClient, ctx: StaffTicketCtx, ticketId: string): Promise<(StaffTicketDTO & { clientOrg: { id: string; name: string }; project: { id: string; name: string } | null; messages: StaffMessageDTO[] }) | null> {
  const canSeeInternal = can(ctx.role, 'ticket:note'); // VIEWER lacks ticket:note → internal filtered at the QUERY
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, tenantId: ctx.tenantId }, // tenant-scoped → cross-tenant = null = 404
    include: {
      clientOrg: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      messages: { where: canSeeInternal ? {} : { internal: false }, orderBy: { createdAt: 'asc' }, select: { id: true, authorType: true, authorId: true, authorName: true, internal: true, body: true, createdAt: true } },
    },
  });
  if (!ticket) return null;
  return { ...toTicket(ticket), clientOrg: ticket.clientOrg, project: ticket.project, messages: ticket.messages.map(toMsg) };
}

export type StaffWriteInput = { body: string; opaqueKey: string };
export type StaffReplyResult =
  | { ok: 'created' | 'replay'; message: StaffMessageDTO }
  | { ok: 'conflict' } | { ok: 'not_repliable' } | { ok: 'ticket_not_found' };
export type StaffNoteResult =
  | { ok: 'created' | 'replay'; message: StaffMessageDTO }
  | { ok: 'conflict' } | { ok: 'ticket_not_found' };

/** Client-visible staff reply — one tx: guarded non-terminal flip → WAITING_ON_CLIENT + lastMessageAt bump,
 *  TEAM message, active-recipient in-app rows, one deterministic TICKET_NOTIFY job per active recipient. */
export async function staffReply(prisma: PrismaClient, ctx: StaffTicketCtx, ticketId: string, input: StaffWriteInput): Promise<StaffReplyResult> {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId: ctx.tenantId } });
  if (!ticket) return { ok: 'ticket_not_found' };
  const clientRequestId = `staff-reply:${input.opaqueKey}`;
  const requestHash = sha256({ kind: 'staff_reply', body: input.body });

  const pre = await prisma.ticketMessage.findFirst({ where: { ticketId, clientRequestId } });
  if (pre) return pre.requestHash === requestHash ? { ok: 'replay', message: toMsg(pre) } : { ok: 'conflict' };

  try {
    const msg = await prisma.$transaction(async (tx) => {
      // The guarded flip IS the terminal-status gate: 0 rows ⇒ RESOLVED/CLOSED ⇒ abort ⇒ 409 not_repliable.
      const flip = await tx.ticket.updateMany({ where: { id: ticketId, tenantId: ctx.tenantId, status: { in: NON_TERMINAL } }, data: { status: 'WAITING_ON_CLIENT', lastMessageAt: new Date() } });
      if (flip.count === 0) throw new NotRepliableError();
      const created = await tx.ticketMessage.create({ data: { tenantId: ctx.tenantId, ticketId, authorType: 'TEAM', authorId: ctx.staffId, authorName: ctx.staffName, internal: false, body: input.body, clientRequestId, requestHash } });
      // Active client recipients ONLY (never deactivated/removed). One job per recipient → independent retry.
      const recipients = await tx.clientUser.findMany({ where: { tenantId: ctx.tenantId, clientOrgId: ticket.clientOrgId, active: true }, select: { id: true } });
      if (recipients.length) {
        await tx.notification.createMany({ data: recipients.map((u) => ({ tenantId: ctx.tenantId, recipientType: 'CLIENT' as const, recipientId: u.id, type: 'TICKET_MESSAGE' as const, title: `New reply on ${ticket.number}`, body: ticket.subject, linkPath: `/tickets/${ticketId}` })) });
        await tx.sideEffectJob.createMany({ data: recipients.map((u) => ({ tenantId: ctx.tenantId, type: 'TICKET_NOTIFY' as const, payload: { ticketId, messageId: created.id, direction: 'to_client', clientUserId: u.id }, idempotencyKey: `ticket-client-notify:${created.id}:${u.id}` })) });
      }
      return created;
    });
    return { ok: 'created', message: toMsg(msg) };
  } catch (err) {
    if (err instanceof NotRepliableError) return { ok: 'not_repliable' };
    if (isRequestIdConflict(err)) {
      const existing = await prisma.ticketMessage.findFirst({ where: { ticketId, clientRequestId } });
      if (existing) return existing.requestHash === requestHash ? { ok: 'replay', message: toMsg(existing) } : { ok: 'conflict' };
    }
    throw err; // job-key collision or any other error → surface (never a replay)
  }
}

/** Internal staff note — TEAM internal=true, allowed on ANY status; no lastMessageAt bump, zero client side effect. */
export async function addInternalNote(prisma: PrismaClient, ctx: StaffTicketCtx, ticketId: string, input: StaffWriteInput): Promise<StaffNoteResult> {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId: ctx.tenantId }, select: { id: true } });
  if (!ticket) return { ok: 'ticket_not_found' };
  const clientRequestId = `staff-note:${input.opaqueKey}`;
  const requestHash = sha256({ kind: 'staff_note', body: input.body });

  const pre = await prisma.ticketMessage.findFirst({ where: { ticketId, clientRequestId } });
  if (pre) return pre.requestHash === requestHash ? { ok: 'replay', message: toMsg(pre) } : { ok: 'conflict' };

  try {
    const msg = await prisma.ticketMessage.create({ data: { tenantId: ctx.tenantId, ticketId, authorType: 'TEAM', authorId: ctx.staffId, authorName: ctx.staffName, internal: true, body: input.body, clientRequestId, requestHash } });
    return { ok: 'created', message: toMsg(msg) };
  } catch (err) {
    if (isRequestIdConflict(err)) {
      const existing = await prisma.ticketMessage.findFirst({ where: { ticketId, clientRequestId } });
      if (existing) return existing.requestHash === requestHash ? { ok: 'replay', message: toMsg(existing) } : { ok: 'conflict' };
    }
    throw err;
  }
}

export type StatusResult = { ok: 'updated'; status: TicketStatus } | { ok: 'invalid_transition' } | { ok: 'conflict'; current: TicketStatus } | { ok: 'ticket_not_found' };

/** expectedStatus compare-and-swap. Guarded update + AuditEvent commit together; audit only on success. */
export async function changeStatus(prisma: PrismaClient, ctx: StaffTicketCtx, ticketId: string, status: TicketStatus, expectedStatus: TicketStatus): Promise<StatusResult> {
  if (!isAllowedTransition(expectedStatus, status)) return { ok: 'invalid_transition' };
  const closedAtPatch = status === 'CLOSED' ? { closedAt: new Date() } : expectedStatus === 'CLOSED' ? { closedAt: null } : {};
  const count = await prisma.$transaction(async (tx) => {
    const upd = await tx.ticket.updateMany({ where: { id: ticketId, tenantId: ctx.tenantId, status: expectedStatus }, data: { status, ...closedAtPatch } });
    if (upd.count === 1) {
      await tx.auditEvent.create({ data: { tenantId: ctx.tenantId, entityType: 'Ticket', entityId: ticketId, action: 'TICKET_STATUS_CHANGED', actorType: 'ADMIN', actorId: ctx.staffId, data: { from: expectedStatus, to: status } } });
    }
    return upd.count;
  });
  if (count === 1) return { ok: 'updated', status };
  const cur = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId: ctx.tenantId }, select: { status: true } });
  if (!cur) return { ok: 'ticket_not_found' };
  return { ok: 'conflict', current: cur.status };
}
