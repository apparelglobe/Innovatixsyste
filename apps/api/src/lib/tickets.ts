/**
 * Slice 3 — client support ticket service. The single write path for tickets + replies, mirroring the
 * Slice 2 ownership philosophy: tenantId + clientOrgId always come from the trusted session context, an
 * optional projectId is VALIDATED to belong to that same tenant+org before it can be stored, and reads are
 * always org-scoped. PortalMessage is deliberately NOT reused (it is project-mandatory).
 *
 * Idempotency is DB-backed (not frontend debounce): the client supplies an Idempotency-Key
 * (`clientRequestId`) and we store a `requestHash` of the canonical payload.
 *   • create key is unique per ORG      (@@unique([clientOrgId, clientRequestId]))
 *   • reply key is unique per TICKET     (@@unique([ticketId, clientRequestId]))
 * Same key + same hash → replay (return the existing row). Same key + different hash → 409 conflict (never
 * a silent wrong result). Concurrency is resolved by the unique constraint: the loser catches P2002 and
 * refetches the winner. We only ever intentionally rely on the ticket/message clientRequestId constraint;
 * the SideEffectJob key is a pure DB backstop (a plain create — an unexpected collision aborts the tx as an
 * invariant failure, never swallowed, never misread as a replay).
 */
import { createHash } from 'node:crypto';
import type { MessageAuthorType, PrismaClient, TicketCategory, TicketStatus } from '@prisma/client';
import { nextDocumentNumber } from './numbering';
import { findClientOrgProject } from './scoped';
import { notifyStaff } from '../notifications/service';

export type TicketCtx = { tenantId: string; clientOrgId: string; actorId: string; actorName: string | null };

export type CreateTicketInput = { subject: string; category: TicketCategory; projectId: string | null; body: string; clientRequestId: string };
export type ReplyInput = { body: string; clientRequestId: string };

export type TicketDTO = { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; projectId: string | null; lastMessageAt: Date; createdAt: Date; closedAt: Date | null };
export type TicketMessageDTO = { id: string; authorType: MessageAuthorType; authorName: string | null; body: string; createdAt: Date };
export type TicketListItem = { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; projectId: string | null; lastMessageAt: Date; createdAt: Date };

export type CreateResult =
  | { ok: 'created'; ticket: TicketDTO }
  | { ok: 'replay'; ticket: TicketDTO }
  | { ok: 'conflict' }
  | { ok: 'project_not_found' };

export type ReplyResult =
  | { ok: 'created'; message: TicketMessageDTO }
  | { ok: 'replay'; message: TicketMessageDTO }
  | { ok: 'conflict' }
  | { ok: 'ticket_not_found' };

const sha256 = (obj: unknown) => createHash('sha256').update(JSON.stringify(obj)).digest('hex');
// Canonical payload hashes — fixed key order so identical retries match and any content change differs.
const hashCreate = (i: { subject: string; category: string; projectId: string | null; body: string }) =>
  sha256({ subject: i.subject, category: i.category, projectId: i.projectId ?? null, body: i.body });
const hashReply = (i: { body: string }) => sha256({ body: i.body });

/** True only for a P2002 whose target mentions `clientRequestId` — i.e. the create/reply idempotency
 *  constraint, NEVER the SideEffectJob idempotencyKey (which must surface as an invariant failure). */
function isRequestIdConflict(err: unknown): boolean {
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e.code !== 'P2002') return false;
  const t = e.meta?.target;
  const s = Array.isArray(t) ? t.join(',') : String(t ?? '');
  return s.includes('clientRequestId');
}

const toTicketDTO = (t: { id: string; number: string; subject: string; category: TicketCategory; status: TicketStatus; projectId: string | null; lastMessageAt: Date; createdAt: Date; closedAt: Date | null }): TicketDTO =>
  ({ id: t.id, number: t.number, subject: t.subject, category: t.category, status: t.status, projectId: t.projectId, lastMessageAt: t.lastMessageAt, createdAt: t.createdAt, closedAt: t.closedAt });
const toMessageDTO = (m: { id: string; authorType: MessageAuthorType; authorName: string | null; body: string; createdAt: Date }): TicketMessageDTO =>
  ({ id: m.id, authorType: m.authorType, authorName: m.authorName, body: m.body, createdAt: m.createdAt });

export async function createTicket(prisma: PrismaClient, ctx: TicketCtx, input: CreateTicketInput): Promise<CreateResult> {
  const projectId = input.projectId ?? null;
  const requestHash = hashCreate(input);
  const key = input.clientRequestId;

  // Fast-path replay/conflict without opening a tx.
  const pre = await prisma.ticket.findFirst({ where: { tenantId: ctx.tenantId, clientOrgId: ctx.clientOrgId, clientRequestId: key } });
  if (pre) return pre.requestHash === requestHash ? { ok: 'replay', ticket: toTicketDTO(pre) } : { ok: 'conflict' };

  // Validate the optional project link belongs to the caller's own tenant+org (no free triple).
  if (projectId && !(await findClientOrgProject(prisma, ctx.tenantId, ctx.clientOrgId, projectId))) {
    return { ok: 'project_not_found' };
  }

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, ctx.tenantId, 'TICKET', 'TKT', 6);
      const created = await tx.ticket.create({
        data: {
          tenantId: ctx.tenantId, clientOrgId: ctx.clientOrgId, projectId,
          number, subject: input.subject, category: input.category, status: 'OPEN',
          createdByClientUserId: ctx.actorId, createdByName: ctx.actorName,
          clientRequestId: key, requestHash, lastMessageAt: new Date(),
        },
      });
      const msg = await tx.ticketMessage.create({
        // First message: NO clientRequestId — the ticket's key covers the whole create atomically.
        data: { tenantId: ctx.tenantId, ticketId: created.id, authorType: 'CLIENT', authorId: ctx.actorId, authorName: ctx.actorName, body: input.body },
      });
      // Durable staff email — plain create; the deterministic key is a DB backstop, an unexpected
      // collision aborts this whole tx (invariant failure), it is never swallowed.
      await tx.sideEffectJob.create({
        data: { tenantId: ctx.tenantId, type: 'TICKET_NOTIFY', payload: { ticketId: created.id, messageId: msg.id, event: 'opened' }, idempotencyKey: `${msg.id}:TICKET_NOTIFY` },
      });
      return created;
    });
    // In-app inbox row for staff (best-effort, post-commit, email:false — the durable job owns the email).
    await notifyStaff(prisma, ctx.tenantId, { type: 'TICKET_MESSAGE', title: `New support ticket ${ticket.number}`, body: ticket.subject, linkPath: '/admin', email: false }).catch(() => undefined);
    return { ok: 'created', ticket: toTicketDTO(ticket) };
  } catch (err) {
    if (isRequestIdConflict(err)) {
      const existing = await prisma.ticket.findFirst({ where: { tenantId: ctx.tenantId, clientOrgId: ctx.clientOrgId, clientRequestId: key } });
      if (existing) return existing.requestHash === requestHash ? { ok: 'replay', ticket: toTicketDTO(existing) } : { ok: 'conflict' };
    }
    throw err; // job-key collision or any other error → surface (never a replay)
  }
}

export async function replyToTicket(prisma: PrismaClient, ctx: TicketCtx, ticketId: string, input: ReplyInput): Promise<ReplyResult> {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, tenantId: ctx.tenantId, clientOrgId: ctx.clientOrgId } });
  if (!ticket) return { ok: 'ticket_not_found' };
  const requestHash = hashReply(input);
  const key = input.clientRequestId;

  const pre = await prisma.ticketMessage.findFirst({ where: { ticketId, clientRequestId: key } });
  if (pre) return pre.requestHash === requestHash ? { ok: 'replay', message: toMessageDTO(pre) } : { ok: 'conflict' };

  try {
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.ticketMessage.create({
        data: { tenantId: ctx.tenantId, ticketId, authorType: 'CLIENT', authorId: ctx.actorId, authorName: ctx.actorName, body: input.body, clientRequestId: key, requestHash },
      });
      // A client reply on a WAITING_ON_CLIENT ticket flips it back to OPEN — guarded updateMany (not
      // read-modify-write), so it never races a concurrent staff status change.
      await tx.ticket.updateMany({ where: { id: ticketId, status: 'WAITING_ON_CLIENT' }, data: { status: 'OPEN' } });
      await tx.ticket.update({ where: { id: ticketId }, data: { lastMessageAt: new Date() } });
      await tx.sideEffectJob.create({
        data: { tenantId: ctx.tenantId, type: 'TICKET_NOTIFY', payload: { ticketId, messageId: msg.id, event: 'replied' }, idempotencyKey: `${msg.id}:TICKET_NOTIFY` },
      });
      return msg;
    });
    await notifyStaff(prisma, ctx.tenantId, { type: 'TICKET_MESSAGE', title: `New reply on ${ticket.number}`, body: ticket.subject, linkPath: '/admin', email: false }).catch(() => undefined);
    return { ok: 'created', message: toMessageDTO(message) };
  } catch (err) {
    if (isRequestIdConflict(err)) {
      const existing = await prisma.ticketMessage.findFirst({ where: { ticketId, clientRequestId: key } });
      if (existing) return existing.requestHash === requestHash ? { ok: 'replay', message: toMessageDTO(existing) } : { ok: 'conflict' };
    }
    throw err;
  }
}

export async function listTickets(prisma: PrismaClient, ctx: TicketCtx): Promise<TicketListItem[]> {
  return prisma.ticket.findMany({
    where: { tenantId: ctx.tenantId, clientOrgId: ctx.clientOrgId },
    orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
    select: { id: true, number: true, subject: true, category: true, status: true, projectId: true, lastMessageAt: true, createdAt: true },
  });
}

export async function getTicketDetail(prisma: PrismaClient, ctx: TicketCtx, ticketId: string): Promise<(TicketDTO & { messages: TicketMessageDTO[] }) | null> {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, tenantId: ctx.tenantId, clientOrgId: ctx.clientOrgId }, // org-scoped → foreign/missing = null (404)
    include: {
      // Client-visible thread ONLY: internal staff notes are never included in the client payload.
      messages: { where: { internal: false }, orderBy: { createdAt: 'asc' }, select: { id: true, authorType: true, authorName: true, body: true, createdAt: true } },
    },
  });
  if (!ticket) return null;
  return { ...toTicketDTO(ticket), messages: ticket.messages.map(toMessageDTO) };
}
