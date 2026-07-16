/**
 * Minimal AWS Signature Version 4 for S3-compatible object stores (AWS S3,
 * Cloudflare R2, MinIO). Implemented over node:crypto — no SDK — so tests stay
 * hermetic and the presign logic is verifiable against AWS's published vectors.
 *
 * Two entry points:
 *   • presignGetUrl  — query-string-signed GET URL (short-lived download link)
 *   • signRequest    — header-signed request (PUT / HEAD / DELETE object)
 */
import crypto from 'node:crypto';

const ALGO = 'AWS4-HMAC-SHA256';
const SERVICE = 's3';
export const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const sha256hex = (data: crypto.BinaryLike): string => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key: crypto.BinaryLike, data: string): Buffer => crypto.createHmac('sha256', key).update(data, 'utf8').digest();

/** RFC-3986 encoding as required by SigV4 (optionally preserving path slashes). */
export function uriEncode(str: string, encodeSlash = true): string {
  let out = '';
  for (const ch of Buffer.from(str, 'utf8')) {
    const c = String.fromCharCode(ch);
    if (/[A-Za-z0-9\-_.~]/.test(c)) out += c;
    else if (c === '/' && !encodeSlash) out += '/';
    else out += '%' + ch.toString(16).toUpperCase().padStart(2, '0');
  }
  return out;
}

function signingKey(secret: string, dateStamp: string, region: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

function stamps(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

export type SignCommon = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  host: string;
  /** Already-encoded canonical URI path, e.g. `/bucket/tenant/.../file.pdf`. */
  canonicalUri: string;
  now?: Date;
};

/** Presigned GET URL (download). `UNSIGNED-PAYLOAD` — the URL alone authorizes the read. */
export function presignGetUrl(opts: SignCommon & { protocol?: string; expiresSeconds: number }): string {
  const now = opts.now ?? new Date();
  const { amzDate, dateStamp } = stamps(now);
  const scope = `${dateStamp}/${opts.region}/${SERVICE}/aws4_request`;
  const query: Record<string, string> = {
    'X-Amz-Algorithm': ALGO,
    'X-Amz-Credential': `${opts.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(opts.expiresSeconds),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(query).sort().map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`).join('&');
  const canonicalHeaders = `host:${opts.host}\n`;
  const canonicalRequest = ['GET', opts.canonicalUri, canonicalQuery, canonicalHeaders, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = [ALGO, amzDate, scope, sha256hex(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(opts.secretAccessKey, dateStamp, opts.region), stringToSign).toString('hex');
  const proto = opts.protocol ?? 'https';
  return `${proto}://${opts.host}${opts.canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Header-signed request. Returns the headers to send (incl. Authorization). */
export function signRequest(opts: SignCommon & { method: 'PUT' | 'HEAD' | 'DELETE' | 'GET'; payloadHash: string; extraHeaders?: Record<string, string> }): Record<string, string> {
  const now = opts.now ?? new Date();
  const { amzDate, dateStamp } = stamps(now);
  const scope = `${dateStamp}/${opts.region}/${SERVICE}/aws4_request`;
  const headers: Record<string, string> = {
    host: opts.host,
    'x-amz-content-sha256': opts.payloadHash,
    'x-amz-date': amzDate,
    ...(opts.extraHeaders ?? {}),
  };
  const keys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const lower: Record<string, string> = {};
  for (const k of Object.keys(headers)) lower[k.toLowerCase()] = headers[k];
  const canonicalHeaders = keys.map((k) => `${k}:${lower[k].trim()}\n`).join('');
  const signedHeaders = keys.join(';');
  const canonicalRequest = [opts.method, opts.canonicalUri, '', canonicalHeaders, signedHeaders, opts.payloadHash].join('\n');
  const stringToSign = [ALGO, amzDate, scope, sha256hex(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(opts.secretAccessKey, dateStamp, opts.region), stringToSign).toString('hex');
  return {
    ...headers,
    Authorization: `${ALGO} Credential=${opts.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export const sha256 = sha256hex;
