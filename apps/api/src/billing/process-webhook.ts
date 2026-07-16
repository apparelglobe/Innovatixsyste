/**
 * Provider-agnostic webhook processing. The gateway has already verified the
 * signature and parsed the event; this decides what it means for our records:
 *
 *   1. Replay guard — a UNIQUE (provider, eventId) ledger row. A duplicate
 *      delivery is a fast no-op, so an invoice can never be transitioned twice by
 *      the same event.
 *   2. Amount integrity — a "succeeded" event whose amount/currency disagree with
 *      the server-side invoice is REJECTED (never marks paid); the payment row is
 *      recorded FAILED and an audit event is written.
 *   3. Idempotent settlement — the Payment row → PAID and the Invoice → PAID via
 *      the shared markInvoicePaid (which fans out audit + client/staff
 *      notifications + email exactly once).
 *
 * Success redirects are never trusted — only this path (driven by the verified
 * webhook) settles anything.
 */
import type { PrismaClient } from '@prisma/client';
import { markInvoicePaid } from './mark-paid';
import { notifyStaff } from '../notifications/service';
import { alert } from '../observability';
import { incr } from '../observability/metrics';
import type { ParsedWebhook } from './gateway';

export type ProcessResult =
  | 'paid' | 'already' | 'duplicate' | 'ignored'
  | 'failed_recorded' | 'canceled_recorded' | 'mismatch' | 'missing_invoice';

export async function processProviderWebhook(
  prisma: PrismaClient,
  parsed: ParsedWebhook,
  providerName: string,
): Promise<ProcessResult> {
  if (!parsed.ok || !parsed.kind || parsed.kind === 'ignored') return 'ignored';
  const eventId = parsed.eventId;
  if (!eventId) return 'ignored';

  // 1) Replay guard.
  try {
    await prisma.processedWebhookEvent.create({ data: { provider: providerName, providerEventId: eventId, type: parsed.kind } });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return 'duplicate';
    throw e;
  }

  const invoiceId = parsed.invoiceId ?? null;
  if (!invoiceId) return 'ignored';
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { project: { select: { clientOrgId: true } } } });
  if (!invoice) return 'missing_invoice';

  // Resolve the payment row this event refers to.
  let payment =
    (parsed.sessionId ? await prisma.payment.findFirst({ where: { checkoutSessionId: parsed.sessionId } }) : null) ??
    (parsed.paymentIntentId ? await prisma.payment.findFirst({ where: { paymentIntentId: parsed.paymentIntentId } }) : null) ??
    (await prisma.payment.findFirst({ where: { invoiceId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } }));

  // Tenant-ownership guard: if the event resolves to a Payment (via session/intent
  // id), it MUST belong to the same tenant as — and reference — the invoice named
  // in the event. This blocks a (multi-account) webhook whose session id points at
  // one tenant's payment from settling another tenant's invoice.
  if (payment && (payment.tenantId !== invoice.tenantId || payment.invoiceId !== invoiceId)) {
    await prisma.auditEvent.create({
      data: { tenantId: invoice.tenantId, entityType: 'Payment', entityId: payment.id, action: 'PAYMENT_TENANT_MISMATCH', actorType: 'SYSTEM', actorId: `webhook:${providerName}`, data: { eventInvoiceId: invoiceId, paymentInvoiceId: payment.invoiceId, paymentTenantId: payment.tenantId } },
    }).catch(() => undefined);
    return 'mismatch';
  }

  const auditFail = (action: string, reason: string) =>
    prisma.auditEvent.create({
      data: { tenantId: invoice.tenantId, entityType: 'Payment', entityId: payment?.id ?? invoiceId, action, actorType: 'SYSTEM', actorId: `webhook:${providerName}`, data: { reason, invoiceId } },
    }).catch(() => undefined);

  if (parsed.kind === 'failed') {
    const reason = parsed.failureReason ?? 'payment failed';
    if (payment) await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: reason, providerEventId: eventId, paymentIntentId: parsed.paymentIntentId ?? payment.paymentIntentId } });
    await auditFail('PAYMENT_FAILED', reason);
    incr('payments_total', { result: 'failed' });
    alert({ kind: 'payment.failed', level: 'warning', message: `Payment failed for invoice ${invoice.number}: ${reason}`, tenantId: invoice.tenantId, data: { invoiceId } });
    await notifyStaff(prisma, invoice.tenantId, { type: 'INVOICE_CREATED', title: `Payment failed for ${invoice.number}`, body: reason, projectId: invoice.projectId, linkPath: `/admin/projects/${invoice.projectId}`, email: false }).catch(() => undefined);
    return 'failed_recorded';
  }

  if (parsed.kind === 'canceled') {
    if (payment && payment.status === 'PENDING') await prisma.payment.update({ where: { id: payment.id }, data: { status: 'CANCELED', providerEventId: eventId } });
    return 'canceled_recorded';
  }

  // kind === 'succeeded' — amount integrity FIRST (server-side invoice is truth).
  if (parsed.amountCents != null && parsed.amountCents !== invoice.amountCents) {
    const reason = `amount mismatch: event=${parsed.amountCents} invoice=${invoice.amountCents}`;
    if (payment) await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: reason, providerEventId: eventId } });
    await auditFail('PAYMENT_AMOUNT_MISMATCH', reason);
    return 'mismatch';
  }
  if (parsed.currency != null && parsed.currency.toUpperCase() !== invoice.currency.toUpperCase()) {
    const reason = `currency mismatch: event=${parsed.currency} invoice=${invoice.currency}`;
    if (payment) await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: reason, providerEventId: eventId } });
    await auditFail('PAYMENT_CURRENCY_MISMATCH', reason);
    return 'mismatch';
  }

  // Create a Payment row on demand (e.g. a stub direct webhook with no prior
  // checkout) — amount comes from the invoice, never from the event.
  if (!payment) {
    payment = await prisma.payment.create({
      data: { tenantId: invoice.tenantId, clientOrgId: invoice.project.clientOrgId, invoiceId, provider: providerName, amountCents: invoice.amountCents, currency: invoice.currency, status: 'PENDING', checkoutSessionId: parsed.sessionId ?? null },
    });
  }
  if (payment.status !== 'PAID') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID', paidAt: new Date(), paymentIntentId: parsed.paymentIntentId ?? payment.paymentIntentId, providerEventId: eventId } });
  }

  const res = await markInvoicePaid(prisma, invoiceId, `webhook:${providerName}`);
  if (res === 'paid') incr('payments_total', { result: 'paid' });
  return res === 'paid' ? 'paid' : 'already';
}
