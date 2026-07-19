/**
 * Public invitation endpoints (/v1/auth/invitations/*) — no session required.
 * The recipient of a one-time setup link uses these to inspect the invitation and
 * to set their own password.
 *
 * Logging: these two routes carry the raw token in the URL path, so their
 * per-route log level is raised to 'warn' — the framework's info-level
 * request/response lines (which include the URL) are suppressed, keeping the
 * token out of the logs while still surfacing genuine errors. Passwords arrive in
 * the JSON body, which is never logged.
 *
 * Abuse: both are rate-limited per client IP (hashed). No response ever reveals
 * whether an unrelated email or account exists — an unknown token is simply
 * "invalid".
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { resolveDefaultTenant } from '../tenant';
import { hashAbuseIdentifier } from '../lib/crypto';
import { checkRateLimit } from '../lib/ratelimit';
import { inspectInvitation, acceptInvitation } from '../invitations/service';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../lib/password';

const tokenParam = z.object({ token: z.string().min(1).max(512) });
const acceptBody = z.object({ password: z.string().min(1).max(PASSWORD_MAX_LENGTH) });

export async function registerInvitationRoutes(app: FastifyInstance): Promise<void> {
  // Inspect an invitation for the setup page.
  app.get('/auth/invitations/:token', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolveDefaultTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `invite-inspect:${hashAbuseIdentifier(req.ip)}`, new Date(), 30);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });

    const p = tokenParam.safeParse(req.params);
    if (!p.success) return reply.send({ ok: true, status: 'INVALID' });

    const r = await inspectInvitation(prisma, p.data.token);
    if (r.status === 'VALID') {
      return reply.send({ ok: true, status: 'VALID', orgName: r.orgName, email: r.email, expiresAt: r.expiresAt, passwordMinLength: PASSWORD_MIN_LENGTH });
    }
    return reply.send({ ok: true, status: r.status });
  });

  // Accept an invitation: set the account password. On success the client
  // redirects to /clientportal — no session is issued here.
  app.post('/auth/invitations/:token/accept', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolveDefaultTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `invite-accept:${hashAbuseIdentifier(req.ip)}`, new Date(), 10);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });

    const p = tokenParam.safeParse(req.params);
    const b = acceptBody.safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send({ ok: false, code: 'INVALID', message: 'Invalid request.' });

    const r = await acceptInvitation(prisma, p.data.token, b.data.password);
    if (r.ok) return reply.send({ ok: true, redirect: '/clientportal', existing: r.existing });

    switch (r.code) {
      case 'WEAK_PASSWORD':
        return reply.code(400).send({ ok: false, code: r.code, message: r.reason ?? `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` });
      case 'EXPIRED':
        return reply.code(410).send({ ok: false, code: r.code, message: 'This invitation has expired. Ask your Innovatix contact to resend it.' });
      case 'REVOKED':
        return reply.code(410).send({ ok: false, code: r.code, message: 'This invitation is no longer valid.' });
      case 'ALREADY_ACCEPTED':
        return reply.code(409).send({ ok: false, code: r.code, message: 'This invitation has already been used. Please sign in.' });
      case 'EMAIL_IN_OTHER_ORG':
        // Safe rejection — do not reveal the other organization. Staff are alerted via audit.
        return reply.code(409).send({ ok: false, code: 'CONFLICT', message: 'We could not complete setup. Please contact your Innovatix representative.' });
      default:
        return reply.code(404).send({ ok: false, code: 'INVALID', message: 'This invitation link is invalid.' });
    }
  });
}
