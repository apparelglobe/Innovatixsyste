/**
 * Storage factory + upload validation. Returns the configured adapter; the S3
 * adapter is a documented stub until prod credentials are wired (the interface
 * is stable, so callers don't change).
 */
import type { FileStorage } from './types';
import { LocalStorage } from './local';
import { ALLOWED_MIME } from './types';
import { config } from '../config';

class S3StorageStub implements FileStorage {
  readonly provider = 's3' as const;
  async put(): Promise<void> { throw new Error('S3 storage not configured — set STORAGE_PROVIDER=local for dev, or wire the S3/R2 adapter.'); }
  async getStream(): Promise<null> { return null; }
  async getSignedUrl(): Promise<string> { throw new Error('S3 storage not configured.'); }
  async delete(): Promise<void> { /* no-op */ }
}

let cached: FileStorage | null = null;
export function storage(): FileStorage {
  if (cached) return cached;
  cached = config.STORAGE_PROVIDER === 's3' ? new S3StorageStub() : new LocalStorage();
  return cached;
}

export function storageKey(tenantId: string, projectId: string, fileId: string, name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  return `${tenantId}/${projectId}/${fileId}-${safe}`;
}

export function validateUpload(mime: string, sizeBytes: number): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_MIME.has(mime)) return { ok: false, reason: 'unsupported_file_type' };
  if (sizeBytes > config.MAX_FILE_BYTES) return { ok: false, reason: 'file_too_large' };
  if (sizeBytes <= 0) return { ok: false, reason: 'empty_file' };
  return { ok: true };
}
