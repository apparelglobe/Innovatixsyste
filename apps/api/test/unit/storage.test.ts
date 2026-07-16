/**
 * Storage — pure units: upload validation (MIME/size/filename/signature), the
 * object-key strategy, and the S3 SigV4 presign/sign logic (no network).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUpload, objectKey } from '../../src/storage';
import { isDangerousFilename, sniffFamily, contentMatchesDeclared } from '../../src/storage/types';
import { presignGetUrl, signRequest, uriEncode } from '../../src/storage/sigv4';
import { config } from '../../src/config';

const pdf = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const mz = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);
const EICAR = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

// ── Validation ───────────────────────────────────────────────────────────────
test('validateUpload accepts a real PDF and rejects unsupported / empty / oversized', () => {
  assert.equal(validateUpload('application/pdf', pdf.length, 'a.pdf', pdf).ok, true);
  assert.deepEqual(validateUpload('application/x-msdownload', 10, 'a.bin'), { ok: false, reason: 'unsupported_file_type' });
  assert.deepEqual(validateUpload('application/pdf', 0, 'a.pdf'), { ok: false, reason: 'empty_file' });
  assert.deepEqual(validateUpload('application/pdf', config.MAX_FILE_BYTES + 1, 'a.pdf'), { ok: false, reason: 'file_too_large' });
});

test('archives are blocked unless explicitly enabled', () => {
  // Default config: STORAGE_ALLOW_ARCHIVES=false.
  assert.equal(validateUpload('application/zip', 100, 'a.zip').ok, false);
});

test('dangerous + double-extension filenames are rejected', () => {
  assert.equal(isDangerousFilename('malware.exe').bad, true);
  assert.equal(isDangerousFilename('page.html').bad, true);
  assert.equal(isDangerousFilename('script.sh').bad, true);
  const dbl = isDangerousFilename('invoice.pdf.exe');
  assert.equal(dbl.bad, true);
  assert.match((dbl as { reason: string }).reason, /double_extension|blocked_extension/);
  assert.equal(isDangerousFilename('report.pdf').bad, false);
  assert.equal(isDangerousFilename('no-extension').bad, false);
});

test('content signature must match the declared MIME; executables are caught', () => {
  assert.equal(contentMatchesDeclared('application/pdf', pdf).ok, true);
  assert.deepEqual(contentMatchesDeclared('application/pdf', png), { ok: false, reason: 'content_mismatch:declared=application/pdf:actual=png' });
  assert.deepEqual(contentMatchesDeclared('application/pdf', mz), { ok: false, reason: 'executable_signature' });
  assert.equal(sniffFamily(mz), 'exec');
  assert.equal(sniffFamily(EICAR), null); // EICAR is text — caught by the scanner, not the sniffer
});

// ── Object key ───────────────────────────────────────────────────────────────
test('objectKey is deterministic, fully scoped, and sanitizes the filename', () => {
  const k = objectKey({ tenantId: 't1', clientOrgId: 'o1', projectId: 'p1', fileId: 'f1', version: 2, filename: 'Q3 Report (final).pdf' });
  assert.equal(k, 'tenant/t1/org/o1/project/p1/file/f1/v/2/Q3_Report__final_.pdf');
  // Deterministic.
  assert.equal(k, objectKey({ tenantId: 't1', clientOrgId: 'o1', projectId: 'p1', fileId: 'f1', version: 2, filename: 'Q3 Report (final).pdf' }));
  // Path-traversal is neutralized.
  assert.ok(!objectKey({ tenantId: 't1', clientOrgId: 'o1', projectId: 'p1', fileId: 'f1', version: 1, filename: '../../etc/passwd' }).includes('..'));
});

// ── SigV4 ────────────────────────────────────────────────────────────────────
const CREDS = { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'secretExampleKey', region: 'us-east-1' };
const fixedNow = new Date('2026-01-02T03:04:05Z');

test('presignGetUrl is deterministic and carries all required query params', () => {
  const url1 = presignGetUrl({ ...CREDS, host: 'bucket.s3.us-east-1.amazonaws.com', canonicalUri: '/tenant/t1/file.pdf', expiresSeconds: 300, now: fixedNow });
  const url2 = presignGetUrl({ ...CREDS, host: 'bucket.s3.us-east-1.amazonaws.com', canonicalUri: '/tenant/t1/file.pdf', expiresSeconds: 300, now: fixedNow });
  assert.equal(url1, url2, 'deterministic for a fixed clock');
  for (const p of ['X-Amz-Algorithm=AWS4-HMAC-SHA256', 'X-Amz-Credential=', 'X-Amz-Date=20260102T030405Z', 'X-Amz-Expires=300', 'X-Amz-SignedHeaders=host', 'X-Amz-Signature=']) {
    assert.ok(url1.includes(p), `missing ${p}`);
  }
});

test('presign signature is sensitive to key, secret, and expiry', () => {
  const base = { host: 'bucket.s3.us-east-1.amazonaws.com', expiresSeconds: 300, now: fixedNow };
  const sig = (u: string) => new URL(u).searchParams.get('X-Amz-Signature');
  const a = presignGetUrl({ ...CREDS, ...base, canonicalUri: '/a.pdf' });
  const b = presignGetUrl({ ...CREDS, ...base, canonicalUri: '/b.pdf' });
  const c = presignGetUrl({ ...CREDS, secretAccessKey: 'different', ...base, canonicalUri: '/a.pdf' });
  const d = presignGetUrl({ ...CREDS, ...base, expiresSeconds: 60, canonicalUri: '/a.pdf' });
  assert.notEqual(sig(a), sig(b), 'different object → different signature');
  assert.notEqual(sig(a), sig(c), 'different secret → different signature');
  assert.notEqual(sig(a), sig(d), 'different expiry → different signature');
});

test('signRequest returns a well-formed SigV4 Authorization header', () => {
  const h = signRequest({ ...CREDS, method: 'PUT', host: 'bucket.s3.us-east-1.amazonaws.com', canonicalUri: '/k', payloadHash: 'abc', now: fixedNow });
  assert.match(h.Authorization, /^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\/20260102\/us-east-1\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
  assert.equal(h['x-amz-content-sha256'], 'abc');
  assert.equal(h['x-amz-date'], '20260102T030405Z');
});

test('uriEncode preserves slashes when asked and always encodes spaces', () => {
  assert.equal(uriEncode('a b/c', false), 'a%20b/c');
  assert.equal(uriEncode('a b/c', true), 'a%20b%2Fc');
});
