// Payment webhook — the provider calls this when an invoice is paid. Public
// route, but the body is HMAC-verified (stub) / provider-signature-verified
// before anything mutates. Flipping an invoice to PAID is idempotent: a
// duplicate/replayed event is a no-op, so the client is never double-notified.
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { config } from '../config';
import { payments } from '../billing';
import { markInvoicePaid } from '../billing/mark-paid';
import { stripeGateway } from '../billing/gateway';
import { processProviderWebhook } from '../billing/process-webhook';

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

  // ── Stripe webhook (authoritative payment source of truth) ──
  // Raw-body Stripe-signature verification, then provider-agnostic processing:
  // replay-guarded, amount-checked, idempotent invoice settlement. Success
  // redirects are never trusted — only this verified event settles anything.
  app.post('/webhooks/stripe', async (req, reply) => {
    const raw = (req as unknown as { rawBody?: string }).rawBody ?? '';
    const signature = (req.headers['stripe-signature'] as string) || undefined;
    const gw = stripeGateway();

    const parsed = gw.verifyAndParseWebhook(raw, signature);
    if (!parsed.ok) {
      req.log.warn('stripe webhook: invalid signature');
      return reply.code(401).send({ ok: false });
    }
    try {
      const result = await processProviderWebhook(prisma, parsed, gw.name);
      return reply.send({ ok: true, result });
    } catch (err) {
      // Structured internal error log; 500 makes Stripe retry (idempotency-safe).
      req.log.error({ err: err instanceof Error ? err.message : String(err), eventId: parsed.eventId }, 'stripe webhook processing failed');
      return reply.code(500).send({ ok: false });
    }
  });
}
