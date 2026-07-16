/**
 * POST /v1/leads — public lead intake.
 *
 * Security/privacy posture:
 *  • Strict zod schema + body-size limit (set on the Fastify instance).
 *  • DB-backed rate limit keyed by a SALTED HASH of the IP (raw IP never stored/logged).
 *  • Honeypot + heuristic spam scoring (inside the service).
 *  • GENERIC public responses — never reveal whether the email existed, whether it
 *    merged, the assignment, spam scoring, or provider/db errors.
 *  • Correlation id on every request for internal tracing; sensitive fields
 *    (project description, UA, gclid) are NOT logged.
 */
import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { prisma } from '../db';
import { resolveTenantFromRequest } from '../tenant';
import { hashAbuseIdentifier } from '../lib/crypto';
import { checkRateLimit } from '../lib/ratelimit';
import { leadRequestSchema } from '../leads/schema';
import { intakeLead } from '../leads/service';

const GENERIC_SUCCESS = {
  ok: true,
  message: 'Your request has been received. Our team will contact you shortly.',
};
const GENERIC_INVALID = { ok: false, message: 'We could not process your request. Please check your details and try again.' };
const GENERIC_RATE = { ok: false, message: 'Too many requests. Please try again in a little while.' };
const GENERIC_ERROR = { ok: false, message: 'Something went wrong. Please try again shortly.' };

export async function registerLeadRoutes(app: FastifyInstance): Promise<void> {
  app.post('/leads', async (req, reply) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || randomUUID();
    reply.header('x-correlation-id', correlationId);

    // Require JSON (CORS + JSON content-type triggers preflight → CSRF mitigation).
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json')) return reply.code(415).send(GENERIC_INVALID);

    const parsed = leadRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn({ correlationId, issueCount: parsed.error.issues.length }, 'lead validation failed');
      return reply.code(400).send(GENERIC_INVALID);
    }

    const tenant = await resolveTenantFromRequest(prisma, req.headers.host);

    // Rate limit on hashed identifier (never the raw IP).
    const hashedId = hashAbuseIdentifier(req.ip);
    const rl = await checkRateLimit(prisma, tenant.id, hashedId);
    if (rl.limited) {
      reply.header('retry-after', Math.ceil(rl.retryAfterMs / 1000));
      req.log.warn({ correlationId }, 'lead rate limited');
      return reply.code(429).send(GENERIC_RATE);
    }

    const input = {
      ...parsed.data,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 400),
    };

    try {
      const result = await intakeLead(prisma, tenant, input, { correlationId });
      // Non-revealing 202: identical shape for new / deduped / replayed / spam.
      return reply.code(202).send({ ...GENERIC_SUCCESS, reference: result.inquiryId });
    } catch (err) {
      req.log.error(
        { correlationId, err: err instanceof Error ? err.message : String(err) },
        'lead intake failed',
      );
      return reply.code(500).send(GENERIC_ERROR);
    }
  });
}
