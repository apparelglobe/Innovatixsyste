/**
 * Privacy helpers. We never persist or log a raw IP address — only a salted
 * SHA-256 hash used for abuse/rate-limiting, with a defined retention window.
 */
import { createHash } from 'node:crypto';
import { config } from '../config';

/** Salted, non-reversible identifier for rate limiting / abuse detection. */
export function hashAbuseIdentifier(raw: string): string {
  return createHash('sha256').update(`${config.ABUSE_HASH_SALT}:${raw}`).digest('hex');
}

/** Timing-safe-ish constant-time string compare for webhook signatures. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
