/**
 * Slice 5 — shared plumbing for ticket-attachment uploads, used by BOTH the client (portal) and staff
 * (admin) ticket routes so the multipart handling, input validation, and store→scan lifecycle are identical.
 *
 *  • parseTicketMessageBody: reads EITHER a JSON body (no file — backward compatible with Slice 3/4 clients
 *    and tests) OR a multipart body (text fields + at most ONE file, per the global files:1 limit). The bytes
 *    are buffered here; ownership is NEVER taken from the body — the route re-derives tenant/org/ticket from
 *    the trusted scoped ticket.
 *  • validateTicketUpload: reuses validateUpload (MIME allow-list + size + filename + magic-byte signature)
 *    and computes the SHA-256, returning the AttachmentInput whose identity is folded into the message hash.
 *  • storeAndScanTicketAttachment: stores the object under a scoped attachmentKey(), verifies it, flips the
 *    row to SCANNING, and hands off to scanTicketAttachment (inline for small/dev files; worker otherwise).
 *    On a storage/verify failure the row is marked REJECTED (fail-closed, never downloadable) and the object
 *    is best-effort deleted.
 */
import type { FastifyBaseLogger, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { storage, validateUpload, attachmentKey } from '../storage';
import { computeHash, scanTicketAttachment } from '../scanning/service';
import type { AttachmentInput } from './tickets';

export type UploadedFile = { filename: string; mimetype: string; buffer: Buffer };
export type ParsedMessageBody = { fields: Record<string, string>; file: UploadedFile | null };

type MultipartPart =
  | { type: 'file'; filename: string; mimetype: string; toBuffer: () => Promise<Buffer> }
  | { type: 'field'; fieldname: string; value: unknown };
type MultipartRequest = FastifyRequest & { isMultipart?: () => boolean; parts?: () => AsyncIterableIterator<MultipartPart> };

/** Parse a ticket message body as JSON (no file) or multipart (fields + optional single file). */
export async function parseTicketMessageBody(req: FastifyRequest): Promise<{ ok: true; parsed: ParsedMessageBody } | { ok: false; code: number; reason: string }> {
  const mr = req as MultipartRequest;
  if (!mr.isMultipart || !mr.isMultipart()) {
    // JSON (or empty) body — no attachment. req.body is the already-parsed object.
    const body = (req.body ?? {}) as Record<string, string>;
    return { ok: true, parsed: { fields: body, file: null } };
  }
  const fields: Record<string, string> = {};
  let file: UploadedFile | null = null;
  try {
    for await (const part of mr.parts!()) {
      if (part.type === 'file') {
        // The global files:1 limit prevents a second file; toBuffer() enforces the size cap (throws 413).
        const buffer = await part.toBuffer();
        file = { filename: part.filename, mimetype: part.mimetype, buffer };
      } else {
        fields[part.fieldname] = typeof part.value === 'string' ? part.value : String(part.value ?? '');
      }
    }
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'FST_REQ_FILE_TOO_LARGE') return { ok: false, code: 413, reason: 'file_too_large' };
    if (code === 'FST_FILES_LIMIT') return { ok: false, code: 400, reason: 'too_many_files' };
    return { ok: false, code: 400, reason: 'invalid_multipart' };
  }
  return { ok: true, parsed: { fields, file } };
}

/** Validate an uploaded file and compute its identity (fed into the message requestHash). */
export function validateTicketUpload(file: UploadedFile): { ok: true; input: AttachmentInput } | { ok: false; reason: string } {
  const v = validateUpload(file.mimetype, file.buffer.length, file.filename, file.buffer);
  if (!v.ok) return { ok: false, reason: v.reason };
  return { ok: true, input: { filename: file.filename, mimeType: file.mimetype, sizeBytes: file.buffer.length, fileHash: computeHash(file.buffer) } };
}

/**
 * Post-commit: store the bytes under a scoped key, verify, then scan. ALL ownership (tenant/org/ticket) is
 * read from the TRUSTED attachment row that createTicket/replyToTicket/staffReply/addInternalNote already
 * created — never from request input. A storage/verify failure fails closed (REJECTED, object cleaned up).
 */
export async function storeAndScanTicketAttachment(prisma: PrismaClient, attachmentId: string, buffer: Buffer, log?: FastifyBaseLogger): Promise<void> {
  const att = await prisma.ticketAttachment.findUnique({ where: { id: attachmentId } });
  if (!att) return;
  const key = attachmentKey({ tenantId: att.tenantId, clientOrgId: att.clientOrgId, ticketId: att.ticketId, attachmentId: att.id, filename: att.filename });
  try {
    await storage().put(key, buffer, att.mimeType ?? 'application/octet-stream');
    const head = await storage().head(key);
    if (!head.exists || (head.size != null && head.size !== buffer.length)) throw new Error('object_verify_failed');
  } catch (err) {
    await prisma.ticketAttachment.update({ where: { id: att.id }, data: { state: 'REJECTED' } }).catch(() => undefined);
    await storage().delete(key).catch(() => undefined);
    log?.error({ err: err instanceof Error ? err.message : String(err), attachmentId: att.id }, 'ticket attachment storage/verify failed');
    return;
  }
  const updated = await prisma.ticketAttachment.update({ where: { id: att.id }, data: { storageProvider: storage().provider, storageKey: key, state: 'SCANNING' } });
  await scanTicketAttachment(prisma, updated, buffer);
}
