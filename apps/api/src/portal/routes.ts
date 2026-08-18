/**
 * Client-portal API (/v1/portal/*). All data routes require a valid session and
 * are scoped to the caller's tenant + client organization — a client can never
 * read another client's projects. Login is rate-limited and returns a generic
 * error (never reveals whether the email exists).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { resolveDefaultTenant } from '../tenant';
import { hashAbuseIdentifier } from '../lib/crypto';
import { checkRateLimit } from '../lib/ratelimit';
import { normalizeEmail, cleanMultiline, cleanText } from '../lib/sanitize';
import { enrichApprovals } from '../lib/approvals';
import { isInvoiceOverdue } from '../lib/invoice-status';
import { MOMENT, MOMENT_MESSAGE, CURATED_MOMENT_TYPES } from '../lib/relationship-moments';
import { enrichInvoice } from '../lib/invoices';
import { renderInvoicePdfFrom } from '../billing';
import { markInvoicePaid } from '../billing/mark-paid';
import { config } from '../config';
import {
  PORTAL_COOKIE, PORTAL_COOKIE_OPTS, signSession, verifySession, verifyPassword,
} from './auth';
import { storage } from '../storage';
import { notifyStaff } from '../notifications/service';
import { requireClientPermission } from '../client/authz';
import { inviteClientUser } from '../admin/client-users';
import { checkoutGateway } from '../billing/gateway';
import { findClientOrgInvoice, findClientVisibleFile } from '../lib/scoped';
import { randomUUID } from 'node:crypto';

type Ctx = { session: NonNullable<ReturnType<typeof verifySession>> };

async function requireSession(req: FastifyRequest, reply: FastifyReply): Promise<Ctx | null> {
  const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.[PORTAL_COOKIE];
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined;
  const session = verifySession(cookie || bearer);
  if (!session) {
    reply.code(401).send({ ok: false, message: 'Not authenticated' });
    return null;
  }
  // Defense in depth: the token's tenant must match the resolved tenant.
  const tenant = await resolveDefaultTenant(prisma);
  if (session.tenant !== tenant.id) {
    reply.code(401).send({ ok: false, message: 'Not authenticated' });
    return null;
  }
  return { session };
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(200),
});

export async function registerPortalRoutes(app: FastifyInstance): Promise<void> {
  // ── Auth ──
  app.post('/portal/auth/login', async (req, reply) => {
    const tenant = await resolveDefaultTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `portal-login:${hashAbuseIdentifier(req.ip)}`, new Date(), 10);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, message: 'Invalid email or password.' });

    const normalizedEmail = normalizeEmail(parsed.data.email);
    const user = await prisma.clientUser.findUnique({
      where: { tenantId_normalizedEmail: { tenantId: tenant.id, normalizedEmail } },
      include: { clientOrg: true },
    });
    const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !ok) {
      return reply.code(401).send({ ok: false, message: 'Invalid email or password.' });
    }
    // Deactivated accounts cannot sign in. Only revealed AFTER a correct password
    // (a wrong password still returns the generic 401 above), so this never leaks
    // account existence/status to an attacker.
    if (!user.active) {
      return reply.code(403).send({ ok: false, message: 'This account has been deactivated. Please contact your account owner.' });
    }

    await prisma.clientUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signSession({ sub: user.id, org: user.clientOrgId, tenant: tenant.id, email: user.email });
    reply.setCookie(PORTAL_COOKIE, token, PORTAL_COOKIE_OPTS);
    return reply.send({
      ok: true,
      token,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
      org: { name: user.clientOrg.name },
    });
  });

  app.post('/portal/auth/logout', async (_req, reply) => {
    reply.clearCookie(PORTAL_COOKIE, { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/portal/me', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    const user = await prisma.clientUser.findFirst({
      where: { id: ctx.session.sub, clientOrgId: ctx.session.org, tenantId: ctx.session.tenant },
      include: { clientOrg: true },
    });
    if (!user) return reply.code(401).send({ ok: false });
    return reply.send({
      ok: true,
      user: { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
      org: { name: user.clientOrg.name },
    });
  });

  // ── Overview: the client's active project + summary ──
  app.get('/portal/overview', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    const { org, tenant } = ctx.session;

    const project = await prisma.project.findFirst({
      where: { tenantId: tenant, clientOrgId: org },
      orderBy: { updatedAt: 'desc' },
      include: {
        milestones: { orderBy: { sequence: 'asc' } },
        members: true,
        reports: { orderBy: { publishedAt: 'desc' }, take: 1 },
        approvals: { where: { status: 'PENDING' } },
        invoices: { where: { status: { in: ['SENT', 'OVERDUE'] } }, orderBy: { dueAt: 'asc' }, take: 1 },
        // S4: the CLIENT relationship timeline shows curated moments only (Canon allow-list) — never
        // raw system events. The full raw activity log stays on the admin project view.
        activities: { where: { type: { in: CURATED_MOMENT_TYPES } }, orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!project) return reply.send({ ok: true, project: null });

    const milestonesDone = project.milestones.filter((m) => m.status === 'DONE').length;
    const nextMilestone = project.milestones.find((m) => m.status !== 'DONE') ?? null;
    // The one payable invoice (oldest unpaid) — feeds the workspace "Pay invoice" next-action.
    // OVERDUE is computed here since the stored status isn't swept from a due date server-side.
    const inv = project.invoices[0] ?? null;
    const payableInvoice = inv ? { id: inv.id, number: inv.number, amountCents: inv.amountCents, overdue: isInvoiceOverdue(inv) } : null;

    return reply.send({
      ok: true,
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        percentComplete: project.percentComplete,
        dueDate: project.dueDate,
        nextUpdateAt: project.nextUpdateAt,
        nextUpdateNote: project.nextUpdateNote,
        milestonesDone,
        milestonesTotal: project.milestones.length,
        openApprovals: project.approvals.length,
        pendingApproval: project.approvals[0] && { id: project.approvals[0].id, subject: project.approvals[0].subject, type: project.approvals[0].type },
        payableInvoice,
        nextMilestone: nextMilestone && { name: nextMilestone.name, dueDate: nextMilestone.dueDate },
        milestones: project.milestones.map((m) => ({ id: m.id, name: m.name, status: m.status, dueDate: m.dueDate })),
        latestReport: project.reports[0] && {
          title: project.reports[0].title, kind: project.reports[0].kind,
          summary: project.reports[0].summary, publishedAt: project.reports[0].publishedAt,
        },
        activities: project.activities.map((a) => ({ type: a.type, message: a.message, createdAt: a.createdAt })),
        team: project.members.map((m) => ({ name: m.name, role: m.role })),
      },
    });
  });

  // ── Project detail (scoped) ──
  app.get('/portal/projects/:id', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    const id = (req.params as { id: string }).id;
    const project = await prisma.project.findFirst({
      where: { id, tenantId: ctx.session.tenant, clientOrgId: ctx.session.org }, // scope enforced
      include: {
        milestones: { orderBy: { sequence: 'asc' } },
        reports: { orderBy: { publishedAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        files: { where: { clientVisible: true, deletedAt: null, isCurrent: true, state: 'AVAILABLE' }, orderBy: { uploadedAt: 'desc' } },
        members: true,
        messages: { where: { internal: false }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!project) return reply.code(404).send({ ok: false, message: 'Not found' });
    return reply.send({ ok: true, project: { ...project, approvals: await enrichApprovals(prisma, project.approvals) } });
  });

  // ── The caller's active project (full detail) — no id needed ──
  app.get('/portal/project', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    const project = await prisma.project.findFirst({
      where: { tenantId: ctx.session.tenant, clientOrgId: ctx.session.org },
      orderBy: { updatedAt: 'desc' },
      include: {
        milestones: { orderBy: { sequence: 'asc' } },
        reports: { orderBy: { publishedAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        files: { where: { clientVisible: true, deletedAt: null, isCurrent: true, state: 'AVAILABLE' }, orderBy: { uploadedAt: 'desc' } },
        members: true,
        messages: { where: { internal: false }, orderBy: { createdAt: 'asc' } },
      },
    });
    return reply.send({ ok: true, project: project ? { ...project, approvals: await enrichApprovals(prisma, project.approvals), invoices: project.invoices.map((i) => ({ ...i, overdue: isInvoiceOverdue(i) })) } : null });
  });

  // ── Send a message to the delivery team (client → team) ──
  app.post('/portal/messages', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'message:send'))) return;
    const body = z.object({ body: z.string().trim().min(1).max(4000) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false });

    const project = await prisma.project.findFirst({
      where: { tenantId: ctx.session.tenant, clientOrgId: ctx.session.org },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    if (!project) return reply.code(404).send({ ok: false });

    const message = await prisma.portalMessage.create({
      data: { tenantId: ctx.session.tenant, projectId: project.id, authorType: 'CLIENT', authorUserId: ctx.session.sub, body: cleanMultiline(body.data.body, 4000) },
    });
    await prisma.portalActivity.create({
      data: { tenantId: ctx.session.tenant, projectId: project.id, type: 'MESSAGE', message: 'You sent a message to the delivery team' },
    });
    await notifyStaff(prisma, ctx.session.tenant, { type: 'CLIENT_MESSAGE', title: 'New client message', body: 'A client replied on their project.', projectId: project.id, linkPath: `/admin/projects/${project.id}`, email: true });
    return reply.send({ ok: true, message: { id: message.id, authorType: message.authorType, body: message.body, createdAt: message.createdAt } });
  });

  // ── Invoice detail (client) — scoped, line items + billing contact, no internal fields ──
  app.get('/portal/invoices/:id', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    const inv = await findClientOrgInvoice(prisma, ctx.session.tenant, ctx.session.org, (req.params as { id: string }).id, { lineItems: { orderBy: { createdAt: 'asc' } } });
    if (!inv) return reply.code(404).send({ ok: false });
    return reply.send({ ok: true, invoice: { ...(await enrichInvoice(inv)), overdue: isInvoiceOverdue(inv) } });
  });

  // ── Invoice PDF (client) — scoped, rendered on demand, DRAFT never exposed ──
  app.get('/portal/invoices/:id/pdf', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    const inv = await prisma.invoice.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.session.tenant, status: { not: 'DRAFT' }, project: { clientOrgId: ctx.session.org } },
      include: { lineItems: { orderBy: { createdAt: 'asc' } }, project: { select: { clientOrg: { select: { name: true } } } } },
    });
    if (!inv) return reply.code(404).send({ ok: false });
    const pdf = renderInvoicePdfFrom(await enrichInvoice(inv), inv.project?.clientOrg.name ?? '');
    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="${inv.number}.pdf"`);
    return reply.send(pdf);
  });

  // ── Demo payment (stub provider, non-prod only) — simulates the provider's
  //    paid callback so the /pay page can complete the loop without Stripe. ──
  app.post('/portal/invoices/:id/pay-demo', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (config.NODE_ENV === 'production' || config.PAYMENTS_PROVIDER !== 'stub') {
      return reply.code(404).send({ ok: false });
    }
    if (!(await requireClientPermission(reply, ctx.session, 'invoice:pay'))) return;
    // Scope: the invoice must belong to the caller's org and not be a draft.
    const inv = await prisma.invoice.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.session.tenant, status: { not: 'DRAFT' }, project: { clientOrgId: ctx.session.org } },
      select: { id: true },
    });
    if (!inv) return reply.code(404).send({ ok: false });
    const result = await markInvoicePaid(prisma, inv.id, 'demo-pay');
    // Keep the Payment record coherent in the stub loop (mirrors the webhook path).
    await prisma.payment.updateMany({ where: { invoiceId: inv.id, status: 'PENDING' }, data: { status: 'PAID', paidAt: new Date() } });
    return reply.send({ ok: true, result });
  });

  // ── Create a payment checkout session (OWNER only) — provider-agnostic. ──
  //    Amount + currency come from the server-side invoice; NOTHING authoritative
  //    is taken from the request body. The webhook (not the redirect) settles it.
  app.post('/portal/invoices/:id/checkout', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'invoice:pay'))) return;

    // Confirm the invoice belongs to the authenticated org.
    const inv = await prisma.invoice.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.session.tenant, project: { clientOrgId: ctx.session.org } },
    });
    if (!inv) return reply.code(404).send({ ok: false });
    // Confirm it is payable and not already paid.
    if (inv.status === 'PAID') return reply.code(409).send({ ok: false, message: 'This invoice is already paid.' });
    if (inv.status === 'VOIDED') return reply.code(409).send({ ok: false, message: 'This invoice was voided.' });
    if (inv.status === 'DRAFT') return reply.code(409).send({ ok: false, message: 'This invoice is not payable yet.' });
    if (inv.amountCents <= 0) return reply.code(409).send({ ok: false, message: 'This invoice has no payable amount.' });

    // Billing-contact email → else the acting owner's email.
    let customerEmail: string | null = ctx.session.email ?? null;
    if (inv.billingContactUserId) {
      const bc = await prisma.clientUser.findFirst({ where: { id: inv.billingContactUserId, tenantId: ctx.session.tenant, clientOrgId: ctx.session.org }, select: { email: true } });
      if (bc?.email) customerEmail = bc.email;
    }

    const gateway = checkoutGateway();
    const idempotencyKey = `checkout_${inv.id}_${randomUUID().slice(0, 12)}`;
    let session;
    try {
      session = await gateway.createCheckoutSession({
        invoiceId: inv.id, tenantId: inv.tenantId, number: inv.number,
        amountCents: inv.amountCents, currency: inv.currency,
        portalOrigin: config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001',
        customerEmail, idempotencyKey,
      });
    } catch (err) {
      req.log.error({ err: err instanceof Error ? err.message : String(err), invoiceId: inv.id }, 'checkout session creation failed');
      return reply.code(502).send({ ok: false, message: 'Could not start payment. Please try again.' });
    }

    // Record the checkout attempt (amount copied from the invoice, server-side).
    await prisma.payment.create({
      data: {
        tenantId: inv.tenantId, clientOrgId: ctx.session.org, invoiceId: inv.id,
        provider: gateway.name, amountCents: inv.amountCents, currency: inv.currency,
        status: 'PENDING', checkoutSessionId: session.sessionId, providerCustomerId: session.providerCustomerId ?? null,
      },
    });
    await prisma.auditEvent.create({
      data: { tenantId: inv.tenantId, entityType: 'Invoice', entityId: inv.id, action: 'PAYMENT_CHECKOUT_CREATED', actorType: 'CLIENT', actorId: ctx.session.sub, data: { provider: gateway.name, sessionId: session.sessionId } },
    }).catch(() => undefined);

    return reply.send({ ok: true, url: session.url, provider: gateway.name });
  });

  // ── Read receipts (client marks the team's messages as read) ──
  app.post('/portal/messages/read', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    const r = await prisma.portalMessage.updateMany({
      where: { tenantId: ctx.session.tenant, project: { clientOrgId: ctx.session.org }, authorType: 'TEAM', internal: false, readByClientAt: null },
      data: { readByClientAt: new Date() },
    });
    return reply.send({ ok: true, marked: r.count });
  });

  // ── Secure file download (client) — authed + scoped + clientVisible only ──
  app.get('/portal/files/:id/download', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    // Scoped + current + client-visible + scan-clean (AVAILABLE). Internal-only,
    // quarantined, unscanned, non-current, deleted, or cross-org → 404 (no reveal).
    const file = await findClientVisibleFile(prisma, ctx.session.tenant, ctx.session.org, (req.params as { id: string }).id);
    if (!file?.storageKey) return reply.code(404).send({ ok: false });
    await prisma.auditEvent.create({ data: { tenantId: ctx.session.tenant, entityType: 'ProjectFile', entityId: file.id, action: 'FILE_DOWNLOADED', actorType: 'CLIENT', actorId: ctx.session.sub, data: { via: 'portal', version: file.version } } }).catch(() => undefined);
    const signed = await storage().getSignedUrl(file.storageKey, config.S3_SIGNED_URL_TTL_SECONDS);
    if (signed) return reply.redirect(signed); // S3: short-lived signed URL
    reply.header('content-type', file.mimeType || 'application/octet-stream');
    reply.header('content-disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    return reply.send(await storage().getStream(file.storageKey));
  });

  // ── Milestone/approval decision (write) ──
  app.post('/portal/approvals/:id/decide', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'approval:decide'))) return;
    const id = (req.params as { id: string }).id;
    const body = z.object({ decision: z.enum(['APPROVED', 'CHANGES_REQUESTED']), note: z.string().max(2000).optional() }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ ok: false });

    // Scope: the approval must belong to a project owned by the caller's org.
    const approval = await prisma.approval.findFirst({
      where: { id, tenantId: ctx.session.tenant, project: { clientOrgId: ctx.session.org } },
      include: { milestone: { select: { name: true } } },
    });
    if (!approval) return reply.code(404).send({ ok: false });
    // State machine: an approval can be decided exactly once. Re-deciding a closed approval
    // would otherwise re-trigger the milestone-DONE mutation and re-notify the team.
    if (approval.status !== 'PENDING') return reply.code(409).send({ ok: false, message: 'This approval has already been decided.' });

    const approved = body.data.decision === 'APPROVED';
    await prisma.$transaction([
      prisma.approval.update({
        where: { id: approval.id },
        data: { status: body.data.decision, decidedByUserId: ctx.session.sub, decidedAt: new Date(), note: body.data.note ?? null },
      }),
      prisma.portalActivity.create({
        data: { tenantId: ctx.session.tenant, projectId: approval.projectId, type: 'APPROVAL', message: `Approval ${approved ? 'granted' : 'sent back for changes'}: ${approval.subject}` },
      }),
      prisma.auditEvent.create({
        data: { tenantId: ctx.session.tenant, entityType: 'Approval', entityId: approval.id, action: `APPROVAL_${body.data.decision}`, actorType: 'CLIENT', actorId: ctx.session.sub },
      }),
      // The approval SERVICE is the only path that mutates the related object:
      // an APPROVED milestone approval marks the milestone DONE.
      ...(approved && approval.type === 'MILESTONE' && approval.milestoneId
        ? [
            prisma.milestone.update({ where: { id: approval.milestoneId }, data: { status: 'DONE', completedAt: new Date() } }),
            // S4: the curated "Milestone approved" relationship moment (the raw 'APPROVAL' row above
            // stays for the internal/admin log; the client timeline shows only this curated one).
            prisma.portalActivity.create({ data: { tenantId: ctx.session.tenant, projectId: approval.projectId, type: MOMENT.MILESTONE_APPROVED, message: `${MOMENT_MESSAGE[MOMENT.MILESTONE_APPROVED]}: ${approval.milestone?.name ?? approval.subject}` } }),
          ]
        : []),
    ]);
    // Notify the delivery team of the client's decision.
    await notifyStaff(prisma, ctx.session.tenant, { type: 'APPROVAL_COMPLETED', title: `Client ${approved ? 'approved' : 'requested changes'}: ${approval.subject}`, projectId: approval.projectId, linkPath: `/admin/projects/${approval.projectId}`, email: true });
    return reply.send({ ok: true });
  });

  // ── Notifications (client) ──
  app.get('/portal/notifications', async (req, reply) => {
    const ctx = await requireSession(req, reply); if (!ctx) return;
    const where = { tenantId: ctx.session.tenant, recipientType: 'CLIENT' as const, recipientId: ctx.session.sub };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { ...where, read: false } }),
    ]);
    return reply.send({ ok: true, unread, notifications: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, linkPath: n.linkPath, read: n.read, createdAt: n.createdAt })) });
  });
  app.post('/portal/notifications/:id/read', async (req, reply) => {
    const ctx = await requireSession(req, reply); if (!ctx) return;
    await prisma.notification.updateMany({ where: { id: (req.params as { id: string }).id, tenantId: ctx.session.tenant, recipientType: 'CLIENT', recipientId: ctx.session.sub }, data: { read: true, readAt: new Date() } });
    return reply.send({ ok: true });
  });
  app.post('/portal/notifications/read-all', async (req, reply) => {
    const ctx = await requireSession(req, reply); if (!ctx) return;
    await prisma.notification.updateMany({ where: { tenantId: ctx.session.tenant, recipientType: 'CLIENT', recipientId: ctx.session.sub, read: false }, data: { read: true, readAt: new Date() } });
    return reply.send({ ok: true });
  });

  // ── Client-user management (OWNER only) ─────────────────────────────
  // List the caller's organization users (for the owner's team management view).
  app.get('/portal/client-users', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'client-user:read'))) return;
    const users = await prisma.clientUser.findMany({
      where: { tenantId: ctx.session.tenant, clientOrgId: ctx.session.org },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, active: true, lastLoginAt: true, createdAt: true },
    });
    return reply.send({ ok: true, users });
  });

  // Invite a teammate into the caller's org.
  app.post('/portal/client-users', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'client-user:invite'))) return;
    const b = z.object({
      email: z.string().trim().email().max(200),
      firstName: z.string().trim().max(100).optional(),
      lastName: z.string().trim().max(100).optional(),
      role: z.enum(['OWNER', 'MEMBER']).optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const org = await prisma.clientOrg.findFirst({ where: { id: ctx.session.org, tenantId: ctx.session.tenant }, select: { id: true, name: true } });
    if (!org) return reply.code(404).send({ ok: false });
    const result = await inviteClientUser(prisma, {
      tenantId: ctx.session.tenant, clientOrgId: org.id, orgName: org.name,
      email: b.data.email,
      firstName: b.data.firstName ? cleanText(b.data.firstName, 100) : null,
      lastName: b.data.lastName ? cleanText(b.data.lastName, 100) : null,
      role: b.data.role ?? 'MEMBER',
      actor: { clientUserId: ctx.session.sub }, // the owner is acting within their own org
    });
    if (!result.ok) {
      if (result.code === 'ALREADY_MEMBER') return reply.code(409).send({ ok: false, message: 'That teammate already has portal access.' });
      return reply.code(409).send({ ok: false, message: 'That email is already in use by another organization.' });
    }
    // Never return a secret — the recipient gets a one-time setup link by email.
    return reply.send({ ok: true, invitationId: result.invitationId });
  });

  // Change a teammate's role (OWNER/MEMBER) within the caller's org.
  app.patch('/portal/client-users/:id', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'client-user:role-change'))) return;
    const id = (req.params as { id: string }).id;
    const b = z.object({ role: z.enum(['OWNER', 'MEMBER']) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    // Prevent self-lockout: an owner cannot demote/change their own role here.
    if (id === ctx.session.sub) return reply.code(400).send({ ok: false, message: 'You cannot change your own role.' });
    // Org scope: only users in the caller's org (404 otherwise — no cross-org reveal).
    const target = await prisma.clientUser.findFirst({ where: { id, tenantId: ctx.session.tenant, clientOrgId: ctx.session.org }, select: { id: true } });
    if (!target) return reply.code(404).send({ ok: false });
    await prisma.clientUser.update({ where: { id: target.id }, data: { role: b.data.role } });
    await prisma.auditEvent.create({ data: { tenantId: ctx.session.tenant, entityType: 'ClientUser', entityId: target.id, action: 'CLIENT_USER_ROLE_CHANGED', actorType: 'CLIENT', actorId: ctx.session.sub, data: { role: b.data.role } } }).catch(() => undefined);
    return reply.send({ ok: true });
  });

  // Deactivate a teammate (OWNER only). A deactivated user can no longer sign in
  // and loses portal access (their role resolves as inactive on RBAC checks).
  // Guards: cannot deactivate yourself; cannot deactivate the LAST active owner.
  app.post('/portal/client-users/:id/deactivate', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'client-user:deactivate'))) return;
    const id = (req.params as { id: string }).id;
    if (id === ctx.session.sub) return reply.code(400).send({ ok: false, message: 'You cannot deactivate your own account.' });
    const target = await prisma.clientUser.findFirst({ where: { id, tenantId: ctx.session.tenant, clientOrgId: ctx.session.org }, select: { id: true, role: true, active: true } });
    if (!target) return reply.code(404).send({ ok: false });
    if (target.active && target.role === 'OWNER') {
      const otherActiveOwners = await prisma.clientUser.count({ where: { tenantId: ctx.session.tenant, clientOrgId: ctx.session.org, role: 'OWNER', active: true, id: { not: target.id } } });
      if (otherActiveOwners === 0) return reply.code(400).send({ ok: false, message: 'You cannot deactivate the last active owner.' });
    }
    await prisma.clientUser.update({ where: { id: target.id }, data: { active: false } });
    await prisma.auditEvent.create({ data: { tenantId: ctx.session.tenant, entityType: 'ClientUser', entityId: target.id, action: 'CLIENT_USER_DEACTIVATED', actorType: 'CLIENT', actorId: ctx.session.sub } }).catch(() => undefined);
    return reply.send({ ok: true });
  });

  // Reactivate a previously-deactivated teammate (OWNER only).
  app.post('/portal/client-users/:id/reactivate', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'client-user:deactivate'))) return;
    const id = (req.params as { id: string }).id;
    const target = await prisma.clientUser.findFirst({ where: { id, tenantId: ctx.session.tenant, clientOrgId: ctx.session.org }, select: { id: true } });
    if (!target) return reply.code(404).send({ ok: false });
    await prisma.clientUser.update({ where: { id: target.id }, data: { active: true } });
    await prisma.auditEvent.create({ data: { tenantId: ctx.session.tenant, entityType: 'ClientUser', entityId: target.id, action: 'CLIENT_USER_REACTIVATED', actorType: 'CLIENT', actorId: ctx.session.sub } }).catch(() => undefined);
    return reply.send({ ok: true });
  });

  // ── Billing-contact management (OWNER only) — set which client user is the
  //    billing contact on one of the org's invoices. ──
  app.patch('/portal/invoices/:id/billing-contact', async (req, reply) => {
    const ctx = await requireSession(req, reply);
    if (!ctx) return;
    if (!(await requireClientPermission(reply, ctx.session, 'billing:manage'))) return;
    const id = (req.params as { id: string }).id;
    const b = z.object({ billingContactUserId: z.string().min(1).nullable() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const inv = await prisma.invoice.findFirst({ where: { id, tenantId: ctx.session.tenant, project: { clientOrgId: ctx.session.org } }, select: { id: true } });
    if (!inv) return reply.code(404).send({ ok: false });
    if (b.data.billingContactUserId) {
      const contact = await prisma.clientUser.findFirst({ where: { id: b.data.billingContactUserId, tenantId: ctx.session.tenant, clientOrgId: ctx.session.org }, select: { id: true } });
      if (!contact) return reply.code(400).send({ ok: false, message: 'Billing contact must be a user in your organization.' });
    }
    await prisma.invoice.update({ where: { id: inv.id }, data: { billingContactUserId: b.data.billingContactUserId } });
    await prisma.auditEvent.create({ data: { tenantId: ctx.session.tenant, entityType: 'Invoice', entityId: inv.id, action: 'INVOICE_BILLING_CONTACT_SET', actorType: 'CLIENT', actorId: ctx.session.sub } }).catch(() => undefined);
    return reply.send({ ok: true });
  });
}
