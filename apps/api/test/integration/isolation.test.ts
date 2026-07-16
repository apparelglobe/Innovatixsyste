/**
 * Tenant / organization isolation — a user of one org cannot read or act on
 * another org's invoices, files, or approvals (IDOR). Cross-org access returns
 * 404 (never reveals existence). Cross-tenant lead isolation lives in leads.test.ts.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signSession } from '../../src/portal/auth';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let ownerA: { id: string; clientOrgId: string; email: string };
let ownerB: { id: string; clientOrgId: string; email: string };
let invoiceA: { id: string };
let fileA: { id: string };
let approvalA: { id: string };

const mkOwner = async (clientOrgId: string) => {
  const email = `owner-${uid()}@example.com`;
  return prisma.clientUser.create({ data: { tenantId, clientOrgId, email, normalizedEmail: email, passwordHash: 'x', role: 'OWNER' } });
};
const bearer = (u: { id: string; clientOrgId: string; email: string }) => ({
  authorization: `Bearer ${signSession({ sub: u.id, org: u.clientOrgId, tenant: tenantId, email: u.email })}`,
  'content-type': 'application/json',
});

before(async () => {
  app = await buildApp();
  const t = await resolveDefaultTenant(prisma);
  tenantId = t.id;
  const orgA = await prisma.clientOrg.create({ data: { tenantId, name: 'Iso A', slug: `iso-a-${uid()}` } });
  const orgB = await prisma.clientOrg.create({ data: { tenantId, name: 'Iso B', slug: `iso-b-${uid()}` } });
  ownerA = await mkOwner(orgA.id);
  ownerB = await mkOwner(orgB.id);
  const projectA = await prisma.project.create({ data: { tenantId, clientOrgId: orgA.id, name: 'Iso Proj A' } });
  invoiceA = await prisma.invoice.create({ data: { tenantId, projectId: projectA.id, number: `INV-${uid()}`, amountCents: 9000, status: 'SENT' } });
  fileA = await prisma.projectFile.create({ data: { tenantId, projectId: projectA.id, name: 'a.pdf', storageKey: `k-${uid()}`, clientVisible: true } });
  approvalA = await prisma.approval.create({ data: { tenantId, projectId: projectA.id, type: 'DELIVERABLE', subject: 'X' } });
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});

test('control: owner A can read own invoice (200)', async () => {
  const res = await app.inject({ method: 'GET', url: `/v1/portal/invoices/${invoiceA.id}`, headers: bearer(ownerA) });
  assert.equal(res.statusCode, 200);
});

test("cross-org: owner B cannot read org A's invoice (404)", async () => {
  const res = await app.inject({ method: 'GET', url: `/v1/portal/invoices/${invoiceA.id}`, headers: bearer(ownerB) });
  assert.equal(res.statusCode, 404);
});

test("cross-org: owner B cannot download org A's file (404)", async () => {
  const res = await app.inject({ method: 'GET', url: `/v1/portal/files/${fileA.id}/download`, headers: bearer(ownerB) });
  assert.equal(res.statusCode, 404);
});

test("cross-org: owner B cannot decide org A's approval (404, unchanged)", async () => {
  const res = await app.inject({ method: 'POST', url: `/v1/portal/approvals/${approvalA.id}/decide`, headers: bearer(ownerB), payload: JSON.stringify({ decision: 'APPROVED' }) });
  assert.equal(res.statusCode, 404);
  assert.equal((await prisma.approval.findUnique({ where: { id: approvalA.id } }))?.status, 'PENDING');
});
