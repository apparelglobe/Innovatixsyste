/**
 * Object-storage abstraction for client-portal files. Dev uses a local adapter;
 * production uses an S3-compatible adapter (AWS S3 / Cloudflare R2). Files are
 * NEVER publicly accessible — downloads go through an authorized API endpoint
 * (local streams the bytes; S3 returns a short-lived signed URL).
 */
import type { Readable } from 'node:stream';

export interface FileStorage {
  readonly provider: 'local' | 's3';
  /** Store bytes under an opaque key (tenant/project-scoped path). */
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  /** Local: a readable stream of the bytes. S3: null (use signedUrl instead). */
  getStream(key: string): Promise<Readable | null>;
  /** S3: a short-lived signed URL. Local: null. */
  getSignedUrl(key: string, expiresSeconds: number): Promise<string | null>;
  delete(key: string): Promise<void>;
}

/** Allowed upload MIME types (deliberately conservative). */
export const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/csv', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/json',
]);

export type ScanResult = { clean: boolean; reason?: string };

// The EICAR anti-malware test string — the industry-standard harmless probe that
// every real scanner flags. We detect it so the scan-enforcement path is exercised
// end-to-end without shipping actual malware.
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

// Executable magic numbers we never accept as project files.
const EXECUTABLE_MAGIC: { sig: number[]; label: string }[] = [
  { sig: [0x4d, 0x5a], label: 'DOS/PE executable' }, // MZ
  { sig: [0x7f, 0x45, 0x4c, 0x46], label: 'ELF binary' }, // \x7FELF
  { sig: [0xfe, 0xed, 0xfa, 0xce], label: 'Mach-O binary' },
  { sig: [0xcf, 0xfa, 0xed, 0xfe], label: 'Mach-O 64 binary' },
];

/**
 * Malware-scan hook. Catches the EICAR test signature and executable magic bytes;
 * a production deployment swaps this for a real scanner (ClamAV, a scanning API,
 * or S3 + a Lambda trigger) behind the same signature — callers don't change.
 */
export async function scanFile(data: Buffer, _mime: string): Promise<ScanResult> {
  for (const { sig, label } of EXECUTABLE_MAGIC) {
    if (data.length >= sig.length && sig.every((b, i) => data[i] === b)) {
      return { clean: false, reason: `executable_blocked:${label}` };
    }
  }
  // EICAR sits within the first 128 bytes of the test file by spec.
  if (data.subarray(0, 128).toString('latin1').includes(EICAR)) {
    return { clean: false, reason: 'eicar_test_signature' };
  }
  return { clean: true };
}
