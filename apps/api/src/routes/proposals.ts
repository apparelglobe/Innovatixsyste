/**
 * Public (unauthenticated) proposal secure-link routes — /v1/proposals/:token.
 * A prospect reviews / accepts / requests-changes on a proposal via a tokenized URL,
 * no login. Mirrors the invitation routes: tenant resolved server-side, per-hashed-IP
 * rate limiting, `logLevel: 'warn'` so the token in the path never lands in logs, and a
 * non-revealing {ok, status|code, message} dialect (unknown token = INVALID, reveals nothing).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { resolvePublicSiteTenant } from '../tenant';
import { hashAbuseIdentifier } from '../lib/crypto';
import { checkRateLimit } from '../lib/ratelimit';
import { inspectProposal, acceptProposal, requestChanges } from '../proposals/service';
import { inspectAgreement, signAgreement, agreementPdfByToken } from '../contracts/service';
import { depositStatusByToken, startDepositCheckout } from '../deposits/service';
import { cleanText } from '../lib/sanitize';
import { config } from '../config';

const tokenParam = z.object({ token: z.string().min(1).max(512) });
const changesBody = z.object({ note: z.string().trim().min(1).max(4000) });
const signBody = z.object({ signerName: z.string().trim().min(1).max(200), signerTitle: z.string().trim().max(120).optional() });

export async function registerProposalRoutes(app: FastifyInstance): Promise<void> {
  // Review — token is in the URL path → logLevel:'warn' keeps it out of info logs.
  app.get('/proposals/:token', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-view:${hashAbuseIdentifier(req.ip)}`, new Date(), 30);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    if (!p.success) return reply.send({ ok: true, status: 'INVALID' }); // malformed = same as unknown
    const r = await inspectProposal(prisma, p.data.token);
    if (r.status === 'VALID') return reply.send({ ok: true, status: 'VALID', proposal: r.proposal });
    return reply.send({ ok: true, status: r.status });
  });

  app.post('/proposals/:token/accept', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-accept:${hashAbuseIdentifier(req.ip)}`, new Date(), 10);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    if (!p.success) return reply.code(404).send({ ok: false, code: 'INVALID', message: 'This proposal link is invalid.' });
    const r = await acceptProposal(prisma, p.data.token);
    if (r.ok) return reply.send({ ok: true });
    switch (r.code) {
      case 'EXPIRED': return reply.code(410).send({ ok: false, code: 'EXPIRED', message: 'This proposal link has expired.' });
      case 'DECLINED': return reply.code(409).send({ ok: false, code: 'DECLINED', message: 'This proposal was declined.' });
      case 'ALREADY_ACCEPTED': return reply.code(409).send({ ok: false, code: 'ALREADY_ACCEPTED', message: 'This proposal has already been accepted.' });
      default: return reply.code(404).send({ ok: false, code: 'INVALID', message: 'This proposal link is invalid.' });
    }
  });

  app.post('/proposals/:token/request-changes', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-changes:${hashAbuseIdentifier(req.ip)}`, new Date(), 10);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    const b = changesBody.safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send({ ok: false, code: 'INVALID', message: 'Please include a short note about the changes you want.' });
    const r = await requestChanges(prisma, p.data.token, b.data.note);
    if (r.ok) return reply.send({ ok: true });
    if (r.code === 'EXPIRED') return reply.code(410).send({ ok: false, code: 'EXPIRED', message: 'This proposal link has expired.' });
    if (r.code === 'INVALID') return reply.code(404).send({ ok: false, code: 'INVALID', message: 'This proposal link is invalid.' });
    return reply.code(409).send({ ok: false, code: r.code, message: 'This proposal is already closed.' });
  });

  // ── Agreement — sign the accepted proposal on the SAME secure link ──
  app.get('/proposals/:token/agreement', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-agreement:${hashAbuseIdentifier(req.ip)}`, new Date(), 30);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    if (!p.success) return reply.send({ ok: true, status: 'INVALID' });
    const r = await inspectAgreement(prisma, p.data.token);
    if (r.status === 'READY' || r.status === 'SIGNED') {
      return reply.send({ ok: true, status: r.status, contract: r.contract, signerEmail: r.signerEmail, orgName: r.orgName });
    }
    return reply.send({ ok: true, status: r.status });
  });

  app.post('/proposals/:token/sign', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-sign:${hashAbuseIdentifier(req.ip)}`, new Date(), 10);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    const b = signBody.safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send({ ok: false, code: 'INVALID', message: 'Please type your full name to sign.' });
    const r = await signAgreement(prisma, p.data.token, {
      signerName: cleanText(b.data.signerName, 200),
      signerTitle: b.data.signerTitle ? cleanText(b.data.signerTitle, 120) : null,
      ipHash: hashAbuseIdentifier(req.ip),
      userAgent: (req.headers['user-agent'] || '').slice(0, 400) || null,
    });
    if (r.ok) return reply.send({ ok: true, number: r.number });
    if (r.code === 'ALREADY_SIGNED') return reply.code(409).send({ ok: false, code: 'ALREADY_SIGNED', message: 'This agreement has already been signed.' });
    if (r.code === 'NOT_ACCEPTED') return reply.code(409).send({ ok: false, code: 'NOT_ACCEPTED', message: 'Please accept the proposal before signing.' });
    return reply.code(404).send({ ok: false, code: 'INVALID', message: 'This proposal link is invalid.' });
  });

  // Download the signed-agreement PDF (rendered on demand from stored data).
  app.get('/proposals/:token/agreement/pdf', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-pdf:${hashAbuseIdentifier(req.ip)}`, new Date(), 30);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    if (!p.success) return reply.code(404).send({ ok: false });
    const pdf = await agreementPdfByToken(prisma, p.data.token);
    if (!pdf) return reply.code(404).send({ ok: false });
    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', 'inline; filename="Innovatix-agreement.pdf"');
    return reply.send(pdf);
  });

  // ── Activation deposit — payable on the same secure link, once the agreement is signed ──
  app.get('/proposals/:token/deposit', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-deposit:${hashAbuseIdentifier(req.ip)}`, new Date(), 30);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    if (!p.success) return reply.send({ ok: true, status: 'INVALID' });
    const d = await depositStatusByToken(prisma, p.data.token);
    return reply.send({ ok: true, ...d });
  });

  app.post('/proposals/:token/deposit/checkout', { logLevel: 'warn' }, async (req, reply) => {
    const tenant = await resolvePublicSiteTenant(prisma);
    const rl = await checkRateLimit(prisma, tenant.id, `proposal-deposit-checkout:${hashAbuseIdentifier(req.ip)}`, new Date(), 10);
    if (rl.limited) return reply.code(429).send({ ok: false, message: 'Too many attempts. Please try again shortly.' });
    const p = tokenParam.safeParse(req.params);
    if (!p.success) return reply.code(404).send({ ok: false, code: 'INVALID' });
    const origin = config.PORTAL_WEB_ORIGIN[0] || 'http://localhost:3001';
    const r = await startDepositCheckout(prisma, p.data.token, origin);
    if (r.ok) return reply.send({ ok: true, url: r.url });
    const statusByCode = { INVALID: 404, NOT_ACCEPTED: 409, NOT_SIGNED: 409, ALREADY_PAID: 409, ERROR: 502 } as const;
    return reply.code(statusByCode[r.code]).send({ ok: false, code: r.code });
  });
}
