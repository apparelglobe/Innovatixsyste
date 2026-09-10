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
import { can } from '../staff/rbac';
import { sendFileDownload } from '../lib/download';
import { findStaffDownloadableTicketAttachment } from '../lib/scoped';
import { parseTicketMessageBody, validateTicketUpload, storeAndScanTicketAttachment } from '../lib/ticket-attachments';
import type { AttachmentInput } from '../lib/tickets';
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

  // Parse the reply/note body as JSON (no file) or multipart (fields + optional single client/internal file).
  // Returns the validated { body, attachment } or a Fastify reply already sent (null).
  const parseWrite = async (req: FastifyRequest, reply: FastifyReply): Promise<{ body: string; attachment: AttachmentInput | null } | null> => {
    const parsed = await parseTicketMessageBody(req);
    if (!parsed.ok) { reply.code(parsed.code).send({ ok: false, reason: parsed.reason }); return null; }
    const body = z.object({ body: z.string().trim().min(1).max(8000) }).safeParse({ body: parsed.parsed.fields.body });
    if (!body.success) { reply.code(400).send({ ok: false }); return null; }
    let attachment: AttachmentInput | null = null;
    if (parsed.parsed.file) {
      const v = validateTicketUpload(parsed.parsed.file);
      if (!v.ok) { reply.code(400).send({ ok: false, message: 'file_rejected', reason: v.reason }); return null; }
      attachment = v.input;
      (req as unknown as { _fileBuffer?: Buffer })._fileBuffer = parsed.parsed.file.buffer; // handed to store+scan
    }
    return { body: cleanMultiline(body.data.body, 8000), attachment };
  };

  // ── Client-visible reply (TEAM). Terminal ticket → 409 ticket_not_repliable. Optional client-visible file. ──
  app.post('/admin/tickets/:id/replies', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:reply');
    if (!ctx) return;
    const key = idempotencyKey(req, reply);
    if (!key) return;
    const w = await parseWrite(req, reply);
    if (!w) return;
    const ticketId = (req.params as { id: string }).id;
    const r = await staffReply(prisma, ctxOf(ctx), ticketId, { body: w.body, opaqueKey: key, attachment: w.attachment });
    if (r.ok === 'ticket_not_found') return reply.code(404).send({ ok: false, message: 'Not found' });
    if (r.ok === 'not_repliable') return reply.code(409).send({ ok: false, error: 'ticket_not_repliable', message: 'Reopen this ticket before replying.' });
    if (r.ok === 'conflict') return reply.code(409).send({ ok: false, error: 'idempotency_key_conflict', message: 'Idempotency-Key was already used with a different request.' });
    if (r.ok === 'created' && r.attachment) await storeAndScanTicketAttachment(prisma, r.attachment.id, (req as unknown as { _fileBuffer: Buffer })._fileBuffer, req.log);
    return reply.code(r.ok === 'created' ? 201 : 200).send({ ok: true, idempotentReplay: r.ok === 'replay', message: r.message });
  });

  // ── Internal note (TEAM, internal). Allowed on any status; zero client side effect. Optional internal file. ──
  app.post('/admin/tickets/:id/notes', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:note');
    if (!ctx) return;
    const key = idempotencyKey(req, reply);
    if (!key) return;
    const w = await parseWrite(req, reply);
    if (!w) return;
    const r = await addInternalNote(prisma, ctxOf(ctx), (req.params as { id: string }).id, { body: w.body, opaqueKey: key, attachment: w.attachment });
    if (r.ok === 'ticket_not_found') return reply.code(404).send({ ok: false, message: 'Not found' });
    if (r.ok === 'conflict') return reply.code(409).send({ ok: false, error: 'idempotency_key_conflict', message: 'Idempotency-Key was already used with a different request.' });
    if (r.ok === 'created' && r.attachment) await storeAndScanTicketAttachment(prisma, r.attachment.id, (req as unknown as { _fileBuffer: Buffer })._fileBuffer, req.log);
    return reply.code(r.ok === 'created' ? 201 : 200).send({ ok: true, idempotentReplay: r.ok === 'replay', message: r.message });
  });

  // ── Staff attachment download — scan-clean, non-deleted, tenant+ticket scoped; VIEWER excluded from internal-note files. ──
  app.get('/admin/tickets/:id/attachments/:attachmentId/download', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:read');
    if (!ctx) return;
    const { id, attachmentId } = req.params as { id: string; attachmentId: string };
    const att = await findStaffDownloadableTicketAttachment(prisma, ctx.tenantId, id, attachmentId, can(ctx.session.role, 'ticket:note'));
    if (!att?.storageKey) return reply.code(404).send({ ok: false, message: 'Not found' });
    return sendFileDownload(reply, { storageKey: att.storageKey, mimeType: att.mimeType, name: att.filename });
  });

  // ── Staff scan status/evidence for a ticket attachment (diagnose SCANNING/QUARANTINED). Never client-facing.
  //    VIEWER excluded from internal-note attachments (same canSeeInternal gate as the thread). ──
  app.get('/admin/tickets/:id/attachments/:attachmentId/scan', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'ticket:read');
    if (!ctx) return;
    const { id, attachmentId } = req.params as { id: string; attachmentId: string };
    const canSeeInternal = can(ctx.session.role, 'ticket:note');
    const att = await prisma.ticketAttachment.findFirst({
      where: { id: attachmentId, ticketId: id, tenantId: ctx.tenantId, ...(canSeeInternal ? {} : { message: { internal: false } }) },
      select: { id: true, state: true, filename: true, sizeBytes: true, mimeType: true, fileHash: true },
    });
    if (!att) return reply.code(404).send({ ok: false, message: 'Not found' });
    const scan = await prisma.ticketAttachmentScan.findFirst({ where: { tenantId: ctx.tenantId, attachmentId: att.id }, orderBy: { createdAt: 'desc' } });
    return reply.send({
      ok: true,
      attachment: { id: att.id, state: att.state, filename: att.filename, sizeBytes: att.sizeBytes, mimeType: att.mimeType, fileHash: att.fileHash },
      scan: scan && {
        status: scan.status, result: scan.result, threatName: scan.threatName, provider: scan.provider, engine: scan.engine,
        attempts: scan.attempts, maxAttempts: scan.maxAttempts, retryCount: scan.retryCount, errorCode: scan.errorCode, lastError: scan.lastError,
        startedAt: scan.startedAt, completedAt: scan.completedAt, fileSizeBytes: scan.fileSizeBytes,
      },
    });
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
