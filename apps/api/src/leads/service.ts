/**
 * Lead intake pipeline.
 *
 * Order: validate (caller) → spam → idempotency replay → resolve/dedup lead →
 * create inquiry + attribution + audit + activity + PENDING side-effect jobs
 * (one transaction) → return. A worker later drains the jobs (emails, internal
 * notify, assignment, SLA) with retry/backoff. Nothing is ever silently dropped.
 *
 * Concurrency:
 *  • Lead identity = UNIQUE(tenantId, normalizedEmail). Because a Postgres unique
 *    violation poisons the surrounding transaction, the lead is resolved in a
 *    retry-safe step BEFORE the inquiry transaction (find → create → on P2002
 *    refetch the winner). Two concurrent submissions for the same email therefore
 *    converge on ONE lead, each keeping its own inquiry.
 *  • Inquiry idempotency = UNIQUE(tenantId, idempotencyKey). A replayed request
 *    (double-click / network retry) returns the ORIGINAL result, no new records.
 */
import { Prisma, type PrismaClient, type Lead, type Tenant } from '@prisma/client';
import { assessSpam } from '../lib/spam';
import { cleanText, cleanMultiline, normalizeEmail, normalizeCompany } from '../lib/sanitize';
import { computeSlaDueAt } from '../lib/business-hours';
import { config } from '../config';
import type { LeadRequest } from './schema';

export type IntakeContext = { correlationId: string; now?: Date };

export type IntakeResult = {
  leadId: string;
  inquiryId: string;
  isNewLead: boolean;
  deduped: boolean;
  replayed: boolean;
  spamResult: 'CLEAN' | 'SUSPECT' | 'REJECTED';
};

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

/** Retry-safe lead resolution (cannot live inside the inquiry txn — see header). */
async function resolveLead(
  prisma: PrismaClient,
  tenant: Tenant,
  input: LeadRequest,
  normalizedEmail: string,
): Promise<{ lead: Lead; isNew: boolean }> {
  const where = { tenantId_normalizedEmail: { tenantId: tenant.id, normalizedEmail } };
  const found = await prisma.lead.findUnique({ where });
  if (found) return { lead: found, isNew: false };
  try {
    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        email: input.businessEmail,
        normalizedEmail,
        firstName: cleanText(input.firstName, 120) || null,
        lastName: cleanText(input.lastName, 120) || null,
        company: input.company ? cleanText(input.company, 200) : null,
        companyNormalized: normalizeCompany(input.company),
        phone: input.phone ? cleanText(input.phone, 40) : null,
        jobTitle: input.jobTitle ? cleanText(input.jobTitle, 160) : null,
      },
    });
    return { lead, isNew: true };
  } catch (e) {
    if (isUniqueViolation(e)) {
      const lead = await prisma.lead.findUniqueOrThrow({ where });
      return { lead, isNew: false };
    }
    throw e;
  }
}

export async function intakeLead(
  prisma: PrismaClient,
  tenant: Tenant,
  input: LeadRequest,
  ctx: IntakeContext,
): Promise<IntakeResult> {
  const now = ctx.now ?? new Date();
  const tenantId = tenant.id;
  const normalizedEmail = normalizeEmail(input.businessEmail);

  // 1. Spam (pure). Rejected submissions are still persisted, just not routed.
  const spam = assessSpam({
    honeypot: input.honeypot,
    name: `${input.firstName} ${input.lastName}`.trim(),
    email: input.businessEmail,
    projectDescription: input.projectDescription,
    submitElapsedMs: input.submitElapsedMs,
  });

  // 2. Idempotency replay — return the ORIGINAL result, create nothing.
  const prior = await prisma.leadInquiry.findUnique({
    where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
  });
  if (prior) {
    return {
      leadId: prior.leadId,
      inquiryId: prior.id,
      isNewLead: false,
      deduped: true,
      replayed: true,
      spamResult: prior.spamResult as IntakeResult['spamResult'],
    };
  }

  // 3. Resolve / dedup lead (retry-safe, outside the inquiry txn).
  const { lead, isNew } = await resolveLead(prisma, tenant, input, normalizedEmail);

  const sanitizedPayload = {
    firstName: cleanText(input.firstName, 120),
    lastName: cleanText(input.lastName, 120),
    company: input.company ? cleanText(input.company, 200) : null,
    jobTitle: input.jobTitle ? cleanText(input.jobTitle, 160) : null,
    serviceInterest: input.serviceInterest ? cleanText(input.serviceInterest, 160) : null,
    projectDescription: input.projectDescription ? cleanMultiline(input.projectDescription, 5000) : null,
    budgetRange: input.budgetRange ? cleanText(input.budgetRange, 80) : null,
    desiredStartWindow: input.desiredStartWindow ? cleanText(input.desiredStartWindow, 80) : null,
    form: input.form,
  };

  const consentGranted = input.consentGranted === true;
  // Attribution is optional when the service is called outside the zod layer.
  const attr = input.attribution ?? {};

  // 4. Transaction: inquiry + attribution + audit + activity + jobs (atomic).
  try {
    const result = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.leadInquiry.create({
        data: {
          tenantId,
          leadId: lead.id,
          form: input.form,
          serviceInterest: sanitizedPayload.serviceInterest,
          projectDescription: sanitizedPayload.projectDescription,
          budgetRange: sanitizedPayload.budgetRange,
          desiredStartWindow: sanitizedPayload.desiredStartWindow,
          landingPage: attr.landingPage ? cleanText(attr.landingPage, 2048) : null,
          consentStatus: input.consentGranted == null ? 'NOT_REQUIRED' : consentGranted ? 'GRANTED' : 'DECLINED',
          consentAt: consentGranted ? now : null,
          consentPolicyVersion: input.consentPolicyVersion ?? null,
          spamResult: spam.result,
          spamScore: spam.score,
          spamReasons: spam.reasons,
          sanitizedPayload,
          idempotencyKey: input.idempotencyKey,
          submittedAt: now,
        },
      });

      const attribution = await tx.leadAttribution.create({
        data: {
          tenantId,
          inquiryId: inquiry.id,
          landingPage: attr.landingPage ?? null,
          referrerUrl: attr.referrerUrl ?? null,
          utmSource: attr.utmSource ?? null,
          utmMedium: attr.utmMedium ?? null,
          utmCampaign: attr.utmCampaign ?? null,
          utmTerm: attr.utmTerm ?? null,
          utmContent: attr.utmContent ?? null,
          gclid: attr.gclid ?? null,
          userAgent: (input as unknown as { userAgent?: string }).userAgent ?? null,
        },
      });

      // First-/last-touch + fill-only enrichment (never overwrite with empty).
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          lastTouchAttributionId: attribution.id,
          ...(isNew ? { firstTouchAttributionId: attribution.id } : {}),
          ...(!lead.phone && input.phone ? { phone: cleanText(input.phone, 40) } : {}),
          ...(!lead.company && input.company
            ? { company: cleanText(input.company, 200), companyNormalized: normalizeCompany(input.company) }
            : {}),
          ...(!lead.jobTitle && input.jobTitle ? { jobTitle: cleanText(input.jobTitle, 160) } : {}),
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId,
          entityType: 'Lead',
          entityId: lead.id,
          action: isNew ? 'LEAD_CREATED' : 'INQUIRY_RECEIVED',
          actorType: 'SYSTEM',
          correlationId: ctx.correlationId,
          data: { form: input.form, isNewLead: isNew, spamResult: spam.result, inquiryId: inquiry.id },
        },
      });

      if (isNew) {
        await tx.leadActivity.create({
          data: { tenantId, leadId: lead.id, type: 'LEAD_CREATED', data: { correlationId: ctx.correlationId } },
        });
      }
      await tx.leadActivity.create({
        data: { tenantId, leadId: lead.id, type: 'INQUIRY_RECEIVED', data: { inquiryId: inquiry.id, form: input.form } },
      });

      // Side-effect jobs — only for genuine (non-rejected) submissions.
      if (spam.result !== 'REJECTED') {
        const jobs: { type: string; payload: Prisma.InputJsonValue }[] = [
          { type: 'ACK_EMAIL', payload: { leadId: lead.id, inquiryId: inquiry.id } },
          { type: 'INTERNAL_NOTIFY', payload: { leadId: lead.id, inquiryId: inquiry.id, isNewLead: isNew } },
          { type: 'ASSIGNMENT', payload: { leadId: lead.id, inquiryId: inquiry.id } },
          {
            type: 'SLA_TIMER',
            payload: {
              leadId: lead.id,
              inquiryId: inquiry.id,
              targetMinutes: config.LEADS_SLA_TARGET_MINUTES,
              dueAt: computeSlaDueAt(now, config.LEADS_SLA_TARGET_MINUTES, config.LEADS_SLA_TIMEZONE).toISOString(),
            },
          },
        ];
        await tx.sideEffectJob.createMany({
          data: jobs.map((j) => ({
            tenantId,
            leadId: lead.id,
            inquiryId: inquiry.id,
            type: j.type as Prisma.SideEffectJobCreateManyInput['type'],
            payload: j.payload,
            maxAttempts: config.OUTBOX_MAX_ATTEMPTS,
            idempotencyKey: `${inquiry.id}:${j.type}`,
          })),
        });
      }

      return { inquiryId: inquiry.id };
    });

    return {
      leadId: lead.id,
      inquiryId: result.inquiryId,
      isNewLead: isNew,
      deduped: !isNew,
      replayed: false,
      spamResult: spam.result,
    };
  } catch (e) {
    // Concurrent same-idempotencyKey → the loser refetches the winner's inquiry.
    if (isUniqueViolation(e)) {
      const winner = await prisma.leadInquiry.findUnique({
        where: { tenantId_idempotencyKey: { tenantId, idempotencyKey: input.idempotencyKey } },
      });
      if (winner) {
        return {
          leadId: winner.leadId,
          inquiryId: winner.id,
          isNewLead: false,
          deduped: true,
          replayed: true,
          spamResult: winner.spamResult as IntakeResult['spamResult'],
        };
      }
    }
    throw e;
  }
}
