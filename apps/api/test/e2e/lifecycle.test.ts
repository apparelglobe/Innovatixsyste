/**
 * End-to-end business lifecycle across BOTH actors over real HTTP:
 *   lead (public) → staff converts → client accepts the emailed invitation +
 *   sets a password → staff publishes report + requests approval → client sees
 *   them → client approves → staff invoices → client pays → file authorization.
 *
 * Honest scope: every step is a real HTTP request against the built app on the
 * test database. Staff auth uses a minted JWT (equivalent to login); the OWNER is
 * created for real by accepting the secure invitation. This is a genuine
 * cross-actor onboarding-through-billing flow, not a single route in isolation.
 */
import '../_setup';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/main';
import { prisma } from '../../src/db';
import { resolveDefaultTenant } from '../../src/tenant';
import { signStaff } from '../../src/staff/auth';
import { signSession } from '../../src/portal/auth';

const uid = () => randomUUID().slice(0, 8);
let app: Awaited<ReturnType<typeof buildApp>>;
let tenantId: string;
let staffAuth: Record<string, string>;

before(async () => {
  app = await buildApp();
  const t = await resolveDefaultTenant(prisma);
  tenantId = t.id;
  const semail = `staff-${uid()}@example.com`;
  const staff = await prisma.staffUser.create({ data: { tenantId, email: semail, normalizedEmail: semail, passwordHash: 'x', role: 'ADMIN', active: true } });
  staffAuth = { authorization: `Bearer ${signStaff({ sub: staff.id, role: 'ADMIN', tenant: tenantId, email: semail })}`, 'content-type': 'application/json' };
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});

test('full lifecycle: lead → convert → report+approval → client approves → invoice → pay → file authz', async () => {
  // 1) Public lead submission → persisted
  const email = `e2e-${uid()}@example.com`;
  const leadRes = await app.inject({
    method: 'POST', url: '/v1/leads',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:4030', 'x-forwarded-for': `10.9.9.${1 + ((Math.random() * 250) | 0)}` },
    payload: JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace', businessEmail: email, company: 'Analytical Co', form: 'CONTACT', serviceInterest: 'ERP Development', projectDescription: 'We need an ERP.', idempotencyKey: `e2e-${uid()}` }),
  });
  assert.equal(leadRes.statusCode, 202);
  const lead = await prisma.lead.findFirstOrThrow({ where: { tenantId, normalizedEmail: email } });

  // 2) Staff converts the lead → org + project + a SECURE INVITATION (no user yet)
  const conv = await app.inject({ method: 'POST', url: `/v1/admin/leads/${lead.id}/convert`, headers: staffAuth, payload: '{}' });
  assert.equal(conv.statusCode, 200);
  const project = await prisma.project.findFirstOrThrow({ where: { tenantId, leadId: lead.id } });

  // 2b) Client accepts the emailed invitation + sets a password → OWNER created.
  const mail = await prisma.emailOutbox.findFirstOrThrow({ where: { tenantId, toAddress: email, type: 'PORTAL_INVITE' }, orderBy: { createdAt: 'desc' } });
  const token = /setup-account\?token=([A-Za-z0-9\-_]+)/.exec(mail.textBody)?.[1];
  assert.ok(token, 'invitation email should contain a setup token');
  const accept = await app.inject({ method: 'POST', url: `/v1/auth/invitations/${token}/accept`, headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.8.8.${1 + ((Math.random() * 250) | 0)}` }, payload: JSON.stringify({ password: 'lifecycle-strong-pass-2026' }) });
  assert.equal(accept.statusCode, 200);
  const owner = await prisma.clientUser.findFirstOrThrow({ where: { tenantId, clientOrgId: project.clientOrgId, role: 'OWNER' } });
  const ownerAuth = { authorization: `Bearer ${signSession({ sub: owner.id, org: project.clientOrgId, tenant: tenantId, email: owner.email })}`, 'content-type': 'application/json' };

  // 3) Staff publishes a report + requests an approval
  assert.equal((await app.inject({ method: 'POST', url: `/v1/admin/projects/${project.id}/reports`, headers: staffAuth, payload: JSON.stringify({ kind: 'WEEKLY', title: 'Week 1', summary: 'Kickoff complete.' }) })).statusCode, 200);
  assert.equal((await app.inject({ method: 'POST', url: `/v1/admin/projects/${project.id}/approvals`, headers: staffAuth, payload: JSON.stringify({ type: 'DELIVERABLE', subject: 'Discovery sign-off' }) })).statusCode, 200);

  // 4) Client sees the report + the pending approval
  const view = await app.inject({ method: 'GET', url: '/v1/portal/project', headers: ownerAuth });
  assert.equal(view.statusCode, 200);
  const proj = view.json().project;
  assert.ok(proj.reports.length >= 1, 'client should see the published report');
  const pending = proj.approvals.find((a: { status: string }) => a.status === 'PENDING');
  assert.ok(pending, 'client should see a pending approval');

  // 5) Client (owner) approves
  assert.equal((await app.inject({ method: 'POST', url: `/v1/portal/approvals/${pending.id}/decide`, headers: ownerAuth, payload: JSON.stringify({ decision: 'APPROVED' }) })).statusCode, 200);
  assert.equal((await prisma.approval.findUnique({ where: { id: pending.id } }))?.status, 'APPROVED');

  // 6) Staff invoices; 7) client pays → PAID transition
  const number = `INV-${uid()}`;
  assert.equal((await app.inject({ method: 'POST', url: `/v1/admin/projects/${project.id}/invoices`, headers: staffAuth, payload: JSON.stringify({ number, status: 'SENT', lineItems: [{ description: 'Discovery', unitCents: 250000 }] }) })).statusCode, 200);
  const invoice = await prisma.invoice.findFirstOrThrow({ where: { tenantId, number } });
  assert.equal((await app.inject({ method: 'POST', url: `/v1/portal/invoices/${invoice.id}/pay-demo`, headers: ownerAuth })).statusCode, 200);
  assert.equal((await prisma.invoice.findUnique({ where: { id: invoice.id } }))?.status, 'PAID');

  // 8) File authorization — a non-client-visible file is NOT downloadable by the client
  const hidden = await prisma.projectFile.create({ data: { tenantId, projectId: project.id, name: 'internal.pdf', storageKey: `k-${uid()}`, clientVisible: false } });
  assert.equal((await app.inject({ method: 'GET', url: `/v1/portal/files/${hidden.id}/download`, headers: ownerAuth })).statusCode, 404);
});
