/**
 * Client-portal authentication. Client users log in with email + password
 * (bcrypt-hashed); a signed JWT is issued and stored in an httpOnly cookie.
 * Every portal query is scoped to the caller's tenant + client organization.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export const PORTAL_COOKIE = 'inx_portal';
const TTL_SECONDS = 7 * 24 * 60 * 60;

export type PortalSession = { sub: string; org: string; tenant: string; email: string };

export function signSession(s: PortalSession): string {
  return jwt.sign(s, config.PORTAL_JWT_SECRET, { expiresIn: TTL_SECONDS });
}

export function verifySession(token: string | undefined): PortalSession | null {
  if (!token) return null;
  try {
    const p = jwt.verify(token, config.PORTAL_JWT_SECRET) as PortalSession;
    if (!p.sub || !p.org || !p.tenant) return null;
    return p;
  } catch {
    return null;
  }
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export const PORTAL_COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: config.NODE_ENV === 'production',
  path: '/',
  maxAge: TTL_SECONDS,
};
