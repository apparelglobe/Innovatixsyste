/**
 * Agreement (contract) logic — in-house click-to-sign. On proposal accept an
 * agreement is generated from the proposal terms; the prospect reviews it on the
 * SAME secure link and signs by typing their name. We store legally-relevant
 * evidence: signer name/email/title, timestamp, a salted hash of the IP (never the
 * raw IP — Canon privacy rule), the user agent, and a SHA-256 of the exact text
 * signed. Single-sign is an atomic compare-and-set. Results are discriminated unions.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { hashProposalToken } from '../lib/proposal-links';
import { nextDocumentNumber } from '../lib/numbering';
import { notifyStaff } from '../notifications/service';
import { config } from '../config';
import { sendTransactionalEmail } from '../email/service';
import { agreementSignedEmail } from '../email/templates';
import { renderContractPdf, type ContractPdfInput } from './pdf';

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

/** The default services agreement, in plain language, filled from the proposal terms. */
export function defaultAgreementBody(p: {
  orgName: string; proposalNumber: string; title: string;
  totalCents: number; depositCents: number; depositPercent: number; currency: string;
}): string {
  return [
    `# Services Agreement`,
    ``,
    `**Between:** Innovatix Systems ("Innovatix") and ${p.orgName} ("Client").`,
    `**Proposal:** ${p.proposalNumber} — ${p.title}`,
    ``,
    `## 1. Scope of work`,
    `Innovatix will deliver the services and deliverables described in proposal ${p.proposalNumber}, which forms part of this agreement.`,
    ``,
    `## 2. Fees & payment`,
    `- Total project fee: ${money(p.totalCents, p.currency)}.`,
    `- An activation deposit of ${money(p.depositCents, p.currency)} (${p.depositPercent}%) is due to begin work.`,
    `- The remaining balance is invoiced in stages as milestones are delivered.`,
    ``,
    `## 3. Timeline`,
    `Work begins once the activation deposit is received. A detailed schedule is agreed at project kickoff.`,
    ``,
    `## 4. Ownership`,
    `On full payment, the custom deliverables and their intellectual property transfer to the Client.`,
    ``,
    `## 5. Confidentiality`,
    `Each party will keep the other's confidential information private.`,
    ``,
    `## 6. Changes`,
    `Changes to scope are handled by mutual written agreement and may adjust fees or timeline.`,
    ``,
    `## 7. Termination`,
    `Either party may end this agreement with written notice; the Client pays for work completed to date.`,
    ``,
    `## 8. Acceptance`,
    `By signing below, the Client agrees to this agreement and to the terms of proposal ${p.proposalNumber}.`,
  ].join('\n');
}

/** Create the agreement for an accepted proposal. Idempotent by proposalId. Call inside a $transaction. */
export async function createContractForProposal(tx: Prisma.TransactionClient, params: {
  tenantId: string; proposalId: string; leadId: string; proposalNumber: string;
  title: string; orgName: string; totalCents: number; depositCents: number; depositPercent: number; currency: string; now: Date;
}): Promise<void> {
  const existing = await tx.contract.findUnique({ where: { proposalId: params.proposalId } });
  if (existing) return;
  const number = await nextDocumentNumber(tx, params.tenantId, 'CONTRACT', 'AGR');
  const body = defaultAgreementBody({
    orgName: params.orgName, proposalNumber: params.proposalNumber, title: params.title,
    totalCents: params.totalCents, depositCents: params.depositCents, depositPercent: params.depositPercent, currency: params.currency,
  });
  await tx.contract.create({
    data: {
      tenantId: params.tenantId, proposalId: params.proposalId, leadId: params.leadId, number,
      title: `Services Agreement — ${params.title}`,
      bodyMarkdown: body, contentHash: sha256Hex(body),
      status: 'SENT', sentAt: params.now, provider: 'inhouse',
    },
  });
}

export type AgreementView =
  | { status: 'READY' | 'SIGNED'; contract: { number: string; title: string; bodyMarkdown: string; signedAt: Date | null }; signerEmail: string; orgName: string }
  | { status: 'NOT_ACCEPTED' | 'INVALID' };

/** Fetch the agreement for signing — gated on the proposal being accepted (via its secure token). */
export async function inspectAgreement(prisma: PrismaClient, token: string): Promise<AgreementView> {
  if (!token) return { status: 'INVALID' };
  const prop = await prisma.proposal.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: { contract: true, lead: { select: { email: true, company: true, firstName: true, lastName: true } } },
  });
  if (!prop) return { status: 'INVALID' };
  if (!prop.acceptedAt || !prop.contract) return { status: 'NOT_ACCEPTED' };
  const orgName = prop.lead.company || [prop.lead.firstName, prop.lead.lastName].filter(Boolean).join(' ') || 'your organization';
  return {
    status: prop.contract.status === 'SIGNED' ? 'SIGNED' : 'READY',
    contract: { number: prop.contract.number, title: prop.contract.title, bodyMarkdown: prop.contract.bodyMarkdown ?? '', signedAt: prop.contract.signedAt },
    signerEmail: prop.lead.email,
    orgName,
  };
}

export type SignResult =
  | { ok: true; number: string }
  | { ok: false; code: 'INVALID' | 'NOT_ACCEPTED' | 'ALREADY_SIGNED' };

/** In-house click-to-sign — atomic single-sign + evidence capture. */
export async function signAgreement(
  prisma: PrismaClient,
  token: string,
  input: { signerName: string; signerTitle?: string | null; ipHash?: string | null; userAgent?: string | null },
  now: Date = new Date(),
): Promise<SignResult> {
  if (!token) return { ok: false, code: 'INVALID' };
  const prop = await prisma.proposal.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: { contract: true, lead: { select: { email: true, company: true, firstName: true, lastName: true } } },
  });
  if (!prop) return { ok: false, code: 'INVALID' };
  if (!prop.acceptedAt || !prop.contract) return { ok: false, code: 'NOT_ACCEPTED' };
  if (prop.contract.status === 'SIGNED') return { ok: false, code: 'ALREADY_SIGNED' };

  const claim = await prisma.contract.updateMany({
    where: { id: prop.contract.id, status: { not: 'SIGNED' } },
    data: { status: 'SIGNED', signedAt: now },
  });
  if (claim.count === 0) return { ok: false, code: 'ALREADY_SIGNED' }; // lost the race

  await prisma.contractSignature.create({
    data: {
      tenantId: prop.tenantId, contractId: prop.contract.id, signerType: 'CLIENT',
      signerName: input.signerName, signerEmail: prop.lead.email, signerTitle: input.signerTitle ?? null,
      ipHash: input.ipHash ?? null, userAgent: input.userAgent ?? null, contentHash: prop.contract.contentHash, provider: 'inhouse',
    },
  });
  await prisma.leadActivity.create({ data: { tenantId: prop.tenantId, leadId: prop.leadId, type: 'CONTRACT_SIGNED', data: { contractId: prop.contract.id, number: prop.contract.number } } });
  await prisma.auditEvent.create({ data: { tenantId: prop.tenantId, entityType: 'Contract', entityId: prop.contract.id, action: 'CONTRACT_SIGNED', actorType: 'CLIENT', data: { number: prop.contract.number, signerName: input.signerName } } });
  await notifyStaff(prisma, prop.tenantId, { type: 'CONTRACT_SIGNED', title: `Agreement ${prop.contract.number} signed ✍️`, body: `${input.signerName} signed. Next: activation deposit.`, email: true }).catch(() => undefined);

  // Email the customer their signed copy — a secure link to view/download (PDF rendered on demand).
  try {
    const orgName = prop.lead.company || [prop.lead.firstName, prop.lead.lastName].filter(Boolean).join(' ') || 'your organization';
    const viewUrl = `${config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001'}/proposals/${token}/agreement`;
    await sendTransactionalEmail(prisma, {
      tenantId: prop.tenantId, type: 'NOTIFICATION', to: prop.lead.email, leadId: prop.leadId,
      built: agreementSignedEmail({ orgName, number: prop.contract.number, viewUrl, supportEmail: config.EMAIL_INTERNAL_TO }),
    });
  } catch { /* signature already recorded; the copy email is a courtesy */ }
  return { ok: true, number: prop.contract.number };
}

// ── Signed-agreement PDF (rendered on demand from stored data — never stored) ──
function toPdfInput(
  contract: { number: string; title: string; bodyMarkdown: string | null },
  signatures: { signerName: string; signerEmail: string; signerTitle: string | null; signedAt: Date | null; ipHash: string | null; contentHash: string | null }[],
  orgName: string,
  proposalNumber: string | null,
): ContractPdfInput {
  const sig = signatures[0];
  return {
    number: contract.number, title: contract.title, orgName, proposalNumber,
    bodyMarkdown: contract.bodyMarkdown ?? '',
    signature: sig ? { signerName: sig.signerName, signerEmail: sig.signerEmail, signerTitle: sig.signerTitle, signedAt: sig.signedAt, ipHash: sig.ipHash, contentHash: sig.contentHash } : null,
  };
}

/** Signed-agreement PDF for a prospect via their secure token (accepted proposals only). */
export async function agreementPdfByToken(prisma: PrismaClient, token: string): Promise<Buffer | null> {
  if (!token) return null;
  const prop = await prisma.proposal.findUnique({
    where: { tokenHash: hashProposalToken(token) },
    include: { contract: { include: { signatures: { orderBy: { signedAt: 'asc' } } } }, lead: { select: { company: true, firstName: true, lastName: true } } },
  });
  if (!prop || !prop.acceptedAt || !prop.contract) return null;
  const orgName = prop.lead.company || [prop.lead.firstName, prop.lead.lastName].filter(Boolean).join(' ') || 'Client';
  return renderContractPdf(toPdfInput(prop.contract, prop.contract.signatures, orgName, prop.number));
}

/** Signed-agreement PDF for staff by contract id (tenant-scoped). */
export async function agreementPdfByContractId(prisma: PrismaClient, tenantId: string, contractId: string): Promise<Buffer | null> {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId },
    include: { signatures: { orderBy: { signedAt: 'asc' } }, proposal: { select: { number: true, lead: { select: { company: true, firstName: true, lastName: true } } } } },
  });
  if (!contract) return null;
  const lead = contract.proposal.lead;
  const orgName = lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Client';
  return renderContractPdf(toPdfInput(contract, contract.signatures, orgName, contract.proposal.number));
}

