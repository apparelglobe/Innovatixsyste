/**
 * Activation-deposit logic. The deposit is the third and final activation gate
 * (Canon §5): a DEPOSIT invoice for the proposal's deposit amount, created when the
 * proposal is accepted, payable on the SAME secure link — but only once the
 * agreement is signed. A deposit precedes any client org/project, so its invoice +
 * payment carry no clientOrgId/projectId (backfilled at activation, next slice).
 * Checkout goes through the shared gateway (StubGateway in dev = no real Stripe).
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { hashProposalToken } from '../lib/proposal-links';
import { nextDocumentNumber } from '../lib/numbering';
import { checkoutGateway } from '../billing/gateway';
import { markInvoicePaid } from '../billing/mark-paid';
import { config } from '../config';

/** Create the deposit invoice for an accepted proposal. Idempotent by (proposal, kind=DEPOSIT). Call inside a $transaction. */
export async function createDepositInvoiceForProposal(tx: Prisma.TransactionClient, params: {
  tenantId: string; proposalId: string; proposalNumber: string; depositCents: number; currency: string; now: Date;
}): Promise<void> {
  const existing = await tx.invoice.findFirst({ where: { tenantId: params.tenantId, proposalId: params.proposalId, kind: 'DEPOSIT' } });
  if (existing) return;
  const number = await nextDocumentNumber(tx, params.tenantId, 'DEPOSIT_INVOICE', 'DEP');
  await tx.invoice.create({
    data: {
      tenantId: params.tenantId, proposalId: params.proposalId, kind: 'DEPOSIT',
      projectId: null, clientOrgId: null, // no org/project until activation
      number, amountCents: params.depositCents, currency: params.currency,
      status: 'SENT', issuedAt: params.now,
      lineItems: { create: [{ tenantId: params.tenantId, description: `Activation deposit — proposal ${params.proposalNumber}`, quantity: 1, unitCents: params.depositCents, amountCents: params.depositCents }] },
    },
  });
}

export type DepositStatus = { status: 'DUE' | 'PAID' | 'NOT_READY'; amountCents: number; currency: string; number: string; proposalNumber: string; totalCents: number } | { status: 'INVALID' };

/** Deposit state for the prospect's page: NOT_READY until the agreement is signed, then DUE, then PAID. */
export async function depositStatusByToken(prisma: PrismaClient, token: string): Promise<DepositStatus> {
  if (!token) return { status: 'INVALID' };
  const prop = await prisma.proposal.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: { contract: { select: { status: true } }, invoices: { where: { kind: 'DEPOSIT' }, take: 1 } },
  });
  if (!prop || !prop.acceptedAt) return { status: 'INVALID' };
  const inv = prop.invoices[0];
  if (!inv) return { status: 'INVALID' };
  const signed = prop.contract?.status === 'SIGNED';
  const status = inv.status === 'PAID' ? 'PAID' : signed ? 'DUE' : 'NOT_READY';
  return { status, amountCents: inv.amountCents, currency: inv.currency, number: inv.number, proposalNumber: prop.number, totalCents: prop.totalCents };
}

export type DepositCheckoutResult =
  | { ok: true; paid: true } // stub/dev: settled inline (no hosted page a prospect can reach)
  | { ok: true; paid: false; url: string } // real provider: redirect to hosted checkout
  | { ok: false; code: 'INVALID' | 'NOT_ACCEPTED' | 'NOT_SIGNED' | 'ALREADY_PAID' | 'ERROR' };

/** Open a checkout session for the deposit — gated on accepted + signed. Records a PENDING payment (no org yet). */
export async function startDepositCheckout(prisma: PrismaClient, token: string, portalOrigin: string): Promise<DepositCheckoutResult> {
  if (!token) return { ok: false, code: 'INVALID' };
  const prop = await prisma.proposal.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: { contract: { select: { status: true } }, invoices: { where: { kind: 'DEPOSIT' }, take: 1 }, lead: { select: { email: true } } },
  });
  if (!prop) return { ok: false, code: 'INVALID' };
  if (!prop.acceptedAt) return { ok: false, code: 'NOT_ACCEPTED' };
  if (prop.contract?.status !== 'SIGNED') return { ok: false, code: 'NOT_SIGNED' };
  const inv = prop.invoices[0];
  if (!inv) return { ok: false, code: 'ERROR' };
  if (inv.status === 'PAID') return { ok: false, code: 'ALREADY_PAID' };

  const gateway = checkoutGateway();
  let session;
  try {
    session = await gateway.createCheckoutSession({
      invoiceId: inv.id, tenantId: prop.tenantId, number: inv.number,
      amountCents: inv.amountCents, currency: inv.currency,
      portalOrigin, customerEmail: prop.lead.email, idempotencyKey: `deposit_${inv.id}`,
    });
  } catch {
    return { ok: false, code: 'ERROR' };
  }

  // Record the pending payment so the webhook can settle it — no clientOrgId yet (deposit precedes the org).
  const existing = await prisma.payment.findFirst({ where: { invoiceId: inv.id, checkoutSessionId: session.sessionId } });
  if (!existing) {
    await prisma.payment.create({
      data: {
        tenantId: prop.tenantId, clientOrgId: null, invoiceId: inv.id, provider: gateway.name,
        amountCents: inv.amountCents, currency: inv.currency, status: 'PENDING',
        checkoutSessionId: session.sessionId, providerCustomerId: session.providerCustomerId ?? null,
      },
    });
  }
  await prisma.invoice.update({ where: { id: inv.id }, data: { paymentUrl: session.url } });

  // The stub "hosted page" (/pay/:id) requires a portal login — which a not-yet-onboarded
  // prospect does not have. So in stub/dev mode, settle inline here: run the SAME paid
  // transition (+ activation) the real webhook would, keeping the Payment coherent.
  // Never in production, and never for a real provider (Stripe returns its hosted URL).
  if (gateway.name === 'stub' && config.NODE_ENV !== 'production') {
    await prisma.payment.updateMany({ where: { invoiceId: inv.id, status: 'PENDING' }, data: { status: 'PAID', paidAt: new Date() } });
    await markInvoicePaid(prisma, inv.id, 'deposit-demo');
    return { ok: true, paid: true };
  }
  return { ok: true, paid: false, url: session.url };
}
