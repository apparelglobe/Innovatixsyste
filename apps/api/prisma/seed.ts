/**
 * Seed: the default Innovatix tenant + a demo client-portal dataset so the
 * portal is viewable end to end. Idempotent (safe to re-run).
 * Run: npm run db:seed   (demo login printed below)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { CATALOG_SEED } from './seed-data/catalog.js';

const prisma = new PrismaClient();
const slug = process.env.INNOVATIX_DEFAULT_TENANT_SLUG || 'innovatix-systems';

const DEMO_EMAIL = 'client@demo.innovatixmarketing.com';
const DEMO_PASSWORD = 'portal-demo-2026';

async function seedPortal(tenantId: string) {
  const org = await prisma.clientOrg.upsert({
    where: { tenantId_slug: { tenantId, slug: 'northwind-traders' } },
    update: {},
    create: { tenantId, name: 'Northwind Traders', slug: 'northwind-traders' },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.clientUser.upsert({
    where: { tenantId_normalizedEmail: { tenantId, normalizedEmail: DEMO_EMAIL } },
    update: { passwordHash },
    create: {
      tenantId,
      clientOrgId: org.id,
      email: DEMO_EMAIL,
      normalizedEmail: DEMO_EMAIL,
      passwordHash,
      firstName: 'Dana',
      lastName: 'Okoro',
      role: 'OWNER',
    },
  });

  // One demo project — idempotent by (clientOrgId, code).
  const existing = await prisma.project.findFirst({ where: { tenantId, clientOrgId: org.id, code: 'ALPHA' } });
  if (existing) {
    console.log('✓ portal demo already seeded');
    return;
  }
  const project = await prisma.project.create({
    data: {
      tenantId,
      clientOrgId: org.id,
      name: 'Project Alpha',
      code: 'ALPHA',
      status: 'IN_PROGRESS',
      percentComplete: 72,
      startDate: new Date('2026-02-01'),
      dueDate: new Date('2026-05-24'),
    },
  });

  const milestones: [string, number, 'PLANNED' | 'IN_PROGRESS' | 'DONE', string][] = [
    ['Discovery & Planning', 1, 'DONE', '2026-02-10'],
    ['System Architecture', 2, 'DONE', '2026-02-24'],
    ['Development', 3, 'IN_PROGRESS', '2026-03-10'],
    ['Testing & QA', 4, 'PLANNED', '2026-04-14'],
    ['Deployment', 5, 'PLANNED', '2026-05-24'],
  ];
  for (const [name, sequence, status, due] of milestones) {
    await prisma.milestone.create({
      data: {
        tenantId, projectId: project.id, name, sequence, status,
        dueDate: new Date(due),
        completedAt: status === 'DONE' ? new Date(due) : null,
      },
    });
  }

  await prisma.projectReport.createMany({
    data: [
      { tenantId, projectId: project.id, kind: 'WEEKLY', title: 'Week 6 — Development progress', summary: 'Order-capture and allocation services reached feature-complete for the primary marketplace channel. Integration test suite expanded; two edge cases in split-fulfillment routing identified and scheduled.', periodStart: new Date('2026-03-02'), periodEnd: new Date('2026-03-08') },
      { tenantId, projectId: project.id, kind: 'DAILY', title: 'Daily — inventory sync hardening', summary: 'Added idempotency keys to the marketplace inventory webhook consumer and a reconciliation job that flags drift between channels. No blocking issues.', periodStart: new Date('2026-03-08'), periodEnd: new Date('2026-03-08') },
    ],
  });

  await prisma.projectMember.createMany({
    data: [
      { tenantId, projectId: project.id, name: 'A. Rahman', role: 'Delivery Lead' },
      { tenantId, projectId: project.id, name: 'J. Okafor', role: 'Senior Engineer' },
      { tenantId, projectId: project.id, name: 'M. Silva', role: 'QA Engineer' },
    ],
  });

  await prisma.approval.create({
    data: { tenantId, projectId: project.id, subject: 'Approve Development milestone acceptance criteria', status: 'PENDING' },
  });

  await prisma.invoice.createMany({
    data: [
      { tenantId, projectId: project.id, number: 'INV-2026-014', amountCents: 4200000, status: 'PAID', issuedAt: new Date('2026-02-01'), paidAt: new Date('2026-02-05') },
      { tenantId, projectId: project.id, number: 'INV-2026-021', amountCents: 4200000, status: 'SENT', issuedAt: new Date('2026-03-01'), dueAt: new Date('2026-03-15') },
    ],
  });

  await prisma.projectFile.createMany({
    data: [
      { tenantId, projectId: project.id, name: 'Statement of Work.pdf', category: 'CONTRACT', sizeBytes: 248_000 },
      { tenantId, projectId: project.id, name: 'Solution Architecture.pdf', category: 'DELIVERABLE', sizeBytes: 1_120_000 },
    ],
  });

  await prisma.portalActivity.createMany({
    data: [
      { tenantId, projectId: project.id, type: 'REPORT', message: 'Weekly development report published' },
      { tenantId, projectId: project.id, type: 'MILESTONE', message: 'System Architecture milestone approved' },
      { tenantId, projectId: project.id, type: 'FILE', message: 'Solution Architecture.pdf uploaded' },
    ],
  });

  console.log(`✓ seeded portal demo: ${org.name} / Project Alpha`);
}

const STAFF_EMAIL = 'staff@innovatixmarketing.com';
const STAFF_PASSWORD = 'staff-demo-2026';

async function seedStaff(tenantId: string) {
  const passwordHash = await bcrypt.hash(STAFF_PASSWORD, 10);
  await prisma.staffUser.upsert({
    where: { tenantId_normalizedEmail: { tenantId, normalizedEmail: STAFF_EMAIL } },
    update: { passwordHash },
    create: { tenantId, email: STAFF_EMAIL, normalizedEmail: STAFF_EMAIL, passwordHash, firstName: 'Sam', lastName: 'Admin', role: 'ADMIN' },
  });
  const engineers: [string, string, string, 'DELIVERY_LEAD' | 'ENGINEER'][] = [
    ['lead@innovatixmarketing.com', 'Ava', 'Lead', 'DELIVERY_LEAD'],
    ['eng@innovatixmarketing.com', 'Ravi', 'Eng', 'ENGINEER'],
  ];
  for (const [email, firstName, lastName, role] of engineers) {
    await prisma.staffUser.upsert({
      where: { tenantId_normalizedEmail: { tenantId, normalizedEmail: email } },
      update: {},
      create: { tenantId, email, normalizedEmail: email, passwordHash, firstName, lastName, role },
    });
  }
  console.log('✓ seeded staff users (admin + delivery lead + engineer)');
}

// Full service catalog — the real 61 Innovatix services, generated from the marketing
// site (apps/systems-web) into ./seed-data/catalog.ts. No pricing tiers on the site, so
// each service gets one quote-only "Custom engagement" package carrying its verbatim
// "What you get" deliverables. Idempotent (upsert by slug; deliverables replaced in place).
async function seedCatalog(tenantId: string) {
  // Reconcile: drop any catalog services no longer in the generated set (e.g. earlier starter rows).
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
  if (stale.length) console.log(`✓ catalog reconcile: removed ${stale.length} stale service(s)`);
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
  console.log(`✓ seeded catalog: ${CATALOG_SEED.length} services (full catalog, 1 package each)`);
}

async function main() {
  const tenant = await prisma.tenant.upsert({ where: { slug }, update: {}, create: { slug, name: 'Innovatix Systems' } });
  console.log(`✓ seeded tenant: ${tenant.slug} (${tenant.id})`);
  await seedPortal(tenant.id);
  await seedStaff(tenant.id);
  await seedCatalog(tenant.id);
  console.log(`\n  Portal (client) login → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Admin (staff) login  → ${STAFF_EMAIL} / ${STAFF_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
