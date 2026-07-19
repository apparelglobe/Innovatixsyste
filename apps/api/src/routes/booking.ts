/**
 * Booking routes.
 *  • GET  /booking/slots?date=YYYY-MM-DD — free slots for a business date (native scheduler).
 *  • POST /booking/schedule            — book a free slot; saves a Meeting linked to the lead.
 *  • POST /booking/calcom-webhook      — legacy Cal.com booking webhook (HMAC-verified).
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { resolveTenantFromRequest } from '../tenant';
import { verifyCalcomSignature, handleCalcomWebhook } from '../booking/service';
import { listFreeSlots, scheduleNativeMeeting, SlotUnavailableError, LeadNotFoundError } from '../booking/native';
import { isValidDateStr } from '../booking/slots';
import { config } from '../config';

const scheduleSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  start: z.string().trim().datetime(), // ISO 8601 UTC
  name: z.string().trim().max(200).optional(),
  leadId: z.string().trim().max(120).optional(),
});

export async function registerBookingRoutes(app: FastifyInstance): Promise<void> {
  // Free slots for a given business date.
  app.get('/booking/slots', async (req: FastifyRequest, reply) => {
    const date = String((req.query as { date?: string }).date || '');
    if (!isValidDateStr(date)) return reply.code(400).send({ ok: false, error: 'invalid_date' });
    const tenant = await resolveTenantFromRequest(prisma, req.headers.host);
    const result = await listFreeSlots(prisma, tenant, date, new Date());
    return reply.code(200).send({ ok: true, ...result });
  });

  // Book a free slot.
  app.post('/booking/schedule', async (req: FastifyRequest, reply) => {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('application/json')) return reply.code(415).send({ ok: false, error: 'invalid' });
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: 'invalid' });

    const tenant = await resolveTenantFromRequest(prisma, req.headers.host);
    try {
      const meeting = await scheduleNativeMeeting(prisma, tenant, parsed.data);
      return reply.code(201).send({ ok: true, meeting });
    } catch (err) {
      if (err instanceof SlotUnavailableError) return reply.code(409).send({ ok: false, error: 'slot_unavailable' });
      if (err instanceof LeadNotFoundError) return reply.code(404).send({ ok: false, error: 'lead_not_found' });
      req.log.error({ err: err instanceof Error ? err.message : String(err) }, 'native booking failed');
      return reply.code(500).send({ ok: false, error: 'error' });
    }
  });

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
