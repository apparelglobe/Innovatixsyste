/**
 * Client-invitation token primitives.
 *
 * Security model:
 *  • The raw token is 256 bits of CSPRNG entropy, base64url-encoded (URL-safe).
 *  • Only its SHA-256 hash is ever persisted (ClientInvitation.tokenHash). The
 *    raw token exists solely in-memory and inside the outgoing setup link — it is
 *    never stored in the DB invitation row and never written to logs.
 *  • Lookup is by hash equality on a UNIQUE index (a full-entropy random token
 *    makes timing attacks on the lookup irrelevant); `safeCompareHash` is provided
 *    for any in-memory hash comparison so we never `===` secrets directly.
 */
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

/** 256-bit URL-safe token + its stored SHA-256 hash. */
export function generateInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url'); // 32 bytes = 256 bits
  return { token, tokenHash: hashInvitationToken(token) };
}

/** SHA-256 hash (hex) of a raw token. Deterministic → used for the DB lookup. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Constant-time comparison of two hex hashes (defense in depth). */
export function safeCompareHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export type InvitationStatus = 'VALID' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

/** Derive the lifecycle status of an invitation row (single source of truth). */
export function invitationStatus(
  inv: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): InvitationStatus {
  if (inv.acceptedAt) return 'ACCEPTED';
  if (inv.revokedAt) return 'REVOKED';
  if (inv.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return 'VALID';
}
