// Payment webhook — the provider calls this when an invoice is paid. Public
// route, but the body is HMAC-verified (stub) / provider-signature-verified
// before anything mutates. Flipping an invoice to PAID is idempotent: a
// duplicate/replayed event is a no-op, so the client is never double-notified.
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { config } from '../config';
import { payments } from '../billing';
import { markInvoicePaid } from '../billing/mark-paid';

const SIG_HEADER = 'x-innovatix-signature';

export async function registerPaymentWebhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/payments', async (req, reply) => {
    const raw = (req as unknown as { rawBody?: string }).rawBody ?? '';
    const signature = (req.headers[SIG_HEADER] as string) || undefined;
    const provider = payments();

    if (!provider.verifyWebhook(raw, signature, config.PAYMENTS_WEBHOOK_SECRET)) {
      req.log.warn('payments webhook: invalid signature');
      return reply.code(401).send({ ok: false });
    }
    const event = provider.parseEvent(raw);
    if (event.type !== 'invoice.paid' || !event.invoiceId) {
      return reply.send({ ok: true, ignored: true }); // ack unknown events so the provider stops retrying
    }

    // markInvoicePaid is idempotent and never leaks invoice existence: unknown or
    // already-paid both ack so the provider stops retrying.
    const result = await markInvoicePaid(prisma, event.invoiceId, `webhook:${provider.name}`);
    return reply.send({ ok: true, result });
  });
}
