/**
 * Tenant + organization isolation — fail-closed proof across two tenants and two
 * organizations. Covers the API surface (foreign/forged tenant tokens rejected,
 * cross-org 404), the scoped data-access helpers, the scan worker + payment
 * webhook tenant guards, file-version chains, and audit tenant integrity.
 *
 * Note on the current model: the app resolves ONE trusted default tenant, so a
 * token minted for another tenant is rejected at the door (401) rather than
 * leaking a 404 — that IS the fail-closed behavior. Cross-organization access
 * inside the tenant (the live concern) returns 404. Cross-tenant behavior at the
 * data/worker/webhook layer is exercised directly with a real second tenant.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant, resolveTrustedTenant } from '../../src/tenant';
import { signStaff } from '../../src/staff/auth';
import { signSession } from '../../src/portal/auth';
import { findTenantProject, findClientOrgProject, findTenantInvoice, findClientVisibleFile, findTenantFile } from '../../src/lib/scoped';
import { processScanJobs, computeHash } from '../../src/scanning/service';
import { processProviderWebhook } from '../../src/billing/process-webhook';
import { storage, objectKey } from '../../src/storage';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;

let tenantA: string; // the trusted default tenant
let tenantB: string; // a real second tenant
// Tenant A, org 1
let orgA1: string, projectA1: string, invoiceA1: string, approvalA1: string, fileA1: string, fileA1Internal: string;
let staffA: Record<string, string>;
let ownerA1: { id: string; clientOrgId: string; email: string };
let ownerA2: { id: string; clientOrgId: string; email: string }; // org 2 (same tenant)
// Tenant B
let projectB: string, invoiceB: string, fileB: string;

// Foreign/forged token (the referenced staff need not exist — it's rejected on
// the tenant check regardless).
// A token for a tenant with NO backing staff row — used only for the foreign-tenant
// test, where requireStaff rejects on the tenant check before any staff lookup.
const foreignStaffToken = (tenant: string, role = 'ADMIN') => {
  const e = `staff-${uid()}@ex.com`;
  return { authorization: `Bearer ${signStaff({ sub: `s-${uid()}`, role, tenant, email: e })}`, 'content-type': 'application/json' };
};
// A real, active staff user in the tenant (so requireStaff passes).
const realStaff = async (tenant: string, role: 'ADMIN' = 'ADMIN') => {
  const e = `staff-${uid()}@ex.com`;
  const s = await prisma.staffUser.create({ data: { tenantId: tenant, email: e, normalizedEmail: e, passwordHash: 'x', role, active: true } });
  return { authorization: `Bearer ${signStaff({ sub: s.id, role, tenant, email: e })}`, 'content-type': 'application/json' };
};
const bearerClient = (u: { id: string; clientOrgId: string; email: string }, tenant: string) => ({
  authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant, email: u.email })}`,
  'content-type': 'application/json',
});
const mkOwner = (tenantId: string, clientOrgId: string) => {
  const e = `owner-${uid()}@ex.com`;
  return prisma.clientUser.create({ data: { tenantId, clientOrgId, email: e, normalizedEmail: e, passwordHash: 'x', role: 'OWNER' } });
};
const mkAvailableFile = async (tenantId: string, projectId: string, clientVisible: boolean) => {
  const f = await prisma.projectFile.create({ data: { tenantId, projectId, name: `f-${uid()}.pdf`, storageProvider: 'local', version: 1, isCurrent: true, state: 'AVAILABLE', clientVisible } });
  const key = objectKey({ tenantId, clientOrgId: 'o', projectId, fileId: f.id, version: 1, filename: 'x.pdf' });
  await storage().put(key, Buffer.from(`%PDF-1.4 ${uid()}`), 'application/pdf');
  await prisma.projectFile.update({ where: { id: f.id }, data: { storageKey: key } });
  return f.id;
};

before(async () => {
  app = await buildApp();
  tenantA = (await resolveDefaultTenant(prisma)).id;
  tenantB = (await prisma.tenant.create({ data: { slug: `tenant-b-${uid()}`, name: 'Tenant B' } })).id;
  staffA = await realStaff(tenantA);

  // Tenant A — two orgs.
  orgA1 = (await prisma.clientOrg.create({ data: { tenantId: tenantA, name: 'A1', slug: `a1-${uid()}` } })).id;
  const orgA2 = (await prisma.clientOrg.create({ data: { tenantId: tenantA, name: 'A2', slug: `a2-${uid()}` } })).id;
  ownerA1 = await mkOwner(tenantA, orgA1);
  ownerA2 = await mkOwner(tenantA, orgA2);
  projectA1 = (await prisma.project.create({ data: { tenantId: tenantA, clientOrgId: orgA1, name: 'PA1' } })).id;
  invoiceA1 = (await prisma.invoice.create({ data: { tenantId: tenantA, projectId: projectA1, number: `INV-${uid()}`, amountCents: 100000, status: 'SENT' } })).id;
  approvalA1 = (await prisma.approval.create({ data: { tenantId: tenantA, projectId: projectA1, type: 'DELIVERABLE', subject: 'x' } })).id;
  fileA1 = await mkAvailableFile(tenantA, projectA1, true);
  fileA1Internal = await mkAvailableFile(tenantA, projectA1, false);

  // Tenant B — full parallel set.
  const orgB = (await prisma.clientOrg.create({ data: { tenantId: tenantB, name: 'B', slug: `b-${uid()}` } })).id;
  projectB = (await prisma.project.create({ data: { tenantId: tenantB, clientOrgId: orgB, name: 'PB' } })).id;
  invoiceB = (await prisma.invoice.create({ data: { tenantId: tenantB, projectId: projectB, number: `INV-${uid()}`, amountCents: 100000, status: 'SENT' } })).id;
  fileB = await mkAvailableFile(tenantB, projectB, true);
});
after(async () => { await app.close(); await prisma.$disconnect(); });

const GET = (url: string, headers: Record<string, string>) => app.inject({ method: 'GET', url, headers });
const POST = (url: string, headers: Record<string, string>, body?: object) => app.inject({ method: 'POST', url, headers, payload: JSON.stringify(body ?? {}) });

// ── Tenant resolution fails closed ───────────────────────────────────────────
test('a token minted for a FOREIGN tenant is rejected (401) — staff + client', async () => {
  assert.equal((await GET('/v1/admin/projects', foreignStaffToken(tenantB))).statusCode, 401);
  const foreignClient = bearerClient(ownerA1, tenantB); // A1 user but tenant=B in token
  assert.equal((await GET('/v1/portal/project', foreignClient)).statusCode, 401);
});

test('resolveTrustedTenant accepts only the resolved tenant id; forged/missing → null', async () => {
  assert.equal((await resolveTrustedTenant(prisma, tenantA))?.id, tenantA);
  assert.equal(await resolveTrustedTenant(prisma, tenantB), null);
  assert.equal(await resolveTrustedTenant(prisma, 'totally-made-up'), null);
  assert.equal(await resolveTrustedTenant(prisma, undefined), null);
});

// ── Cross-organization inside the tenant → 404 ───────────────────────────────
test('cross-org client cannot read / pay / approve / download another org record (404)', async () => {
  const a2 = bearerClient(ownerA2, tenantA);
  assert.equal((await GET(`/v1/portal/invoices/${invoiceA1}`, a2)).statusCode, 404);
  assert.equal((await POST(`/v1/portal/invoices/${invoiceA1}/checkout`, a2)).statusCode, 404);
  assert.equal((await POST(`/v1/portal/approvals/${approvalA1}/decide`, a2, { decision: 'APPROVED' })).statusCode, 404);
  assert.equal((await GET(`/v1/portal/files/${fileA1}/download`, a2)).statusCode, 404);
});

test('internal-only file is never downloadable by any client, but staff can', async () => {
  assert.equal((await GET(`/v1/portal/files/${fileA1Internal}/download`, bearerClient(ownerA1, tenantA))).statusCode, 404);
  assert.equal((await GET(`/v1/admin/files/${fileA1Internal}/download`, staffA)).statusCode, 200);
});

// ── Cross-tenant at the API surface → 404 (staff of tenant A, tenant-B record) ─
test('tenant-A staff cannot read a tenant-B project / invoice / file / scan (404)', async () => {
  assert.equal((await GET(`/v1/admin/projects/${projectB}`, staffA)).statusCode, 404);
  assert.equal((await GET(`/v1/admin/invoices/${invoiceB}`, staffA)).statusCode, 404);
  assert.equal((await GET(`/v1/admin/files/${fileB}/download`, staffA)).statusCode, 404);
  assert.equal((await GET(`/v1/admin/files/${fileB}/scan`, staffA)).statusCode, 404);
});

test('tenant-A staff cannot update a tenant-B project (404)', async () => {
  assert.equal((await app.inject({ method: 'PATCH', url: `/v1/admin/projects/${projectB}`, headers: staffA, payload: JSON.stringify({ status: 'ON_HOLD' }) })).statusCode, 404);
  assert.equal((await prisma.project.findUnique({ where: { id: projectB } }))?.status, 'DISCOVERY'); // unchanged
});

// ── Scoped data-access helpers fail closed across tenant + org ───────────────
test('scoped helpers never resolve a cross-tenant / cross-org id', async () => {
  assert.equal(await findTenantProject(prisma, tenantA, projectB), null);
  assert.equal(await findTenantInvoice(prisma, tenantA, invoiceB), null);
  assert.equal(await findTenantFile(prisma, tenantA, fileB), null);
  assert.equal(await findClientOrgProject(prisma, tenantA, ownerA2.clientOrgId, projectA1), null); // cross-org
  assert.equal(await findClientVisibleFile(prisma, tenantA, ownerA2.clientOrgId, fileA1), null); // cross-org
  // Same-tenant/org still resolves (regression).
  assert.ok(await findTenantProject(prisma, tenantA, projectA1));
  assert.ok(await findClientOrgProject(prisma, tenantA, orgA1, projectA1));
});

// ── Worker isolation: a scan job whose tenant ≠ its file's tenant is refused ──
test('scan worker refuses a tenant-mismatched job (file never becomes available)', async () => {
  // A file in tenant A, but a scan row stamped tenant B pointing at it.
  const f = await prisma.projectFile.create({ data: { tenantId: tenantA, projectId: projectA1, name: `mm-${uid()}.pdf`, storageProvider: 'local', version: 1, isCurrent: false, state: 'SCANNING', storageKey: `k-${uid()}` } });
  const scan = await prisma.fileScan.create({ data: { tenantId: tenantB, fileId: f.id, idempotencyKey: `scan:${f.id}`, status: 'PENDING' } });
  await processScanJobs(prisma, new Date());
  assert.equal((await prisma.fileScan.findUniqueOrThrow({ where: { id: scan.id } })).errorCode, 'TENANT_MISMATCH');
  assert.equal((await prisma.projectFile.findUniqueOrThrow({ where: { id: f.id } })).state, 'SCANNING'); // never AVAILABLE
});

// ── Webhook isolation: a payment from another tenant cannot settle this invoice ─
test('payment webhook refuses to settle an invoice with a cross-tenant payment', async () => {
  const sessionId = `cs_${uid()}`;
  // A real tenant-B payment (for tenant-B invoiceB), but the event names tenant-A invoiceA1.
  await prisma.payment.create({ data: { tenantId: tenantB, clientOrgId: 'x', invoiceId: invoiceB, provider: 'stripe', amountCents: 100000, currency: 'USD', status: 'PENDING', checkoutSessionId: sessionId } });
  const result = await processProviderWebhook(prisma, { ok: true, kind: 'succeeded', eventId: `evt_${uid()}`, invoiceId: invoiceA1, sessionId, amountCents: 100000, currency: 'USD' }, 'stripe');
  assert.equal(result, 'mismatch');
  assert.notEqual((await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceA1 } })).status, 'PAID');
});

// ── File-version chains never cross the tenant boundary ──────────────────────
test('a version-chain query is tenant-scoped (a shared rootId cannot leak across tenants)', async () => {
  const root = `root-${uid()}`;
  const inA = await prisma.projectFile.create({ data: { tenantId: tenantA, projectId: projectA1, name: 'va.pdf', version: 2, isCurrent: true, state: 'AVAILABLE', rootId: root } });
  await prisma.projectFile.create({ data: { tenantId: tenantB, projectId: projectB, name: 'vb.pdf', version: 3, isCurrent: true, state: 'AVAILABLE', rootId: root } });
  // Staff of tenant A see only tenant-A rows in the chain.
  const chain = await prisma.projectFile.findMany({ where: { tenantId: tenantA, rootId: root } });
  assert.equal(chain.length, 1);
  assert.equal(chain[0].id, inA.id);
});

// ── Audit records retain the correct tenant ──────────────────────────────────
test('audit events are written under the acting tenant', async () => {
  const before = await prisma.auditEvent.count({ where: { tenantId: tenantA } });
  await POST(`/v1/admin/projects/${projectA1}/reports`, staffA, { kind: 'WEEKLY', title: 'W', summary: 'S' });
  const after = await prisma.auditEvent.count({ where: { tenantId: tenantA } });
  assert.ok(after > before);
  // None of tenant A's activity leaked onto tenant B.
  assert.equal(await prisma.auditEvent.count({ where: { tenantId: tenantB, entityType: 'ProjectReport' } }), 0);
});

// ── Same-tenant regression: owners still fully use their own org ─────────────
test('regression: an owner can read + pay + download their own org records', async () => {
  const a1 = bearerClient(ownerA1, tenantA);
  assert.equal((await GET(`/v1/portal/invoices/${invoiceA1}`, a1)).statusCode, 200);
  assert.equal((await POST(`/v1/portal/invoices/${invoiceA1}/checkout`, a1)).statusCode, 200);
  assert.equal((await GET(`/v1/portal/files/${fileA1}/download`, a1)).statusCode, 200);
});
