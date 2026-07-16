/**
 * Delivery-side (staff) authentication — separate from client-portal auth.
 * Staff log in with email + password; a signed JWT carrying their role is stored
 * in an httpOnly cookie (`inx_staff`). Distinct cookie + secret namespace so a
 * client session can never be mistaken for a staff session.
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { StaffRole } from '@prisma/client';
import { config } from '../config';

export const STAFF_COOKIE = 'inx_staff';
const TTL_SECONDS = 7 * 24 * 60 * 60;

export type StaffSession = { sub: string; role: StaffRole; tenant: string; email: string };

export function signStaff(s: StaffSession): string {
  return jwt.sign(s, config.PORTAL_JWT_SECRET + ':staff', { expiresIn: TTL_SECONDS });
}

export function verifyStaff(token: string | undefined): StaffSession | null {
  if (!token) return null;
  try {
    const p = jwt.verify(token, config.PORTAL_JWT_SECRET + ':staff') as StaffSession;
    if (!p.sub || !p.role || !p.tenant) return null;
    return p;
  } catch {
    return null;
  }
}

export const verifyStaffPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const STAFF_COOKIE_OPTS = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: config.NODE_ENV === 'production',
  path: '/',
  maxAge: TTL_SECONDS,
};
