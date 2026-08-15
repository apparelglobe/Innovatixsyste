/**
 * Delivery-side (staff) proposal builder — /v1/admin/proposals + a lead-detail helper.
 * Staff assemble a proposal from a lead (line items pulled from the catalog or custom),
 * set the activation-deposit %, and SEND it — which issues a secure review link (the
 * ClientInvitation token pattern) and emails the prospect. Staff-auth + RBAC
 * ('proposal:view' | 'proposal:write') + tenant-scoped; sensitive writes are audited.
 * Money is integer cents throughout: amount = qty*unit; subtotal = Σ; deposit = round(total*pct/100).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { cleanText, cleanMultiline } from '../lib/sanitize';
import { requireStaff, audit } from './routes';
import { nextDocumentNumber } from '../lib/numbering';
import { generateProposalToken } from '../lib/proposal-links';
import { config } from '../config';
import { sendTransactionalEmail } from '../email/service';
import { proposalSentEmail } from '../email/templates';
import { agreementPdfByContractId } from '../contracts/service';

const lineItemSchema = z.object({
  servicePackageId: z.string().optional(),
  description: z.string().trim().min(1).max(300),
  quantity: z.number().int().min(1).max(100000).optional(),
  unitCents: z.number().int().min(0).max(100_000_000),
});

/** amount = qty*unit; subtotal = Σ amounts; total = subtotal; deposit = round(total * pct/100). Integer cents only. */
function computeTotals(items: { quantity: number; amountCents: number }[], depositPercent: number) {
  const subtotalCents = items.reduce((s, li) => s + li.amountCents, 0);
  const totalCents = subtotalCents;
  const depositCents = Math.round((totalCents * depositPercent) / 100);
  return { subtotalCents, totalCents, depositCents };
}

export async function registerProposalAdminRoutes(app: FastifyInstance): Promise<void> {
  // ── Lead detail (for the builder — the /admin/leads list omits most fields) ──
  app.get('/admin/leads/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const lead = await prisma.lead.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: {
        inquiries: { orderBy: { submittedAt: 'desc' }, take: 10 },
        proposals: { orderBy: { createdAt: 'desc' }, select: { id: true, number: true, status: true, totalCents: true, createdAt: true } },
      },
    });
    if (!lead) return reply.code(404).send({ ok: false });
    return reply.send({ ok: true, lead });
  });

  // ── Proposals ──
  app.get('/admin/proposals', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'proposal:view'); if (!ctx) return;
    const proposals = await prisma.proposal.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'desc' }, take: 100,
      include: {
        lead: { select: { email: true, firstName: true, lastName: true, company: true } },
        _count: { select: { lineItems: true } },
        contract: { select: { status: true } },
        invoices: { where: { kind: 'DEPOSIT' }, select: { status: true }, take: 1 },
      },
    });
    return reply.send({ ok: true, proposals: proposals.map((p) => ({
      id: p.id, number: p.number, title: p.title, status: p.status,
      activatedAt: p.activatedAt, contractStatus: p.contract?.status ?? null, depositStatus: p.invoices[0]?.status ?? null,
      totalCents: p.totalCents, depositCents: p.depositCents, currency: p.currency, items: p._count.lineItems,
      lead: { email: p.lead.email, name: [p.lead.firstName, p.lead.lastName].filter(Boolean).join(' ') || null, company: p.lead.company },
      sentAt: p.sentAt, viewedAt: p.viewedAt, acceptedAt: p.acceptedAt, createdAt: p.createdAt,
    })) });
  });

  app.post('/admin/proposals', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'proposal:write'); if (!ctx) return;
    const b = z.object({
      leadId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      notes: z.string().trim().max(5000).optional(),
      currency: z.string().trim().length(3).optional(),
      depositPercent: z.number().int().min(0).max(100).optional(),
      lineItems: z.array(lineItemSchema).min(1).max(50),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const lead = await prisma.lead.findFirst({ where: { id: b.data.leadId, tenantId: ctx.tenantId } });
    if (!lead) return reply.code(404).send({ ok: false, message: 'Lead not found.' });

    const depositPercent = b.data.depositPercent ?? 33; // Canon §5 default, configurable per proposal
    const items = b.data.lineItems.map((li, i) => {
      const quantity = li.quantity ?? 1;
      return {
        tenantId: ctx.tenantId,
        servicePackageId: li.servicePackageId ?? null,
        description: cleanText(li.description, 300),
        quantity, unitCents: li.unitCents, amountCents: quantity * li.unitCents, sortOrder: i,
      };
    });
    const { subtotalCents, totalCents, depositCents } = computeTotals(items, depositPercent);
    const currency = b.data.currency ? b.data.currency.toUpperCase() : 'USD';

    const proposal = await prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, ctx.tenantId, 'PROPOSAL', 'PROP');
      return tx.proposal.create({
        data: {
          tenantId: ctx.tenantId, leadId: lead.id, number,
          title: cleanText(b.data.title, 200),
          notes: b.data.notes ? cleanMultiline(b.data.notes, 5000) : null,
          currency, subtotalCents, totalCents, depositCents, depositPercent,
          status: 'DRAFT', createdByStaffUserId: ctx.session.sub,
          lineItems: { create: items },
        },
      });
    });
    await audit(ctx.tenantId, ctx.session.sub, 'Proposal', proposal.id, 'PROPOSAL_CREATED', { number: proposal.number, leadId: lead.id, totalCents });
    return reply.send({ ok: true, proposal: { id: proposal.id, number: proposal.number } });
  });

  app.get('/admin/proposals/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'proposal:view'); if (!ctx) return;
    const proposal = await prisma.proposal.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: {
        lineItems: { orderBy: { sortOrder: 'asc' } },
        lead: { select: { id: true, email: true, firstName: true, lastName: true, company: true, status: true } },
        contract: { select: { id: true, status: true } },
        invoices: { where: { kind: 'DEPOSIT' }, select: { number: true, status: true, paidAt: true }, take: 1 },
      },
    });
    if (!proposal) return reply.code(404).send({ ok: false });
    return reply.send({ ok: true, proposal });
  });

  // Edit only while a proposal is still open to editing (DRAFT or CHANGES_REQUESTED).
  app.patch('/admin/proposals/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'proposal:write'); if (!ctx) return;
    const existing = await prisma.proposal.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!existing) return reply.code(404).send({ ok: false });
    if (existing.status !== 'DRAFT' && existing.status !== 'CHANGES_REQUESTED') {
      return reply.code(409).send({ ok: false, message: 'Only a draft or change-requested proposal can be edited.' });
    }
    const b = z.object({
      title: z.string().trim().min(1).max(200).optional(),
      notes: z.string().trim().max(5000).nullable().optional(),
      currency: z.string().trim().length(3).optional(),
      depositPercent: z.number().int().min(0).max(100).optional(),
      lineItems: z.array(lineItemSchema).min(1).max(50).optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });

    const depositPercent = b.data.depositPercent ?? existing.depositPercent ?? 33;
    await prisma.$transaction(async (tx) => {
      let subtotalCents = existing.subtotalCents;
      let totalCents = existing.totalCents;
      if (b.data.lineItems) {
        await tx.proposalLineItem.deleteMany({ where: { proposalId: existing.id } });
        const items = b.data.lineItems.map((li, i) => {
          const quantity = li.quantity ?? 1;
          return {
            tenantId: ctx.tenantId, proposalId: existing.id,
            servicePackageId: li.servicePackageId ?? null,
            description: cleanText(li.description, 300),
            quantity, unitCents: li.unitCents, amountCents: quantity * li.unitCents, sortOrder: i,
          };
        });
        await tx.proposalLineItem.createMany({ data: items });
        ({ subtotalCents, totalCents } = computeTotals(items, depositPercent));
      }
      const depositCents = Math.round((totalCents * depositPercent) / 100);
      await tx.proposal.update({ where: { id: existing.id }, data: {
        ...(b.data.title ? { title: cleanText(b.data.title, 200) } : {}),
        ...(b.data.notes !== undefined ? { notes: b.data.notes ? cleanMultiline(b.data.notes, 5000) : null } : {}),
        ...(b.data.currency ? { currency: b.data.currency.toUpperCase() } : {}),
        subtotalCents, totalCents, depositCents, depositPercent,
      } });
    });
    await audit(ctx.tenantId, ctx.session.sub, 'Proposal', existing.id, 'PROPOSAL_UPDATED');
    return reply.send({ ok: true });
  });

  // Send — issue a fresh secure review link (rotates the token) + email the prospect.
  app.post('/admin/proposals/:id/send', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'proposal:write'); if (!ctx) return;
    const proposal = await prisma.proposal.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: { lead: { select: { id: true, email: true, company: true, firstName: true, lastName: true } } },
    });
    if (!proposal) return reply.code(404).send({ ok: false });
    if (proposal.status === 'ACCEPTED' || proposal.status === 'DECLINED') {
      return reply.code(409).send({ ok: false, message: 'This proposal is already closed.' });
    }
    const now = new Date();
    const { token, tokenHash } = generateProposalToken(); // raw token only leaves via the emailed link
    const expiresAt = new Date(now.getTime() + config.PORTAL_INVITE_TTL_HOURS * 3600_000);
    await prisma.proposal.update({ where: { id: proposal.id }, data: { tokenHash, expiresAt, status: 'SENT', sentAt: now, viewedAt: null } });

    // Lead → PROPOSAL_SENT + timeline + audit.
    await prisma.lead.updateMany({ where: { id: proposal.leadId, tenantId: ctx.tenantId }, data: { status: 'PROPOSAL_SENT' } });
    await prisma.leadActivity.create({ data: { tenantId: ctx.tenantId, leadId: proposal.leadId, type: 'PROPOSAL_SENT', data: { proposalId: proposal.id, number: proposal.number } } });
    await audit(ctx.tenantId, ctx.session.sub, 'Proposal', proposal.id, 'PROPOSAL_SENT', { number: proposal.number });

    // Email the prospect (inline; dev 'outbox' transport is a no-op recorder).
    const origin = config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001';
    const reviewUrl = `${origin}/proposals/${encodeURIComponent(token)}`;
    const orgName = proposal.lead.company || [proposal.lead.firstName, proposal.lead.lastName].filter(Boolean).join(' ') || 'your organization';
    try {
      await sendTransactionalEmail(prisma, {
        tenantId: ctx.tenantId, type: 'PROPOSAL_SENT', to: proposal.lead.email, leadId: proposal.leadId,
        built: proposalSentEmail({ orgName, reviewUrl, expiresAt, supportEmail: config.EMAIL_INTERNAL_TO }),
      });
    } catch (err) {
      req.log.error({ err: err instanceof Error ? err.message : String(err), proposalId: proposal.id }, 'proposal email send failed');
    }
    return reply.send({ ok: true, sentAt: now, expiresAt });
  });

  // ── Contract detail (staff — the agreement + signature evidence) ──
  app.get('/admin/contracts/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'proposal:view'); if (!ctx) return;
    const contract = await prisma.contract.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: { signatures: { orderBy: { signedAt: 'asc' } }, proposal: { select: { id: true, number: true, title: true } } },
    });
    if (!contract) return reply.code(404).send({ ok: false });
    return reply.send({ ok: true, contract });
  });

  // Download the signed-agreement PDF (staff).
  app.get('/admin/contracts/:id/pdf', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'proposal:view'); if (!ctx) return;
    const pdf = await agreementPdfByContractId(prisma, ctx.tenantId, (req.params as { id: string }).id);
    if (!pdf) return reply.code(404).send({ ok: false });
    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', 'inline; filename="agreement.pdf"');
    return reply.send(pdf);
  });
}
