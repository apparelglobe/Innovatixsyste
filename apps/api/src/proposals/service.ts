/**
 * Public (prospect-facing) proposal logic — the secure-link review, accept, and
 * request-changes flows. Mirrors the invitation service: lookup is ALWAYS by the
 * SHA-256 hash of the presented token; an unknown token is INVALID and reveals
 * nothing; acceptance is a single-use atomic compare-and-set. All results are
 * discriminated unions the route maps to HTTP status codes.
 *
 * Lead-side side effects (status + timeline) are written here so both the link
 * routes and any future revisions stay consistent. No project/notify-client work
 * yet — a client org/project doesn't exist until the deposit is paid (Canon §5).
 */
import type { PrismaClient } from '@prisma/client';
import { hashProposalToken, proposalLinkStatus } from '../lib/proposal-links';
import { notifyStaff } from '../notifications/service';
import { createContractForProposal } from '../contracts/service';
import { createDepositInvoiceForProposal } from '../deposits/service';

export type ProposalView = {
  number: string;
  title: string;
  notes: string | null;
  orgName: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  depositCents: number;
  depositPercent: number | null;
  lineItems: { description: string; quantity: number; unitCents: number; amountCents: number }[];
  expiresAt: Date | null;
};

export type InspectResult =
  | { status: 'VALID'; proposal: ProposalView }
  | { status: 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'INVALID' };

export type AcceptResult =
  | { ok: true; proposalId: string }
  | { ok: false; code: 'INVALID' | 'EXPIRED' | 'DECLINED' | 'ALREADY_ACCEPTED' };

export type ChangesResult =
  | { ok: true }
  | { ok: false; code: 'INVALID' | 'EXPIRED' | 'ACCEPTED' | 'DECLINED' };

function orgNameOf(lead: { company: string | null; firstName: string | null; lastName: string | null }): string {
  return lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'your organization';
}

/** Review a proposal by token. Marks VIEWED (once) on first valid open. */
export async function inspectProposal(prisma: PrismaClient, token: string, now: Date = new Date()): Promise<InspectResult> {
  if (!token) return { status: 'INVALID' };
  const prop = await prisma.proposal.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: {
      lineItems: { orderBy: { sortOrder: 'asc' } },
      lead: { select: { company: true, firstName: true, lastName: true } },
    },
  });
  if (!prop) return { status: 'INVALID' };
  const status = proposalLinkStatus(prop, now);
  if (status !== 'VALID') return { status };

  if (!prop.viewedAt) {
    await prisma.proposal.update({
      where: { id: prop.id },
      data: { viewedAt: now, status: prop.status === 'SENT' ? 'VIEWED' : prop.status },
    });
    await prisma.leadActivity.create({ data: { tenantId: prop.tenantId, leadId: prop.leadId, type: 'PROPOSAL_VIEWED', data: { proposalId: prop.id, number: prop.number } } });
  }

  return {
    status: 'VALID',
    proposal: {
      number: prop.number,
      title: prop.title,
      notes: prop.notes,
      orgName: orgNameOf(prop.lead),
      currency: prop.currency,
      subtotalCents: prop.subtotalCents,
      totalCents: prop.totalCents,
      depositCents: prop.depositCents,
      depositPercent: prop.depositPercent,
      lineItems: prop.lineItems.map((li) => ({ description: li.description, quantity: li.quantity, unitCents: li.unitCents, amountCents: li.amountCents })),
      expiresAt: prop.expiresAt,
    },
  };
}

/** Accept a proposal — single-use atomic claim. Flips the lead to WON. */
export async function acceptProposal(prisma: PrismaClient, token: string, now: Date = new Date()): Promise<AcceptResult> {
  if (!token) return { ok: false, code: 'INVALID' };
  const prop = await prisma.proposal.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: { lead: { select: { company: true, firstName: true, lastName: true } } },
  });
  if (!prop) return { ok: false, code: 'INVALID' };
  const status = proposalLinkStatus(prop, now);
  if (status === 'EXPIRED') return { ok: false, code: 'EXPIRED' };
  if (status === 'DECLINED') return { ok: false, code: 'DECLINED' };
  if (status === 'ACCEPTED') return { ok: false, code: 'ALREADY_ACCEPTED' };

  const claim = await prisma.proposal.updateMany({
    where: { id: prop.id, acceptedAt: null, declinedAt: null, expiresAt: { gt: now } },
    data: { acceptedAt: now, status: 'ACCEPTED' },
  });
  if (claim.count === 0) return { ok: false, code: 'ALREADY_ACCEPTED' }; // lost the race

  await prisma.lead.updateMany({ where: { id: prop.leadId, tenantId: prop.tenantId }, data: { status: 'WON' } });
  await prisma.leadActivity.create({ data: { tenantId: prop.tenantId, leadId: prop.leadId, type: 'PROPOSAL_ACCEPTED', data: { proposalId: prop.id, number: prop.number } } });
  await prisma.auditEvent.create({ data: { tenantId: prop.tenantId, entityType: 'Proposal', entityId: prop.id, action: 'PROPOSAL_ACCEPTED', actorType: 'CLIENT', data: { number: prop.number } } });
  await notifyStaff(prisma, prop.tenantId, { type: 'PROPOSAL_ACCEPTED', title: `Proposal ${prop.number} accepted 🎉`, body: 'Next: agreement + activation deposit.', email: true }).catch(() => undefined);

  // Generate the agreement + deposit invoice so the prospect can sign & pay on the same secure link (idempotent).
  try {
    const orgName = prop.lead.company || [prop.lead.firstName, prop.lead.lastName].filter(Boolean).join(' ') || 'your organization';
    await prisma.$transaction(async (tx) => {
      await createContractForProposal(tx, {
        tenantId: prop.tenantId, proposalId: prop.id, leadId: prop.leadId, proposalNumber: prop.number,
        title: prop.title, orgName, totalCents: prop.totalCents, depositCents: prop.depositCents,
        depositPercent: prop.depositPercent ?? 33, currency: prop.currency, now,
      });
      await createDepositInvoiceForProposal(tx, {
        tenantId: prop.tenantId, proposalId: prop.id, proposalNumber: prop.number,
        depositCents: prop.depositCents, currency: prop.currency, now,
      });
    });
  } catch { /* accept already succeeded; the agreement/deposit are generated lazily if this ever fails */ }
  return { ok: true, proposalId: prop.id };
}

/** Request changes — keeps the link live, records the note, flips lead to NEGOTIATION. */
export async function requestChanges(prisma: PrismaClient, token: string, note: string, now: Date = new Date()): Promise<ChangesResult> {
  if (!token) return { ok: false, code: 'INVALID' };
  const prop = await prisma.proposal.findUnique({ where: { tokenHash: hashProposalToken(token) } });
  if (!prop) return { ok: false, code: 'INVALID' };
  const status = proposalLinkStatus(prop, now);
  if (status !== 'VALID') return { ok: false, code: status };

  await prisma.proposal.update({ where: { id: prop.id }, data: { changeRequest: note, status: 'CHANGES_REQUESTED' } });
  await prisma.lead.updateMany({ where: { id: prop.leadId, tenantId: prop.tenantId }, data: { status: 'NEGOTIATION' } });
  await prisma.leadActivity.create({ data: { tenantId: prop.tenantId, leadId: prop.leadId, type: 'PROPOSAL_CHANGES_REQUESTED', data: { proposalId: prop.id } } });
  await prisma.auditEvent.create({ data: { tenantId: prop.tenantId, entityType: 'Proposal', entityId: prop.id, action: 'PROPOSAL_CHANGES_REQUESTED', actorType: 'CLIENT', data: { note } } });
  await notifyStaff(prisma, prop.tenantId, { type: 'CLIENT_MESSAGE', title: `Changes requested on proposal ${prop.number}`, body: note, email: true }).catch(() => undefined);
  return { ok: true };
}
