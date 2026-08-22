/**
 * Delivery-side (staff) API — /v1/admin/*. Staff-authenticated + RBAC-guarded +
 * tenant-scoped. This is the authoring layer: every client-facing portal record
 * (project, milestone, report, file, approval, message) is created/edited here.
 * Client-visible vs internal-only is controlled explicitly (internal notes,
 * clientVisible flags). All sensitive actions are audit-logged and, where they
 * affect the client, raise a client notification.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { resolveDefaultTenant } from '../tenant';
import { hashAbuseIdentifier } from '../lib/crypto';
import { checkRateLimit } from '../lib/ratelimit';
import { normalizeEmail, cleanText, cleanMultiline } from '../lib/sanitize';
import { parseDateInput } from '../lib/dates';
import { etDayNoonUTC } from '../lib/billing-period';
import { MOMENT, MOMENT_MESSAGE, CURATED_MOMENT_TYPES } from '../lib/relationship-moments';
import { STAFF_COOKIE, STAFF_COOKIE_OPTS, signStaff, verifyStaff, verifyStaffPassword } from '../staff/auth';
import { can, type Action } from '../staff/rbac';
import { notifyClientOrg } from '../notifications/service';
import { convertLead } from './conversion';
import { storage, objectKey, validateUpload } from '../storage';
import { enrichApprovals } from '../lib/approvals';
import { enrichInvoice } from '../lib/invoices';
import { randomUUID } from 'node:crypto';
import { config } from '../config';
import { renderInvoicePdfFrom } from '../billing';
import { checkoutGateway } from '../billing/gateway';
import { inviteClientUser } from './client-users';
import { issueInvitation, resendInvitation, revokeInvitation } from '../invitations/service';
import { invitationStatus } from '../lib/invitations';
import { scanUploadedFile } from '../scanning/service';

type StaffCtx = { session: NonNullable<ReturnType<typeof verifyStaff>>; tenantId: string };

export async function requireStaff(req: FastifyRequest, reply: FastifyReply, action?: Action): Promise<StaffCtx | null> {
  const cookie = (req as unknown as { cookies?: Record<string, string> }).cookies?.[STAFF_COOKIE];
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || undefined;
  const session = verifyStaff(cookie || bearer);
  if (!session) { reply.code(401).send({ ok: false, message: 'Not authenticated' }); return null; }
  const tenant = await resolveDefaultTenant(prisma);
  if (session.tenant !== tenant.id) { reply.code(401).send({ ok: false }); return null; }
  const staff = await prisma.staffUser.findFirst({ where: { id: session.sub, tenantId: tenant.id, active: true } });
  if (!staff) { reply.code(401).send({ ok: false }); return null; }
  if (action && !can(session.role, action)) { reply.code(403).send({ ok: false, message: 'Insufficient permissions' }); return null; }
  return { session, tenantId: tenant.id };
}

/** Ensure the project belongs to the tenant; returns it (with clientOrgId) or null. */
async function scopedProject(tenantId: string, id: string) {
  return prisma.project.findFirst({ where: { id, tenantId }, select: { id: true, clientOrgId: true, name: true, status: true } });
}

export async function audit(tenantId: string, staffId: string, entityType: string, entityId: string, action: string, data?: object) {
  await prisma.auditEvent.create({ data: { tenantId, entityType, entityId, action, actorType: 'ADMIN', actorId: staffId, data: data ?? undefined } });
}
async function activity(tenantId: string, projectId: string, type: string, message: string) {
  await prisma.portalActivity.create({ data: { tenantId, projectId, type, message } });
}

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  // ── Auth ──
  app.post('/admin/auth/login', async (req, reply) => {
    const tenant = await resolveDefaultTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `staff-login:${hashAbuseIdentifier(req.ip)}`, new Date(), 10);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts.' });
    const parsed = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, message: 'Invalid email or password.' });
    const user = await prisma.staffUser.findUnique({ where: { tenantId_normalizedEmail: { tenantId: tenant.id, normalizedEmail: normalizeEmail(parsed.data.email) } } });
    const ok = user && user.active ? await verifyStaffPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !ok) return reply.code(401).send({ ok: false, message: 'Invalid email or password.' });
    await prisma.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signStaff({ sub: user.id, role: user.role, tenant: tenant.id, email: user.email });
    reply.setCookie(STAFF_COOKIE, token, STAFF_COOKIE_OPTS);
    return reply.send({ ok: true, token, user: { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
  });

  app.post('/admin/auth/logout', async (_req, reply) => { reply.clearCookie(STAFF_COOKIE, { path: '/' }); return reply.send({ ok: true }); });

  app.get('/admin/me', async (req, reply) => {
    const ctx = await requireStaff(req, reply); if (!ctx) return;
    const u = await prisma.staffUser.findUnique({ where: { id: ctx.session.sub } });
    return reply.send({ ok: true, user: u && { firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role } });
  });

  // ── Directory (for pickers) ──
  app.get('/admin/staff', async (req, reply) => {
    const ctx = await requireStaff(req, reply); if (!ctx) return;
    const staff = await prisma.staffUser.findMany({ where: { tenantId: ctx.tenantId, active: true }, orderBy: { firstName: 'asc' }, select: { id: true, firstName: true, lastName: true, role: true } });
    return reply.send({ ok: true, staff });
  });
  app.get('/admin/clients', async (req, reply) => {
    const ctx = await requireStaff(req, reply); if (!ctx) return;
    const clients = await prisma.clientOrg.findMany({ where: { tenantId: ctx.tenantId }, orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } });
    return reply.send({ ok: true, clients });
  });

  // ── Projects ──
  app.get('/admin/projects', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const q = req.query as { clientOrgId?: string };
    const projects = await prisma.project.findMany({
      where: { tenantId: ctx.tenantId, ...(q.clientOrgId ? { clientOrgId: q.clientOrgId } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { clientOrg: { select: { name: true } }, _count: { select: { milestones: true, approvals: true } } },
    });
    return reply.send({ ok: true, projects: projects.map((p) => ({ id: p.id, name: p.name, code: p.code, status: p.status, percentComplete: p.percentComplete, dueDate: p.dueDate, client: p.clientOrg.name, milestones: p._count.milestones, approvals: p._count.approvals })) });
  });

  app.post('/admin/projects', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:write'); if (!ctx) return;
    const b = z.object({ clientOrgId: z.string(), name: z.string().trim().min(1).max(200), code: z.string().trim().max(40).optional(), dueDate: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const org = await prisma.clientOrg.findFirst({ where: { id: b.data.clientOrgId, tenantId: ctx.tenantId } });
    if (!org) return reply.code(404).send({ ok: false });
    const project = await prisma.project.create({ data: { tenantId: ctx.tenantId, clientOrgId: org.id, name: cleanText(b.data.name, 200), code: b.data.code ? cleanText(b.data.code, 40) : null, dueDate: b.data.dueDate ? parseDateInput(b.data.dueDate) : null } });
    await audit(ctx.tenantId, ctx.session.sub, 'Project', project.id, 'PROJECT_CREATED', { clientOrgId: org.id });
    return reply.send({ ok: true, project: { id: project.id } });
  });

  app.get('/admin/projects/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const project = await prisma.project.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: {
        clientOrg: { select: { id: true, name: true, carePlans: { orderBy: { createdAt: 'desc' } } } },
        milestones: { orderBy: { sequence: 'asc' } },
        reports: { orderBy: { publishedAt: 'desc' } },
        approvals: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
        files: { where: { deletedAt: null, isCurrent: true }, orderBy: { uploadedAt: 'desc' } },
        members: true,
        messages: { orderBy: { createdAt: 'asc' } }, // staff sees internal notes too
        // S4 D2: the admin Activity tab shows the RAW log only; curated moment rows are the
        // client-facing relationship timeline (client feed filters to them), so excluding them
        // here prevents a raw + curated duplicate of the same event on the staff view.
        activities: { where: { type: { notIn: CURATED_MOMENT_TYPES } }, orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });
    if (!project) return reply.code(404).send({ ok: false });
    return reply.send({ ok: true, project: { ...project, approvals: await enrichApprovals(prisma, project.approvals) } });
  });

  app.patch('/admin/projects/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:write'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({ name: z.string().trim().min(1).max(200).optional(), status: z.enum(['DISCOVERY', 'IN_PROGRESS', 'UAT', 'LAUNCHED', 'ON_HOLD', 'COMPLETE']).optional(), percentComplete: z.number().int().min(0).max(100).optional(), dueDate: z.string().nullable().optional(), nextUpdateAt: z.string().nullable().optional(), nextUpdateNote: z.string().max(280).nullable().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const statusChanged = b.data.status && b.data.status !== p.status;
    const nextUpdate = b.data.nextUpdateAt ? parseDateInput(b.data.nextUpdateAt) : null;
    // Clearing the date clears the note too — a note with no date has nothing to attach to, and
    // would otherwise linger in the DB and reappear if a date were set again later.
    const nextUpdatePatch = b.data.nextUpdateAt !== undefined && !nextUpdate
      ? { nextUpdateAt: null, nextUpdateNote: null }
      : {
          ...(b.data.nextUpdateAt !== undefined ? { nextUpdateAt: nextUpdate } : {}),
          ...(b.data.nextUpdateNote !== undefined ? { nextUpdateNote: b.data.nextUpdateNote ? cleanText(b.data.nextUpdateNote, 280) : null } : {}),
        };
    await prisma.project.update({ where: { id: p.id }, data: { ...(b.data.name ? { name: cleanText(b.data.name, 200) } : {}), ...(b.data.status ? { status: b.data.status } : {}), ...(b.data.percentComplete != null ? { percentComplete: b.data.percentComplete } : {}), ...(b.data.dueDate !== undefined ? { dueDate: b.data.dueDate ? parseDateInput(b.data.dueDate) : null } : {}), ...nextUpdatePatch } });
    await audit(ctx.tenantId, ctx.session.sub, 'Project', p.id, 'PROJECT_UPDATED', b.data);
    if (statusChanged) {
      await activity(ctx.tenantId, p.id, 'STATUS', `Project status changed to ${b.data.status}`);
      // S4: the curated "Project launched" relationship moment (the raw STATUS row above stays for
      // the internal/admin log; the client timeline shows only this curated one). Recorded ONCE per
      // project — a LAUNCHED → ON_HOLD → LAUNCHED round-trip must not add a second launch moment.
      if (b.data.status === 'LAUNCHED' && (await prisma.portalActivity.count({ where: { projectId: p.id, type: MOMENT.PROJECT_LAUNCHED } })) === 0) {
        await activity(ctx.tenantId, p.id, MOMENT.PROJECT_LAUNCHED, MOMENT_MESSAGE[MOMENT.PROJECT_LAUNCHED]);
      }
      await notifyClientOrg(prisma, ctx.tenantId, p.clientOrgId, { type: 'PROJECT_STATUS_CHANGED', title: `Project status: ${b.data.status}`, projectId: p.id, linkPath: '/', email: true });
    }
    return reply.send({ ok: true });
  });

  // ── Milestones ──
  app.post('/admin/projects/:id/milestones', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'milestone:write'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({ name: z.string().trim().min(1).max(200), sequence: z.number().int().optional(), dueDate: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const count = await prisma.milestone.count({ where: { projectId: p.id } });
    const m = await prisma.milestone.create({ data: { tenantId: ctx.tenantId, projectId: p.id, name: cleanText(b.data.name, 200), sequence: b.data.sequence ?? count + 1, dueDate: b.data.dueDate ? parseDateInput(b.data.dueDate) : null } });
    await audit(ctx.tenantId, ctx.session.sub, 'Milestone', m.id, 'MILESTONE_CREATED');
    return reply.send({ ok: true, milestone: { id: m.id } });
  });

  app.patch('/admin/milestones/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'milestone:write'); if (!ctx) return;
    const m = await prisma.milestone.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId }, include: { project: { select: { id: true, clientOrgId: true } } } });
    if (!m) return reply.code(404).send({ ok: false });
    const b = z.object({ status: z.enum(['PLANNED', 'IN_PROGRESS', 'DONE']).optional(), name: z.string().trim().min(1).max(200).optional(), dueDate: z.string().nullable().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const done = b.data.status === 'DONE';
    await prisma.milestone.update({ where: { id: m.id }, data: { ...(b.data.status ? { status: b.data.status, completedAt: done ? new Date() : null } : {}), ...(b.data.name ? { name: cleanText(b.data.name, 200) } : {}), ...(b.data.dueDate !== undefined ? { dueDate: b.data.dueDate ? parseDateInput(b.data.dueDate) : null } : {}) } });
    await audit(ctx.tenantId, ctx.session.sub, 'Milestone', m.id, 'MILESTONE_UPDATED', b.data);
    if (b.data.status) {
      await activity(ctx.tenantId, m.project.id, 'MILESTONE', `Milestone "${m.name}" → ${b.data.status}`);
      await notifyClientOrg(prisma, ctx.tenantId, m.project.clientOrgId, { type: 'MILESTONE_UPDATED', title: `Milestone updated: ${m.name}`, projectId: m.project.id, linkPath: '/projects?tab=milestones', email: true });
    }
    return reply.send({ ok: true });
  });

  // ── Reports (publish → client sees it) ──
  app.post('/admin/projects/:id/reports', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'report:publish'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({ kind: z.enum(['DAILY', 'WEEKLY']), title: z.string().trim().min(1).max(200), summary: z.string().trim().min(1).max(8000), periodStart: z.string().optional(), periodEnd: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const report = await prisma.projectReport.create({ data: { tenantId: ctx.tenantId, projectId: p.id, kind: b.data.kind, title: cleanText(b.data.title, 200), summary: cleanMultiline(b.data.summary, 8000), periodStart: b.data.periodStart ? parseDateInput(b.data.periodStart) : null, periodEnd: b.data.periodEnd ? parseDateInput(b.data.periodEnd) : null } });
    await audit(ctx.tenantId, ctx.session.sub, 'ProjectReport', report.id, 'REPORT_PUBLISHED');
    await activity(ctx.tenantId, p.id, 'REPORT', `${b.data.kind === 'DAILY' ? 'Daily' : 'Weekly'} report published: ${report.title}`);
    await notifyClientOrg(prisma, ctx.tenantId, p.clientOrgId, { type: 'REPORT_PUBLISHED', title: `New ${b.data.kind.toLowerCase()} report: ${report.title}`, projectId: p.id, linkPath: '/projects?tab=reports', email: true });
    return reply.send({ ok: true, report: { id: report.id } });
  });

  // ── Approvals (request → client decides) ──
  app.post('/admin/projects/:id/approvals', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'approval:create'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({ type: z.enum(['MILESTONE', 'DELIVERABLE', 'UAT', 'CHANGE_REQUEST', 'DEPLOYMENT']), subject: z.string().trim().min(1).max(300), milestoneId: z.string().optional(), relatedType: z.string().optional(), relatedId: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const ap = await prisma.approval.create({ data: { tenantId: ctx.tenantId, projectId: p.id, type: b.data.type, subject: cleanText(b.data.subject, 300), milestoneId: b.data.milestoneId ?? null, relatedType: b.data.relatedType ?? null, relatedId: b.data.relatedId ?? null, requestedByStaffId: ctx.session.sub } });
    await audit(ctx.tenantId, ctx.session.sub, 'Approval', ap.id, 'APPROVAL_REQUESTED', { type: b.data.type });
    await activity(ctx.tenantId, p.id, 'APPROVAL', `Approval requested: ${ap.subject}`);
    await notifyClientOrg(prisma, ctx.tenantId, p.clientOrgId, { type: 'APPROVAL_REQUESTED', title: `Approval needed: ${ap.subject}`, projectId: p.id, linkPath: '/', email: true });
    return reply.send({ ok: true, approval: { id: ap.id } });
  });

  // ── Team messages (reply to client) + internal notes ──
  app.post('/admin/projects/:id/messages', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'message:reply'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({ body: z.string().trim().min(1).max(4000), internal: z.boolean().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const internal = b.data.internal === true;
    const msg = await prisma.portalMessage.create({ data: { tenantId: ctx.tenantId, projectId: p.id, authorType: 'TEAM', authorStaffId: ctx.session.sub, internal, body: cleanMultiline(b.data.body, 4000) } });
    if (!internal) {
      await activity(ctx.tenantId, p.id, 'MESSAGE', 'The delivery team sent you a message');
      await notifyClientOrg(prisma, ctx.tenantId, p.clientOrgId, { type: 'TEAM_MESSAGE', title: 'New message from your delivery team', projectId: p.id, linkPath: '/messages', email: true });
    }
    await audit(ctx.tenantId, ctx.session.sub, 'PortalMessage', msg.id, internal ? 'INTERNAL_NOTE' : 'TEAM_MESSAGE');
    return reply.send({ ok: true, message: { id: msg.id, internal } });
  });

  // ── Read receipts (team marks the client's messages as read) ──
  app.post('/admin/projects/:id/messages/read', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const r = await prisma.portalMessage.updateMany({
      where: { tenantId: ctx.tenantId, projectId: p.id, authorType: 'CLIENT', readByTeamAt: null },
      data: { readByTeamAt: new Date() },
    });
    return reply.send({ ok: true, marked: r.count });
  });

  // ── Invoices (create with line items) ──
  app.post('/admin/projects/:id/invoices', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'invoice:write'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({
      number: z.string().trim().min(1).max(60),
      currency: z.string().trim().length(3).optional(),
      status: z.enum(['DRAFT', 'SENT']).optional(),
      dueAt: z.string().optional(),
      billingContactUserId: z.string().optional(),
      paymentUrl: z.string().url().max(2000).optional(),
      lineItems: z.array(z.object({
        description: z.string().trim().min(1).max(300),
        quantity: z.number().int().min(1).max(100000).optional(),
        unitCents: z.number().int().min(0).max(100000000),
        milestoneId: z.string().optional(),
      })).min(1).max(50),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const status = b.data.status ?? 'DRAFT';
    const items = b.data.lineItems.map((li) => {
      const quantity = li.quantity ?? 1;
      return { tenantId: ctx.tenantId, description: cleanText(li.description, 300), quantity, unitCents: li.unitCents, amountCents: quantity * li.unitCents, milestoneId: li.milestoneId ?? null };
    });
    const amountCents = items.reduce((s, li) => s + li.amountCents, 0);
    const inv = await prisma.invoice.create({
      data: {
        tenantId: ctx.tenantId, projectId: p.id, number: cleanText(b.data.number, 60),
        currency: (b.data.currency || 'USD').toUpperCase(), amountCents, status,
        billingContactUserId: b.data.billingContactUserId || null,
        paymentUrl: b.data.paymentUrl || null,
        issuedAt: status === 'SENT' ? new Date() : null,
        dueAt: b.data.dueAt ? parseDateInput(b.data.dueAt) : null,
        lineItems: { create: items },
      },
    });
    await audit(ctx.tenantId, ctx.session.sub, 'Invoice', inv.id, 'INVOICE_CREATED', { number: inv.number, status, amountCents });
    await activity(ctx.tenantId, p.id, 'INVOICE', `Invoice ${inv.number} ${status === 'SENT' ? 'sent' : 'drafted'}`);
    if (status === 'SENT') await notifyClientOrg(prisma, ctx.tenantId, p.clientOrgId, { type: 'INVOICE_CREATED', title: `New invoice ${inv.number}`, projectId: p.id, linkPath: '/invoices', email: true });
    return reply.send({ ok: true, invoice: { id: inv.id } });
  });

  // ── Invoice status transitions (DRAFT→SENT→PAID/OVERDUE) ──
  app.patch('/admin/invoices/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'invoice:write'); if (!ctx) return;
    const inv = await prisma.invoice.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId }, include: { project: { select: { id: true, clientOrgId: true } } } });
    if (!inv) return reply.code(404).send({ ok: false });
    const b = z.object({ status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOIDED']).optional(), paymentUrl: z.string().url().max(2000).nullable().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const status = b.data.status;
    if (status === 'VOIDED' && inv.status === 'PAID') return reply.code(409).send({ ok: false, message: 'A paid invoice cannot be voided.' });
    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        ...(status ? { status } : {}),
        ...(status === 'PAID' ? { paidAt: new Date() } : {}),
        ...(status === 'SENT' && !inv.issuedAt ? { issuedAt: new Date() } : {}),
        ...(b.data.paymentUrl !== undefined ? { paymentUrl: b.data.paymentUrl } : {}),
      },
    });
    if (status) {
      await audit(ctx.tenantId, ctx.session.sub, 'Invoice', inv.id, `INVOICE_${status}`, { number: inv.number });
      if (inv.project) {
        await activity(ctx.tenantId, inv.project.id, 'INVOICE', `Invoice ${inv.number} marked ${status}`);
        if (status === 'SENT') await notifyClientOrg(prisma, ctx.tenantId, inv.project.clientOrgId, { type: 'INVOICE_CREATED', title: `New invoice ${inv.number}`, projectId: inv.project.id, linkPath: '/invoices', email: true });
      }
    }
    return reply.send({ ok: true });
  });

  // ── Care Plans (Phase 3 — relationship-level retainers). ADDITIVE to project/milestone billing;
  //    these routes only MODEL + CONTROL the plan. Recurring RETAINER-invoice generation is P3.2, and
  //    the RETAINER_ACTIVATED timeline moment + "Care Plan active" workspace state are P3.4. ──

  // Create a Care Plan for a project's client org (starts DRAFT). One non-terminal plan per relationship.
  app.post('/admin/projects/:id/care-plans', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'invoice:write'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({
      name: z.string().trim().min(1).max(120),
      monthlyAmountCents: z.number().int().min(0).max(100000000),
      currency: z.string().trim().length(3).optional(),
      includedSummary: z.string().trim().max(2000).optional(),
      nextReportAt: z.string().optional(),
      nextReportNote: z.string().trim().max(300).optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    // A relationship has at most one live plan; terminal (CANCELED/COMPLETED) plans don't block a new one.
    const existing = await prisma.carePlan.findFirst({ where: { tenantId: ctx.tenantId, clientOrgId: p.clientOrgId, status: { in: ['DRAFT', 'ACTIVE', 'PAUSED', 'PAST_DUE'] } } });
    if (existing) return reply.code(409).send({ ok: false, message: 'This client already has an active or pending Care Plan.' });
    try {
      const cp = await prisma.carePlan.create({
        data: {
          tenantId: ctx.tenantId, clientOrgId: p.clientOrgId,
          name: cleanText(b.data.name, 120),
          monthlyAmountCents: b.data.monthlyAmountCents,
          currency: (b.data.currency || 'USD').toUpperCase(),
          includedSummary: b.data.includedSummary ? cleanMultiline(b.data.includedSummary, 2000) : null,
          nextReportAt: b.data.nextReportAt ? parseDateInput(b.data.nextReportAt) : null,
          nextReportNote: b.data.nextReportNote ? cleanText(b.data.nextReportNote, 300) : null,
        },
      });
      await audit(ctx.tenantId, ctx.session.sub, 'CarePlan', cp.id, 'CARE_PLAN_CREATED', { name: cp.name, monthlyAmountCents: cp.monthlyAmountCents });
      return reply.send({ ok: true, carePlan: { id: cp.id } });
    } catch (err) {
      // Lost a create race against the partial-unique "one live plan per org" index (belt-and-suspenders
      // to the findFirst guard above). Treat as the same conflict rather than a 500.
      if ((err as { code?: string }).code === 'P2002') return reply.code(409).send({ ok: false, message: 'This client already has an active or pending Care Plan.' });
      throw err;
    }
  });

  // Update a Care Plan: field edits and/or a validated lifecycle transition. Transitions set the
  // right timestamps and the `nextInvoiceAt` billing cursor that the P3.2 worker will read.
  app.patch('/admin/care-plans/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'invoice:write'); if (!ctx) return;
    const cp = await prisma.carePlan.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!cp) return reply.code(404).send({ ok: false });
    const b = z.object({
      name: z.string().trim().min(1).max(120).optional(),
      monthlyAmountCents: z.number().int().min(0).max(100000000).optional(),
      currency: z.string().trim().length(3).optional(),
      includedSummary: z.string().trim().max(2000).nullable().optional(),
      nextReportAt: z.string().nullable().optional(),
      nextReportNote: z.string().trim().max(300).nullable().optional(),
      status: z.enum(['ACTIVE', 'PAUSED', 'CANCELED', 'COMPLETED']).optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });

    // Lifecycle state machine. activate/reactivate → ACTIVE; only these transitions are legal.
    const ALLOWED: Record<string, string[]> = {
      DRAFT: ['ACTIVE', 'CANCELED'],
      ACTIVE: ['PAUSED', 'CANCELED', 'COMPLETED'],
      PAUSED: ['ACTIVE', 'CANCELED', 'COMPLETED'],
      PAST_DUE: ['ACTIVE', 'PAUSED', 'CANCELED'],
      // CANCELED & COMPLETED are terminal. Reactivation is PAUSED→ACTIVE only; to resume after a
      // cancel, staff create a NEW plan (the one-live-plan-per-org guard protects it). This keeps
      // "at most one live plan per relationship" true on every code path (no CANCELED→ACTIVE can
      // resurrect a second live plan alongside a newly-created one → no double retainer billing).
      CANCELED: [],
      COMPLETED: [],
    };
    let transition: Record<string, unknown> = {};
    const changingStatus = b.data.status && b.data.status !== cp.status;
    if (changingStatus) {
      if (!ALLOWED[cp.status]?.includes(b.data.status!)) return reply.code(409).send({ ok: false, message: `Cannot move a Care Plan from ${cp.status} to ${b.data.status}.` });
      const now = new Date();
      if (b.data.status === 'ACTIVE') {
        // First activation sets the ET billing-anchor day (≤28 so every month has it); a REACTIVATION
        // keeps the original anchor and startedAt.
        const firstActivation = !cp.startedAt;
        const etDay = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', day: 'numeric' }).format(now));
        const anchorDay = firstActivation ? Math.min(28, etDay || cp.billingAnchorDay) : cp.billingAnchorDay;
        // Resume the billing cursor at the LATER of today and the day AFTER the last billed period, so a
        // reactivation never re-bills already-covered time (double-bill), never back-bills the paused
        // stretch, and never collides with the last period's job key (which would stall billing).
        const lastRetainer = await prisma.invoice.findFirst({ where: { tenantId: ctx.tenantId, carePlanId: cp.id, kind: 'RETAINER' }, orderBy: { billingPeriodEnd: 'desc' }, select: { billingPeriodEnd: true } });
        const resumeFrom = lastRetainer?.billingPeriodEnd ? new Date(lastRetainer.billingPeriodEnd.getTime() + 24 * 60 * 60 * 1000) : now;
        transition = { status: 'ACTIVE', startedAt: cp.startedAt ?? now, pausedAt: null, canceledAt: null, endedAt: null, billingAnchorDay: anchorDay, nextInvoiceAt: etDayNoonUTC(resumeFrom.getTime() > now.getTime() ? resumeFrom : now) };
      } else if (b.data.status === 'PAUSED') {
        transition = { status: 'PAUSED', pausedAt: now };
      } else if (b.data.status === 'CANCELED') {
        transition = { status: 'CANCELED', canceledAt: now, nextInvoiceAt: null };
      } else if (b.data.status === 'COMPLETED') {
        transition = { status: 'COMPLETED', endedAt: now, nextInvoiceAt: null };
      }
    }

    await prisma.carePlan.update({
      where: { id: cp.id },
      data: {
        ...(b.data.name !== undefined ? { name: cleanText(b.data.name, 120) } : {}),
        ...(b.data.monthlyAmountCents !== undefined ? { monthlyAmountCents: b.data.monthlyAmountCents } : {}),
        ...(b.data.currency !== undefined ? { currency: b.data.currency.toUpperCase() } : {}),
        ...(b.data.includedSummary !== undefined ? { includedSummary: b.data.includedSummary ? cleanMultiline(b.data.includedSummary, 2000) : null } : {}),
        ...(b.data.nextReportAt !== undefined ? { nextReportAt: b.data.nextReportAt ? parseDateInput(b.data.nextReportAt) : null } : {}),
        ...(b.data.nextReportNote !== undefined ? { nextReportNote: b.data.nextReportNote ? cleanText(b.data.nextReportNote, 300) : null } : {}),
        ...transition,
      },
    });
    if (changingStatus) await audit(ctx.tenantId, ctx.session.sub, 'CarePlan', cp.id, `CARE_PLAN_${b.data.status}`, { from: cp.status });
    return reply.send({ ok: true });
  });

  // ── Invoice detail (staff) — line items + billing contact + related milestones ──
  app.get('/admin/invoices/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const inv = await prisma.invoice.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: { lineItems: { orderBy: { createdAt: 'asc' } } },
    });
    if (!inv) return reply.code(404).send({ ok: false });
    return reply.send({ ok: true, invoice: await enrichInvoice(inv) });
  });

  // ── Payment link (provider boundary; stub in dev) ──
  app.post('/admin/invoices/:id/payment-link', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'invoice:write'); if (!ctx) return;
    const inv = await prisma.invoice.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: { project: { select: { clientOrgId: true } } },
    });
    if (!inv) return reply.code(404).send({ ok: false });
    if (inv.status === 'PAID') return reply.code(409).send({ ok: false, message: 'Invoice already paid.' });
    if (inv.status === 'DRAFT') return reply.code(409).send({ ok: false, message: 'Invoice is not payable yet (still a draft).' });
    if (inv.amountCents <= 0) return reply.code(409).send({ ok: false, message: 'Invoice has no payable amount.' });
    const clientOrgId = inv.project?.clientOrgId ?? inv.clientOrgId;
    if (!clientOrgId) return reply.code(409).send({ ok: false, message: 'This invoice is not linked to a client yet.' });

    // Staff-generated links go through the SAME real payment gateway as client
    // self-checkout (`checkoutGateway()` = StripeGateway when PAYMENTS_PROVIDER=stripe),
    // so a staff link is a real Stripe Checkout Session — never a stub in prod.
    let customerEmail: string | null = null;
    if (inv.billingContactUserId) {
      const bc = await prisma.clientUser.findFirst({ where: { id: inv.billingContactUserId, tenantId: ctx.tenantId }, select: { email: true } });
      if (bc?.email) customerEmail = bc.email;
    }
    const gateway = checkoutGateway();
    const idempotencyKey = `stafflink_${inv.id}_${randomUUID().slice(0, 12)}`;
    let session;
    try {
      session = await gateway.createCheckoutSession({
        invoiceId: inv.id, tenantId: inv.tenantId, number: inv.number,
        amountCents: inv.amountCents, currency: inv.currency,
        portalOrigin: config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001',
        customerEmail, idempotencyKey,
      });
    } catch (err) {
      req.log.error({ err: err instanceof Error ? err.message : String(err), invoiceId: inv.id }, 'staff payment-link session creation failed');
      return reply.code(502).send({ ok: false, message: 'Could not create a payment link. Please try again.' });
    }
    // Record the pending payment so the webhook can settle it (same as client checkout).
    await prisma.payment.create({
      data: {
        tenantId: inv.tenantId, clientOrgId, invoiceId: inv.id,
        provider: gateway.name, amountCents: inv.amountCents, currency: inv.currency,
        status: 'PENDING', checkoutSessionId: session.sessionId, providerCustomerId: session.providerCustomerId ?? null,
      },
    });
    await prisma.invoice.update({ where: { id: inv.id }, data: { paymentUrl: session.url } });
    await audit(ctx.tenantId, ctx.session.sub, 'Invoice', inv.id, 'INVOICE_PAYMENT_LINK', { provider: gateway.name, sessionId: session.sessionId });
    return reply.send({ ok: true, paymentUrl: session.url, provider: gateway.name });
  });

  // ── Invoice PDF (staff) — rendered on demand ──
  app.get('/admin/invoices/:id/pdf', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const inv = await prisma.invoice.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: { lineItems: { orderBy: { createdAt: 'asc' } }, project: { select: { clientOrg: { select: { name: true } } } } },
    });
    if (!inv) return reply.code(404).send({ ok: false });
    const pdf = renderInvoicePdfFrom(await enrichInvoice(inv), inv.project?.clientOrg.name ?? '');
    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="${inv.number}.pdf"`);
    return reply.send(pdf);
  });

  // ── Client users (org contacts) — list / invite / role ──
  app.get('/admin/projects/:id/client-users', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const users = await prisma.clientUser.findMany({
      where: { tenantId: ctx.tenantId, clientOrgId: p.clientOrgId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, lastLoginAt: true, createdAt: true },
    });
    return reply.send({ ok: true, users });
  });

  app.post('/admin/projects/:id/client-users', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'team:assign'); if (!ctx) return;
    const p = await prisma.project.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId }, include: { clientOrg: { select: { id: true, name: true } } } });
    if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({ email: z.string().trim().email().max(200), firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), role: z.enum(['OWNER', 'MEMBER']).optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const r = await inviteClientUser(prisma, { tenantId: ctx.tenantId, clientOrgId: p.clientOrg.id, orgName: p.clientOrg.name, email: b.data.email, firstName: b.data.firstName ? cleanText(b.data.firstName, 100) : null, lastName: b.data.lastName ? cleanText(b.data.lastName, 100) : null, role: b.data.role ?? 'MEMBER', actor: { staffUserId: ctx.session.sub } });
    if (!r.ok) {
      if (r.code === 'ALREADY_MEMBER') return reply.code(409).send({ ok: false, message: 'That person already has portal access for this client.' });
      return reply.code(409).send({ ok: false, message: 'That email is already used by another client organization.' });
    }
    await activity(ctx.tenantId, p.id, 'PROJECT', `Client contact invited: ${b.data.email}`);
    // No password/secret is ever returned — the setup link is emailed to the recipient.
    return reply.send({ ok: true, invitationId: r.invitationId, refreshed: r.refreshed });
  });

  app.patch('/admin/client-users/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'team:assign'); if (!ctx) return;
    const b = z.object({ role: z.enum(['OWNER', 'MEMBER']) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const u = await prisma.clientUser.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!u) return reply.code(404).send({ ok: false });
    await prisma.clientUser.update({ where: { id: u.id }, data: { role: b.data.role } });
    await audit(ctx.tenantId, ctx.session.sub, 'ClientUser', u.id, 'CLIENT_USER_ROLE_CHANGED', { role: b.data.role });
    return reply.send({ ok: true });
  });

  // ── Client invitations (secure onboarding — no temp passwords) ──
  // List the pending/active invitations for a project's org (for the invite UI).
  app.get('/admin/projects/:id/client-invitations', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const rows = await prisma.clientInvitation.findMany({
      where: { tenantId: ctx.tenantId, clientOrgId: p.clientOrgId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, expiresAt: true, acceptedAt: true, revokedAt: true, lastSentAt: true, sendCount: true, createdAt: true },
    });
    const now = new Date();
    // Never expose tokenHash. Surface a derived status for the UI.
    const invitations = rows.map((r) => ({ id: r.id, email: r.email, role: r.role, status: invitationStatus(r, now), expiresAt: r.expiresAt, lastSentAt: r.lastSentAt, sendCount: r.sendCount, createdAt: r.createdAt }));
    return reply.send({ ok: true, invitations });
  });

  // Create an invitation for an org (email a one-time setup link).
  app.post('/admin/client-invitations', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'team:assign'); if (!ctx) return;
    const b = z.object({ clientOrgId: z.string(), email: z.string().trim().email().max(200), firstName: z.string().trim().max(100).optional(), lastName: z.string().trim().max(100).optional(), role: z.enum(['OWNER', 'MEMBER']).optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const org = await prisma.clientOrg.findFirst({ where: { id: b.data.clientOrgId, tenantId: ctx.tenantId }, select: { id: true, name: true } });
    if (!org) return reply.code(404).send({ ok: false });
    const r = await issueInvitation(prisma, { tenantId: ctx.tenantId, clientOrgId: org.id, orgName: org.name, email: b.data.email, firstName: b.data.firstName ? cleanText(b.data.firstName, 100) : null, lastName: b.data.lastName ? cleanText(b.data.lastName, 100) : null, role: b.data.role ?? 'MEMBER', actor: { staffUserId: ctx.session.sub } });
    if (!r.ok) {
      if (r.code === 'ALREADY_ACTIVE_MEMBER') return reply.code(409).send({ ok: false, message: 'That person already has portal access for this client.' });
      return reply.code(409).send({ ok: false, message: 'That email is already used by another client organization.' });
    }
    // No token/secret is ever returned.
    return reply.send({ ok: true, invitationId: r.invitationId, refreshed: r.refreshed });
  });

  app.post('/admin/client-invitations/:id/resend', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'team:assign'); if (!ctx) return;
    const r = await resendInvitation(prisma, { tenantId: ctx.tenantId, invitationId: (req.params as { id: string }).id, actor: { staffUserId: ctx.session.sub } });
    if (!r.ok) {
      if (r.code === 'NOT_FOUND') return reply.code(404).send({ ok: false });
      return reply.code(409).send({ ok: false, message: 'This invitation can no longer be resent (already accepted or revoked).' });
    }
    return reply.send({ ok: true });
  });

  app.post('/admin/client-invitations/:id/revoke', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'team:assign'); if (!ctx) return;
    const b = z.object({ reason: z.string().trim().max(300).optional() }).safeParse(req.body ?? {});
    if (!b.success) return reply.code(400).send({ ok: false });
    const r = await revokeInvitation(prisma, { tenantId: ctx.tenantId, invitationId: (req.params as { id: string }).id, reason: b.data.reason ? cleanText(b.data.reason, 300) : undefined, actor: { staffUserId: ctx.session.sub } });
    if (!r.ok) {
      if (r.code === 'NOT_FOUND') return reply.code(404).send({ ok: false });
      return reply.code(409).send({ ok: false, message: 'This invitation has already been accepted and cannot be revoked.' });
    }
    return reply.send({ ok: true });
  });

  // ── Team assignments ──
  app.post('/admin/projects/:id/members', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'team:assign'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const b = z.object({ staffUserId: z.string().optional(), name: z.string().trim().min(1).max(120), role: z.string().trim().min(1).max(80), clientVisible: z.boolean().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const member = await prisma.projectMember.create({ data: { tenantId: ctx.tenantId, projectId: p.id, staffUserId: b.data.staffUserId ?? null, name: cleanText(b.data.name, 120), role: cleanText(b.data.role, 80), clientVisible: b.data.clientVisible ?? true } });
    await audit(ctx.tenantId, ctx.session.sub, 'ProjectMember', member.id, 'MEMBER_ASSIGNED');
    return reply.send({ ok: true, member: { id: member.id } });
  });

  app.delete('/admin/members/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'team:assign'); if (!ctx) return;
    const m = await prisma.projectMember.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!m) return reply.code(404).send({ ok: false });
    await prisma.projectMember.delete({ where: { id: m.id } });
    await audit(ctx.tenantId, ctx.session.sub, 'ProjectMember', m.id, 'MEMBER_REMOVED');
    return reply.send({ ok: true });
  });

  // ── Files (secure upload / new-version / download / soft-delete) ──
  // Pass ?replaceId=<fileId> to upload a NEW VERSION of an existing file: it
  // supersedes the target (isCurrent flips), keeps the same version chain (rootId),
  // and bumps the version number. Without it, a fresh v1 file is created.
  app.post('/admin/projects/:id/files', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'file:write'); if (!ctx) return;
    const p = await scopedProject(ctx.tenantId, (req.params as { id: string }).id); if (!p) return reply.code(404).send({ ok: false });
    const q = req.query as { category?: string; clientVisible?: string; replaceId?: string };
    const category = (['CONTRACT', 'INVOICE', 'DELIVERABLE', 'OTHER'].includes(q.category || '') ? q.category : 'DELIVERABLE') as 'CONTRACT' | 'INVOICE' | 'DELIVERABLE' | 'OTHER';

    const mp = await (req as unknown as { file: () => Promise<{ filename: string; mimetype: string; toBuffer: () => Promise<Buffer> } | undefined> }).file();
    if (!mp) return reply.code(400).send({ ok: false, message: 'no_file' });
    let buffer: Buffer;
    try { buffer = await mp.toBuffer(); } catch { return reply.code(413).send({ ok: false, message: 'file_too_large' }); }
    // Validate declared MIME + size + filename + actual signature (never trust
    // the browser Content-Type). Executables/scripts/double-extensions rejected here.
    const v = validateUpload(mp.mimetype, buffer.length, mp.filename, buffer);
    if (!v.ok) return reply.code(400).send({ ok: false, message: 'file_rejected', reason: v.reason });

    // Resolve version chain if this is a replacement.
    let previous: { id: string; rootId: string | null; version: number; clientVisible: boolean } | null = null;
    let rootId: string | null = null;
    let version = 1;
    if (q.replaceId) {
      previous = await prisma.projectFile.findFirst({ where: { id: q.replaceId, tenantId: ctx.tenantId, projectId: p.id, deletedAt: null }, select: { id: true, rootId: true, version: true, clientVisible: true } });
      if (!previous) return reply.code(404).send({ ok: false, message: 'replace_target_not_found' });
      rootId = previous.rootId ?? previous.id;
      const top = await prisma.projectFile.aggregate({ where: { tenantId: ctx.tenantId, rootId }, _max: { version: true } });
      version = (top._max.version ?? previous.version) + 1;
    }
    // Visibility: explicit flag wins; else inherit the prior version's (default true for new files).
    const clientVisible = q.clientVisible != null ? q.clientVisible !== 'false' : previous ? previous.clientVisible : true;

    // 1) PENDING_UPLOAD — record created, not current, not downloadable yet.
    const file = await prisma.projectFile.create({ data: { tenantId: ctx.tenantId, projectId: p.id, name: cleanText(mp.filename, 200), category, sizeBytes: buffer.length, mimeType: mp.mimetype, clientVisible, uploadedByStaffId: ctx.session.sub, storageProvider: storage().provider, version, state: 'PENDING_UPLOAD', scanStatus: 'pending', isCurrent: false, rootId: rootId ?? undefined } });
    // Deterministic, fully-scoped key — a new version never overwrites a prior object.
    const key = objectKey({ tenantId: ctx.tenantId, clientOrgId: p.clientOrgId, projectId: p.id, fileId: file.id, version, filename: mp.filename });

    // 2) Store, then VERIFY the object exists and the size matches (no silent drift).
    try {
      await storage().put(key, buffer, mp.mimetype);
      const head = await storage().head(key);
      if (!head.exists || (head.size != null && head.size !== buffer.length)) throw new Error('object_verify_failed');
    } catch (err) {
      await prisma.projectFile.update({ where: { id: file.id }, data: { state: 'REJECTED' } });
      await storage().delete(key).catch(() => undefined);
      await audit(ctx.tenantId, ctx.session.sub, 'ProjectFile', file.id, 'FILE_REJECTED', { reason: 'storage_verify_failed' });
      req.log.error({ err: err instanceof Error ? err.message : String(err), fileId: file.id }, 'file storage/verify failed');
      return reply.code(502).send({ ok: false, message: 'upload_failed' });
    }

    // 3) SCANNING → hand off to the malware-scan service. Small files (and the
    //    stub scanner) finalize inline; larger files enqueue a durable scan job
    //    and stay SCANNING until the worker records a CLEAN result. On CLEAN the
    //    service flips the version current + notifies the client; on INFECTED it
    //    quarantines + security-audits + alerts staff.
    await prisma.projectFile.update({ where: { id: file.id }, data: { storageKey: key, state: 'SCANNING' } });
    const scanned = await scanUploadedFile(prisma, file, buffer);
    if (scanned.result === 'INFECTED') return reply.code(400).send({ ok: false, message: 'file_rejected', reason: 'malware_detected' });

    // AVAILABLE (inline-clean) → 200; SCANNING (queued) / REJECTED (unscannable) → 202.
    const code = scanned.state === 'AVAILABLE' ? 200 : 202;
    return reply.code(code).send({ ok: true, file: { id: file.id, version, state: scanned.state } });
  });

  // ── Version history for a file (staff) ──
  app.get('/admin/files/:id/versions', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const anchor = await prisma.projectFile.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId }, select: { id: true, rootId: true } });
    if (!anchor) return reply.code(404).send({ ok: false });
    const root = anchor.rootId ?? anchor.id;
    const versions = await prisma.projectFile.findMany({
      where: { tenantId: ctx.tenantId, rootId: root },
      orderBy: { version: 'desc' },
      select: { id: true, name: true, version: true, isCurrent: true, state: true, sizeBytes: true, clientVisible: true, uploadedAt: true, deletedAt: true },
    });
    return reply.send({ ok: true, versions });
  });

  // Staff-only scan status/evidence for a file (threat name, engine, retries,
  // errors). Never exposed to clients — clients only ever see AVAILABLE files.
  app.get('/admin/files/:id/scan', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const file = await prisma.projectFile.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId }, select: { id: true, state: true, fileHash: true } });
    if (!file) return reply.code(404).send({ ok: false });
    const scan = await prisma.fileScan.findFirst({ where: { tenantId: ctx.tenantId, fileId: file.id }, orderBy: { createdAt: 'desc' } });
    return reply.send({
      ok: true,
      fileState: file.state,
      fileHash: file.fileHash,
      scan: scan && {
        status: scan.status, result: scan.result, threatName: scan.threatName,
        provider: scan.provider, engine: scan.engine, engineVersion: scan.engineVersion, signatureVersion: scan.signatureVersion,
        attempts: scan.attempts, maxAttempts: scan.maxAttempts, retryCount: scan.retryCount, errorCode: scan.errorCode, lastError: scan.lastError,
        startedAt: scan.startedAt, completedAt: scan.completedAt, fileSizeBytes: scan.fileSizeBytes,
      },
    });
  });

  // Staff download — any non-deleted version, but only if scan-clean (AVAILABLE).
  app.get('/admin/files/:id/download', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const file = await prisma.projectFile.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId, deletedAt: null, state: 'AVAILABLE' } });
    if (!file?.storageKey) return reply.code(404).send({ ok: false });
    await audit(ctx.tenantId, ctx.session.sub, 'ProjectFile', file.id, 'FILE_DOWNLOADED', { version: file.version });
    const signed = await storage().getSignedUrl(file.storageKey, config.S3_SIGNED_URL_TTL_SECONDS);
    if (signed) return reply.redirect(signed);
    reply.header('content-type', file.mimeType || 'application/octet-stream');
    reply.header('content-disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    return reply.send(await storage().getStream(file.storageKey));
  });

  app.delete('/admin/files/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'file:write'); if (!ctx) return;
    const file = await prisma.projectFile.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId, deletedAt: null } });
    if (!file) return reply.code(404).send({ ok: false });
    // Soft delete (DB truth) + best-effort object removal. Object-delete failures
    // don't block the soft delete — a lifecycle policy / retry sweeps orphans.
    await prisma.projectFile.update({ where: { id: file.id }, data: { state: 'DELETED', deletedAt: new Date() } });
    if (file.storageKey) await storage().delete(file.storageKey).catch(() => req.log.warn({ fileId: file.id }, 'object delete failed; left for lifecycle policy'));
    await audit(ctx.tenantId, ctx.session.sub, 'ProjectFile', file.id, 'FILE_DELETED');
    return reply.send({ ok: true });
  });

  // ── Leads → client conversion ──
  app.get('/admin/leads', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'project:view'); if (!ctx) return;
    const leads = await prisma.lead.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, email: true, firstName: true, lastName: true, company: true, status: true, createdAt: true, _count: { select: { inquiries: true } } },
    });
    // Flag leads that already have a client org (converted).
    const convertedLeadIds = new Set((await prisma.clientOrg.findMany({ where: { tenantId: ctx.tenantId, leadId: { not: null } }, select: { leadId: true } })).map((o) => o.leadId));
    return reply.send({ ok: true, leads: leads.map((l) => ({ id: l.id, email: l.email, name: [l.firstName, l.lastName].filter(Boolean).join(' '), company: l.company, status: l.status, inquiries: l._count.inquiries, createdAt: l.createdAt, converted: convertedLeadIds.has(l.id) })) });
  });

  app.post('/admin/leads/:id/convert', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'lead:convert'); if (!ctx) return;
    const staff = await prisma.staffUser.findUnique({ where: { id: ctx.session.sub } });
    const staffName = staff ? [staff.firstName, staff.lastName].filter(Boolean).join(' ') || staff.email : 'Innovatix';
    const b = z.object({ projectName: z.string().trim().max(200).optional() }).safeParse(req.body ?? {});
    if (!b.success) return reply.code(400).send({ ok: false });
    try {
      const result = await convertLead(prisma, ctx.tenantId, ctx.session.sub, staffName, (req.params as { id: string }).id, { projectName: b.data.projectName });
      return reply.send({ ok: true, ...result });
    } catch (err) {
      if ((err as { code?: string }).code === 'NOT_FOUND') return reply.code(404).send({ ok: false, message: 'Lead not found' });
      req.log.error({ err: err instanceof Error ? err.message : String(err) }, 'lead conversion failed');
      return reply.code(500).send({ ok: false });
    }
  });

  // ── Notifications (staff) ──
  app.get('/admin/notifications', async (req, reply) => {
    const ctx = await requireStaff(req, reply); if (!ctx) return;
    const where = { tenantId: ctx.tenantId, recipientType: 'STAFF' as const, recipientId: ctx.session.sub };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30 }),
      prisma.notification.count({ where: { ...where, read: false } }),
    ]);
    return reply.send({ ok: true, unread, notifications: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, linkPath: n.linkPath, read: n.read, createdAt: n.createdAt })) });
  });
  app.post('/admin/notifications/:id/read', async (req, reply) => {
    const ctx = await requireStaff(req, reply); if (!ctx) return;
    await prisma.notification.updateMany({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId, recipientType: 'STAFF', recipientId: ctx.session.sub }, data: { read: true, readAt: new Date() } });
    return reply.send({ ok: true });
  });
  app.post('/admin/notifications/read-all', async (req, reply) => {
    const ctx = await requireStaff(req, reply); if (!ctx) return;
    await prisma.notification.updateMany({ where: { tenantId: ctx.tenantId, recipientType: 'STAFF', recipientId: ctx.session.sub, read: false }, data: { read: true, readAt: new Date() } });
    return reply.send({ ok: true });
  });
}
