/**
 * Catalog-only seed — SAFE FOR PRODUCTION. Seeds the full 61-service catalog
 * (services → one "Custom engagement" package → deliverables) and NOTHING else:
 * no demo client org, no demo client user, no demo staff. Idempotent (upsert +
 * reconcile). Run: tsx prisma/seed-catalog.ts   (uses DATABASE_URL from the env).
 */
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { CATALOG_SEED } from './seed-data/catalog.js';

const prisma = new PrismaClient();
const slug = process.env.INNOVATIX_DEFAULT_TENANT_SLUG || 'innovatix-systems';

async function main() {
  const tenant = await prisma.tenant.upsert({ where: { slug }, update: {}, create: { slug, name: 'Innovatix Systems' } });
  const tenantId = tenant.id;

  // Reconcile: drop any catalog services no longer in the generated set.
  const keep = CATALOG_SEED.map((c) => c.slug);
  const stale = await prisma.service.findMany({ where: { tenantId, slug: { notIn: keep } }, select: { id: true } });
  for (const s of stale) {
    const pkgs = await prisma.servicePackage.findMany({ where: { serviceId: s.id }, select: { id: true } });
    const pkgIds = pkgs.map((p) => p.id);
    if (pkgIds.length) {
      await prisma.catalogDeliverable.deleteMany({ where: { servicePackageId: { in: pkgIds } } });
      await prisma.servicePackage.deleteMany({ where: { id: { in: pkgIds } } });
    }
    await prisma.service.delete({ where: { id: s.id } });
  }
  if (stale.length) console.log(`✓ reconcile: removed ${stale.length} stale service(s)`);

  for (let i = 0; i < CATALOG_SEED.length; i++) {
    const c = CATALOG_SEED[i];
    const service = await prisma.service.upsert({
      where: { tenantId_slug: { tenantId, slug: c.slug } },
      update: { name: c.name, category: c.category, categorySlug: c.categorySlug, categoryLabel: c.categoryLabel, summary: c.summary, sortOrder: i },
      create: { tenantId, slug: c.slug, name: c.name, category: c.category, categorySlug: c.categorySlug, categoryLabel: c.categoryLabel, summary: c.summary, sortOrder: i },
    });
    let pkg = await prisma.servicePackage.findFirst({ where: { tenantId, serviceId: service.id, name: 'Custom engagement' } });
    if (!pkg) {
      pkg = await prisma.servicePackage.create({
        data: { tenantId, serviceId: service.id, name: 'Custom engagement', summary: 'Scoped during discovery; fixed-scope proposal with milestone-based pricing.', priceCents: null, sortOrder: 0 },
      });
    }
    await prisma.catalogDeliverable.deleteMany({ where: { tenantId, servicePackageId: pkg.id } });
    await prisma.catalogDeliverable.createMany({ data: c.deliverables.map((label, idx) => ({ tenantId, servicePackageId: pkg!.id, label, sortOrder: idx })) });
  }
  console.log(`✓ catalog seeded on tenant "${tenant.slug}": ${CATALOG_SEED.length} services (no demo data created)`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
