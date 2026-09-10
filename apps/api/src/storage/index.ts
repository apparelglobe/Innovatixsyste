/**
 * Storage factory + upload validation + object-key strategy.
 *
 * Object keys are deterministic-but-unguessable and fully scoped:
 *   tenant/{tenantId}/org/{clientOrgId}/project/{projectId}/file/{fileId}/v/{version}/{safeFilename}
 * The database — not the key — is the source of truth for ownership, visibility,
 * version, and authorization. A browser-supplied key is never trusted.
 */
import type { FileStorage } from './types';
import { LocalStorage } from './local';
import { S3CompatibleStorage } from './s3';
import { DEFAULT_ALLOWED_MIME, ARCHIVE_MIME, isDangerousFilename, contentMatchesDeclared } from './types';
import { config } from '../config';

let cached: FileStorage | null = null;
let override: FileStorage | null = null;
export function storage(): FileStorage {
  if (override) return override;
  if (cached) return cached;
  cached = config.STORAGE_PROVIDER === 's3' ? new S3CompatibleStorage() : new LocalStorage();
  return cached;
}
/** Test seams. */
export function __resetStorageCache(): void { cached = null; }
export function __setStorageForTest(s: FileStorage | null): void { override = s; }

/** Deterministic, fully-scoped object key. Never derived from client input. */
export function objectKey(args: { tenantId: string; clientOrgId: string; projectId: string; fileId: string; version: number; filename: string }): string {
  const safe = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.\.+/g, '.').slice(0, 100) || 'file';
  return `tenant/${args.tenantId}/org/${args.clientOrgId}/project/${args.projectId}/file/${args.fileId}/v/${args.version}/${safe}`;
}

/** Legacy key helper (kept for any old callers). Prefer objectKey(). */
export function storageKey(tenantId: string, projectId: string, fileId: string, name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  return `${tenantId}/${projectId}/${fileId}-${safe}`;
}

/** Slice 5 — deterministic, fully-scoped key for a ticket attachment. Project-less + version-less: keyed by
 *  tenant/org/ticket/attachment (the unique attachment id prevents collisions). Reuses objectKey()'s
 *  safeFilename sanitizer. Never derived from client input beyond the sanitized filename. */
export function attachmentKey(args: { tenantId: string; clientOrgId: string; ticketId: string; attachmentId: string; filename: string }): string {
  const safe = args.filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.\.+/g, '.').slice(0, 100) || 'file';
  return `tenant/${args.tenantId}/org/${args.clientOrgId}/ticket/${args.ticketId}/attachment/${args.attachmentId}/${safe}`;
}

function allowedMime(): Set<string> {
  return config.STORAGE_ALLOW_ARCHIVES ? new Set([...DEFAULT_ALLOWED_MIME, ...ARCHIVE_MIME]) : DEFAULT_ALLOWED_MIME;
}

/**
 * Validate an upload against the declared MIME, size, filename, and — when a
 * buffer is provided — the actual file signature. Never trusts the browser
 * Content-Type alone.
 */
export function validateUpload(mime: string, sizeBytes: number, filename?: string, data?: Buffer): { ok: true } | { ok: false; reason: string } {
  if (!allowedMime().has(mime)) return { ok: false, reason: 'unsupported_file_type' };
  if (sizeBytes > config.MAX_FILE_BYTES) return { ok: false, reason: 'file_too_large' };
  if (sizeBytes <= 0) return { ok: false, reason: 'empty_file' };
  if (filename) {
    const f = isDangerousFilename(filename);
    if (f.bad) return { ok: false, reason: f.reason };
  }
  if (data) {
    const c = contentMatchesDeclared(mime, data);
    if (!c.ok) return { ok: false, reason: c.reason };
  }
  return { ok: true };
}
