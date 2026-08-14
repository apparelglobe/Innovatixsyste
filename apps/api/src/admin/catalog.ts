/**
 * Delivery-side (staff) service-catalog API — /v1/admin/services|packages|deliverables.
 * The catalog a proposal is assembled from: Service → ServicePackage → CatalogDeliverable.
 * Staff-authenticated + RBAC-guarded ('service:view' | 'service:write') + tenant-scoped,
 * mirroring the Projects resource in ./routes. Sensitive writes are audit-logged.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { cleanText } from '../lib/sanitize';
import { requireStaff, audit } from './routes';

const CATEGORY = z.enum(['WEB', 'MOBILE', 'SOFTWARE', 'CLOUD', 'AI', 'DATA', 'CONSULTING', 'OTHER']);

/** URL-safe slug from a name (or a provided slug). */
function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}

export async function registerCatalogRoutes(app: FastifyInstance): Promise<void> {
  // ── Services ──
  app.get('/admin/services', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:view'); if (!ctx) return;
    const services = await prisma.service.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { packages: true } } },
    });
    return reply.send({ ok: true, services: services.map((s) => ({ id: s.id, name: s.name, slug: s.slug, category: s.category, categorySlug: s.categorySlug, categoryLabel: s.categoryLabel, summary: s.summary, active: s.active, sortOrder: s.sortOrder, packages: s._count.packages })) });
  });

  app.post('/admin/services', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const b = z.object({
      name: z.string().trim().min(1).max(200),
      slug: z.string().trim().max(120).optional(),
      category: CATEGORY.optional(),
      categorySlug: z.string().trim().max(120).optional(),
      categoryLabel: z.string().trim().max(120).optional(),
      summary: z.string().trim().max(2000).optional(),
      sortOrder: z.number().int().optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const slug = slugify(b.data.slug ?? b.data.name);
    if (!slug) return reply.code(400).send({ ok: false, message: 'Could not derive a valid slug from the name.' });
    const dup = await prisma.service.findFirst({ where: { tenantId: ctx.tenantId, slug } });
    if (dup) return reply.code(409).send({ ok: false, message: 'A service with this slug already exists.' });
    const service = await prisma.service.create({ data: {
      tenantId: ctx.tenantId, slug,
      name: cleanText(b.data.name, 200),
      category: b.data.category ?? 'OTHER',
      categorySlug: b.data.categorySlug ? cleanText(b.data.categorySlug, 120) : null,
      categoryLabel: b.data.categoryLabel ? cleanText(b.data.categoryLabel, 120) : null,
      summary: b.data.summary ? cleanText(b.data.summary, 2000) : null,
      sortOrder: b.data.sortOrder ?? 0,
    } });
    await audit(ctx.tenantId, ctx.session.sub, 'Service', service.id, 'SERVICE_CREATED', { slug });
    return reply.send({ ok: true, service: { id: service.id } });
  });

  app.get('/admin/services/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:view'); if (!ctx) return;
    const service = await prisma.service.findFirst({
      where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId },
      include: { packages: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { deliverables: { orderBy: { sortOrder: 'asc' } } } } },
    });
    if (!service) return reply.code(404).send({ ok: false });
    return reply.send({ ok: true, service });
  });

  app.patch('/admin/services/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const s = await prisma.service.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!s) return reply.code(404).send({ ok: false });
    const b = z.object({
      name: z.string().trim().min(1).max(200).optional(),
      category: CATEGORY.optional(),
      categorySlug: z.string().trim().max(120).nullable().optional(),
      categoryLabel: z.string().trim().max(120).nullable().optional(),
      summary: z.string().trim().max(2000).nullable().optional(),
      active: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    await prisma.service.update({ where: { id: s.id }, data: {
      ...(b.data.name ? { name: cleanText(b.data.name, 200) } : {}),
      ...(b.data.category ? { category: b.data.category } : {}),
      ...(b.data.categorySlug !== undefined ? { categorySlug: b.data.categorySlug ? cleanText(b.data.categorySlug, 120) : null } : {}),
      ...(b.data.categoryLabel !== undefined ? { categoryLabel: b.data.categoryLabel ? cleanText(b.data.categoryLabel, 120) : null } : {}),
      ...(b.data.summary !== undefined ? { summary: b.data.summary ? cleanText(b.data.summary, 2000) : null } : {}),
      ...(b.data.active !== undefined ? { active: b.data.active } : {}),
      ...(b.data.sortOrder != null ? { sortOrder: b.data.sortOrder } : {}),
    } });
    await audit(ctx.tenantId, ctx.session.sub, 'Service', s.id, 'SERVICE_UPDATED', b.data);
    return reply.send({ ok: true });
  });

  app.delete('/admin/services/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const s = await prisma.service.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId }, include: { _count: { select: { packages: true } } } });
    if (!s) return reply.code(404).send({ ok: false });
    if (s._count.packages > 0) return reply.code(409).send({ ok: false, message: 'Remove the packages first, or deactivate the service instead.' });
    await prisma.service.delete({ where: { id: s.id } });
    await audit(ctx.tenantId, ctx.session.sub, 'Service', s.id, 'SERVICE_DELETED');
    return reply.send({ ok: true });
  });

  // ── Packages (children of a service) ──
  app.post('/admin/services/:id/packages', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const s = await prisma.service.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!s) return reply.code(404).send({ ok: false });
    const b = z.object({
      name: z.string().trim().min(1).max(200),
      summary: z.string().trim().max(2000).optional(),
      priceCents: z.number().int().min(0).nullable().optional(),
      currency: z.string().trim().length(3).optional(),
      sortOrder: z.number().int().optional(),
      deliverables: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const count = await prisma.servicePackage.count({ where: { serviceId: s.id } });
    const pkg = await prisma.servicePackage.create({ data: {
      tenantId: ctx.tenantId, serviceId: s.id,
      name: cleanText(b.data.name, 200),
      summary: b.data.summary ? cleanText(b.data.summary, 2000) : null,
      priceCents: b.data.priceCents ?? null,
      currency: b.data.currency ? b.data.currency.toUpperCase() : 'USD',
      sortOrder: b.data.sortOrder ?? count,
      ...(b.data.deliverables?.length
        ? { deliverables: { create: b.data.deliverables.map((label, i) => ({ tenantId: ctx.tenantId, label: cleanText(label, 300), sortOrder: i })) } }
        : {}),
    } });
    await audit(ctx.tenantId, ctx.session.sub, 'ServicePackage', pkg.id, 'PACKAGE_CREATED', { serviceId: s.id });
    return reply.send({ ok: true, package: { id: pkg.id } });
  });

  app.patch('/admin/packages/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const pkg = await prisma.servicePackage.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!pkg) return reply.code(404).send({ ok: false });
    const b = z.object({
      name: z.string().trim().min(1).max(200).optional(),
      summary: z.string().trim().max(2000).nullable().optional(),
      priceCents: z.number().int().min(0).nullable().optional(),
      currency: z.string().trim().length(3).optional(),
      active: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    await prisma.servicePackage.update({ where: { id: pkg.id }, data: {
      ...(b.data.name ? { name: cleanText(b.data.name, 200) } : {}),
      ...(b.data.summary !== undefined ? { summary: b.data.summary ? cleanText(b.data.summary, 2000) : null } : {}),
      ...(b.data.priceCents !== undefined ? { priceCents: b.data.priceCents } : {}),
      ...(b.data.currency ? { currency: b.data.currency.toUpperCase() } : {}),
      ...(b.data.active !== undefined ? { active: b.data.active } : {}),
      ...(b.data.sortOrder != null ? { sortOrder: b.data.sortOrder } : {}),
    } });
    await audit(ctx.tenantId, ctx.session.sub, 'ServicePackage', pkg.id, 'PACKAGE_UPDATED', b.data);
    return reply.send({ ok: true });
  });

  app.delete('/admin/packages/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const pkg = await prisma.servicePackage.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!pkg) return reply.code(404).send({ ok: false });
    // A package cited on a proposal keeps its history; block hard-delete so we don't silently detach it.
    const refs = await prisma.proposalLineItem.count({ where: { servicePackageId: pkg.id } });
    if (refs > 0) return reply.code(409).send({ ok: false, message: 'This package is used on a proposal; deactivate it instead.' });
    await prisma.$transaction([
      prisma.catalogDeliverable.deleteMany({ where: { servicePackageId: pkg.id } }),
      prisma.servicePackage.delete({ where: { id: pkg.id } }),
    ]);
    await audit(ctx.tenantId, ctx.session.sub, 'ServicePackage', pkg.id, 'PACKAGE_DELETED');
    return reply.send({ ok: true });
  });

  // ── Deliverables (children of a package) ──
  app.post('/admin/packages/:id/deliverables', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const pkg = await prisma.servicePackage.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!pkg) return reply.code(404).send({ ok: false });
    const b = z.object({ label: z.string().trim().min(1).max(300), sortOrder: z.number().int().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    const count = await prisma.catalogDeliverable.count({ where: { servicePackageId: pkg.id } });
    const d = await prisma.catalogDeliverable.create({ data: { tenantId: ctx.tenantId, servicePackageId: pkg.id, label: cleanText(b.data.label, 300), sortOrder: b.data.sortOrder ?? count } });
    return reply.send({ ok: true, deliverable: { id: d.id } });
  });

  app.patch('/admin/deliverables/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const d = await prisma.catalogDeliverable.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!d) return reply.code(404).send({ ok: false });
    const b = z.object({ label: z.string().trim().min(1).max(300).optional(), sortOrder: z.number().int().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ ok: false });
    await prisma.catalogDeliverable.update({ where: { id: d.id }, data: { ...(b.data.label ? { label: cleanText(b.data.label, 300) } : {}), ...(b.data.sortOrder != null ? { sortOrder: b.data.sortOrder } : {}) } });
    return reply.send({ ok: true });
  });

  app.delete('/admin/deliverables/:id', async (req, reply) => {
    const ctx = await requireStaff(req, reply, 'service:write'); if (!ctx) return;
    const d = await prisma.catalogDeliverable.findFirst({ where: { id: (req.params as { id: string }).id, tenantId: ctx.tenantId } });
    if (!d) return reply.code(404).send({ ok: false });
    await prisma.catalogDeliverable.delete({ where: { id: d.id } });
    return reply.send({ ok: true });
  });
}
