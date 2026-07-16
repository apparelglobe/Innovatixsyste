/**
 * POST /v1/booking/calcom-webhook — Cal.com booking webhook.
 * Signature is verified (HMAC-SHA256 of the RAW body) BEFORE any record change.
 * Invalid/unsigned requests get a generic 401.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { prisma } from '../db';
import { resolveTenantFromRequest } from '../tenant';
import { verifyCalcomSignature, handleCalcomWebhook } from '../booking/service';
import { config } from '../config';

export async function registerBookingRoutes(app: FastifyInstance): Promise<void> {
  app.post('/booking/calcom-webhook', async (req: FastifyRequest, reply) => {
    const raw = (req as unknown as { rawBody?: string }).rawBody ?? '';
    const signature = (req.headers['x-cal-signature-256'] as string) || undefined;

    if (!verifyCalcomSignature(raw, signature, config.CALCOM_WEBHOOK_SECRET)) {
      req.log.warn('calcom webhook: invalid signature');
      return reply.code(401).send({ ok: false });
    }

    const tenant = await resolveTenantFromRequest(prisma, req.headers.host);
    try {
      const result = await handleCalcomWebhook(prisma, tenant, req.body as object);
      return reply.code(200).send({ ok: true, ...result });
    } catch (err) {
      req.log.error({ err: err instanceof Error ? err.message : String(err) }, 'calcom webhook failed');
      return reply.code(500).send({ ok: false });
    }
  });
}
