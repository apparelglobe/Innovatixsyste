/**
 * Durable side-effect processor. Claims due PENDING jobs, runs the handler, and
 * on failure applies exponential backoff up to maxAttempts; then marks the job
 * DEAD (dead-letter) and raises a one-time failure alert. Exposed as a pure
 * function so tests can drive it deterministically with a fixed `now`.
 */
import type { PrismaClient, SideEffectJob } from '@prisma/client';
import { sendTransactionalEmail } from '../email/service';
import {
  leadAckEmail,
  internalLeadNotifyEmail,
  bookingConfirmEmail,
  slaWarningEmail,
  sideEffectFailureAlertEmail,
} from '../email/templates';
import { config } from '../config';
import { alert } from '../observability';
import { incr } from '../observability/metrics';
import { generateRetainerInvoice } from '../billing/retainer';

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 60 * 60 * 1000;

function backoffMs(attempts: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1), BACKOFF_CAP_MS);
}

type Payload = Record<string, unknown>;

async function handle(prisma: PrismaClient, job: SideEffectJob): Promise<void> {
  const p = (job.payload ?? {}) as Payload;
  switch (job.type) {
    case 'ACK_EMAIL': {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: job.leadId! } });
      await sendTransactionalEmail(prisma, {
        tenantId: job.tenantId,
        type: 'LEAD_ACK',
        to: lead.email,
        built: leadAckEmail(lead.email, lead.firstName),
        leadId: lead.id,
        inquiryId: job.inquiryId,
      });
      return;
    }
    case 'INTERNAL_NOTIFY': {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: job.leadId! } });
      const inquiryCount = await prisma.leadInquiry.count({ where: { tenantId: job.tenantId, leadId: lead.id } });
      const inquiry = job.inquiryId
        ? await prisma.leadInquiry.findUnique({ where: { id: job.inquiryId } })
        : null;
      await sendTransactionalEmail(prisma, {
        tenantId: job.tenantId,
        type: 'INTERNAL_LEAD_NOTIFY',
        to: config.EMAIL_INTERNAL_TO,
        built: internalLeadNotifyEmail({
          leadEmail: lead.email,
          name: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || null,
          company: lead.company,
          serviceInterest: inquiry?.serviceInterest ?? null,
          budgetRange: inquiry?.budgetRange ?? null,
          isNewLead: Boolean(p.isNewLead),
          inquiryCount,
        }),
        leadId: lead.id,
        inquiryId: job.inquiryId,
      });
      return;
    }
    case 'ASSIGNMENT': {
      // V1: route to the default sales queue, unassigned. Idempotent per lead.
      const existing = await prisma.assignment.findUnique({ where: { leadId: job.leadId! } });
      if (!existing) {
        await prisma.assignment.create({
          data: { tenantId: job.tenantId, leadId: job.leadId!, queue: 'innovatix-systems-sales', status: 'UNASSIGNED' },
        });
        await prisma.leadActivity.create({
          data: { tenantId: job.tenantId, leadId: job.leadId!, type: 'ASSIGNED', data: { queue: 'innovatix-systems-sales' } },
        });
        await prisma.auditEvent.create({
          data: { tenantId: job.tenantId, entityType: 'Lead', entityId: job.leadId!, action: 'ASSIGNED', actorType: 'SYSTEM', data: { queue: 'innovatix-systems-sales' } },
        });
      }
      return;
    }
    case 'SLA_TIMER': {
      const targetMinutes = Number(p.targetMinutes ?? config.LEADS_SLA_TARGET_MINUTES);
      const dueAt = p.dueAt ? new Date(String(p.dueAt)) : new Date(Date.now() + targetMinutes * 60_000);
      // Idempotent: one active timer per inquiry (job idempotencyKey already unique).
      await prisma.slaTimer.create({
        data: { tenantId: job.tenantId, leadId: job.leadId!, targetMinutes, dueAt, status: 'ACTIVE' },
      });
      await prisma.leadActivity.create({
        data: { tenantId: job.tenantId, leadId: job.leadId!, type: 'SLA_STARTED', data: { dueAt: dueAt.toISOString() } },
      });
      return;
    }
    case 'BOOKING_CONFIRM': {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: job.leadId! } });
      await sendTransactionalEmail(prisma, {
        tenantId: job.tenantId,
        type: 'BOOKING_CONFIRM',
        to: lead.email,
        built: bookingConfirmEmail(lead.email, p.scheduledAt ? String(p.scheduledAt) : null, p.meetingUrl ? String(p.meetingUrl) : null),
        leadId: lead.id,
      });
      return;
    }
    case 'SLA_WARNING': {
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: job.leadId! } });
      await sendTransactionalEmail(prisma, {
        tenantId: job.tenantId,
        type: 'SLA_WARNING',
        to: config.EMAIL_INTERNAL_TO,
        built: slaWarningEmail(lead.email, String(p.dueAt ?? new Date().toISOString())),
        leadId: lead.id,
      });
      return;
    }
    case 'ASSIGNMENT_NOTIFY':
      // No assignee in V1 (unassigned queue) → nothing to send.
      return;
    case 'GENERATE_RETAINER_INVOICE':
      // Phase 3 — recurring Care Plan invoice. Idempotent + atomic (see billing/retainer.ts).
      await generateRetainerInvoice(prisma, job);
      return;
    default:
      throw new Error(`unknown job type: ${job.type}`);
  }
}

/** Claim a single due job atomically (safe under multiple workers). */
async function claimNext(prisma: PrismaClient, now: Date): Promise<SideEffectJob | null> {
  const candidate = await prisma.sideEffectJob.findFirst({
    where: { status: 'PENDING', nextAttemptAt: { lte: now } },
    orderBy: { nextAttemptAt: 'asc' },
  });
  if (!candidate) return null;
  const claimed = await prisma.sideEffectJob.updateMany({
    where: { id: candidate.id, status: 'PENDING' },
    data: { status: 'PROCESSING', attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null; // lost the race
  return prisma.sideEffectJob.findUnique({ where: { id: candidate.id } });
}

export type ProcessSummary = { processed: number; succeeded: number; failed: number; dead: number };

/** Drain all currently-due jobs. Returns a summary. */
export async function processDueJobs(prisma: PrismaClient, now: Date = new Date()): Promise<ProcessSummary> {
  const summary: ProcessSummary = { processed: 0, succeeded: 0, failed: 0, dead: 0 };
  for (;;) {
    const job = await claimNext(prisma, now);
    if (!job) break;
    summary.processed++;
    try {
      await handle(prisma, job);
      await prisma.sideEffectJob.update({ where: { id: job.id }, data: { status: 'SUCCEEDED', lastError: null } });
      summary.succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (job.attempts >= job.maxAttempts) {
        await prisma.sideEffectJob.update({ where: { id: job.id }, data: { status: 'DEAD', lastError: msg } });
        summary.dead++;
        incr('sideeffect_jobs_dead_total', { type: String(job.type) });
        alert({ kind: 'job.dead', level: 'critical', message: `Side-effect job ${job.type} dead-lettered after ${job.attempts} attempts`, tenantId: job.tenantId, data: { jobId: job.id, type: job.type, lastError: msg } });
        // one-time dead-letter alert (best-effort). ONLY for lead-scoped jobs — the INTERNAL_NOTIFY
        // handler hard-requires a lead, so routing a lead-less job (e.g. retainer generation) through it
        // would just fail + dead-letter again (a broken alert chain). Lead-less DEADs are already
        // surfaced by the observability alert above.
        if (job.leadId) {
          await prisma.sideEffectJob.create({
            data: {
              tenantId: job.tenantId,
              leadId: job.leadId,
              inquiryId: job.inquiryId,
              type: 'INTERNAL_NOTIFY',
              payload: { deadLetterFor: job.id, jobType: job.type, lastError: msg, alert: true },
              idempotencyKey: `${job.id}:DEAD_ALERT`,
              maxAttempts: 3,
            },
          }).catch(() => undefined);
        }
        void sideEffectFailureAlertEmail; // template available for a dedicated alert stream
      } else {
        await prisma.sideEffectJob.update({
          where: { id: job.id },
          data: { status: 'PENDING', lastError: msg, nextAttemptAt: new Date(now.getTime() + backoffMs(job.attempts)) },
        });
        summary.failed++;
      }
    }
  }
  return summary;
}
