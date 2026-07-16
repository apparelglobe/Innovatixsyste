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
  /** Verify the stored object exists and report its size (drift/size-match check). */
  head(key: string): Promise<{ exists: boolean; size?: number }>;
  /** Read the full object bytes (used by the async scan worker). null if missing. */
  getBytes(key: string): Promise<Buffer | null>;
  /** Local: a readable stream of the bytes. S3: null (use signedUrl instead). */
  getStream(key: string): Promise<Readable | null>;
  /** S3: a short-lived signed URL. Local: null. */
  getSignedUrl(key: string, expiresSeconds: number): Promise<string | null>;
  delete(key: string): Promise<void>;
}

/** Non-archive allowed MIME types (deliberately conservative). */
export const DEFAULT_ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/csv', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/json',
]);
/** Archive types — only allowed when STORAGE_ALLOW_ARCHIVES is set. */
export const ARCHIVE_MIME = new Set<string>(['application/zip']);
/** Back-compat alias (superset used only for reference). */
export const ALLOWED_MIME = new Set<string>([...DEFAULT_ALLOWED_MIME, ...ARCHIVE_MIME]);

// Never accept these by filename extension — executables, scripts, and
// active-content types — regardless of declared MIME. Double-extension tricks
// (e.g. "invoice.pdf.exe") are caught because we test the FINAL extension.
export const DANGEROUS_EXTENSIONS = new Set<string>([
  'exe', 'dll', 'so', 'dylib', 'bin', 'com', 'scr', 'bat', 'cmd', 'msi', 'app',
  'sh', 'bash', 'zsh', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'mjs', 'cjs', 'jar',
  'py', 'rb', 'pl', 'php', 'phtml', 'html', 'htm', 'xhtml', 'svg', 'swf', 'jsp', 'asp', 'aspx',
]);

/** Reject dangerous / double-extension filenames. */
export function isDangerousFilename(name: string): { bad: true; reason: string } | { bad: false } {
  const clean = name.trim().toLowerCase();
  const parts = clean.split('.');
  if (parts.length < 2) return { bad: false }; // no extension — allowed
  const ext = parts[parts.length - 1];
  if (DANGEROUS_EXTENSIONS.has(ext)) return { bad: true, reason: `blocked_extension:${ext}` };
  // Double-extension trick: a dangerous extension hidden before the final one.
  for (let i = 1; i < parts.length - 1; i++) {
    if (DANGEROUS_EXTENSIONS.has(parts[i])) return { bad: true, reason: `double_extension:${parts[i]}` };
  }
  return { bad: false };
}

/** Best-effort content sniff by magic bytes → coarse family, or null if unknown/text. */
export function sniffFamily(data: Buffer): 'pdf' | 'png' | 'jpeg' | 'gif' | 'webp' | 'zip' | 'exec' | null {
  const b = data;
  if (b.length >= 2 && b[0] === 0x4d && b[1] === 0x5a) return 'exec'; // MZ
  if (b.length >= 4 && b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) return 'exec'; // ELF
  if (b.length >= 4 && ((b[0] === 0xfe && b[1] === 0xed && b[2] === 0xfa) || (b[0] === 0xcf && b[1] === 0xfa && b[2] === 0xed))) return 'exec';
  if (b.length >= 5 && b.toString('latin1', 0, 5) === '%PDF-') return 'pdf';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 6 && (b.toString('latin1', 0, 6) === 'GIF87a' || b.toString('latin1', 0, 6) === 'GIF89a')) return 'gif';
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05 || b[2] === 0x07)) return 'zip'; // PK (also OOXML)
  return null;
}

/** Families that MUST match their declared MIME when a magic signature is present. */
const STRICT_MIME_FAMILY: Record<string, ReturnType<typeof sniffFamily>> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/** Cross-check declared MIME against the actual file signature where practical. */
export function contentMatchesDeclared(mime: string, data: Buffer): { ok: true } | { ok: false; reason: string } {
  const fam = sniffFamily(data);
  if (fam === 'exec') return { ok: false, reason: 'executable_signature' };
  const expected = STRICT_MIME_FAMILY[mime];
  if (expected && fam && fam !== expected) return { ok: false, reason: `content_mismatch:declared=${mime}:actual=${fam}` };
  return { ok: true };
}

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
