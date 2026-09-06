/**
 * Shared authorized-file download response — the single path both the client
 * (/portal/files/:id/download) and staff (/admin/files/:id/download) routes use to
 * serve stored bytes, so the byte-serving behaviour is identical for both.
 *
 *   • S3 / signed-URL provider → 302 redirect to a short-lived signed URL (unchanged;
 *     the remote object sets its own Content-Length).
 *   • Local / streaming provider → stream the bytes as an attachment WITH a deterministic
 *     `Content-Length` taken from the storage adapter's own head() (fs.stat for local, a HEAD
 *     request for remote — never a local-only assumption). A fixed length means the response
 *     is a determinate-size body instead of chunked transfer-encoding, which download-scanning
 *     proxies handle far more reliably.
 *
 * Authorization, auditing, storage-provider selection, and the file bytes are all UNCHANGED —
 * this only adds the length header. If the adapter can't report a size, it falls back to the
 * prior streamed/chunked behaviour (no regression).
 */
import type { FastifyReply } from 'fastify';
import { storage } from '../storage';
import { config } from '../config';

export async function sendFileDownload(
  reply: FastifyReply,
  file: { storageKey: string; mimeType: string | null; name: string },
) {
  const store = storage();

  // Signed-URL providers (S3/R2): redirect — behaviour unchanged, no Content-Length set by us.
  const signed = await store.getSignedUrl(file.storageKey, config.S3_SIGNED_URL_TTL_SECONDS);
  if (signed) return reply.redirect(signed);

  reply.header('content-type', file.mimeType || 'application/octet-stream');
  reply.header('content-disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);

  // Deterministic length for the streamed path: ask the adapter for the exact object size and set
  // Content-Length when known, so the response is not chunked. Unknown size → fall back to streaming.
  const { size } = await store.head(file.storageKey);
  if (typeof size === 'number' && Number.isFinite(size)) reply.header('content-length', String(size));

  return reply.send(await store.getStream(file.storageKey));
}
