/**
 * Malware-scan service — the single place that turns a scanner outcome into file
 * state. Small files (or the stub scanner) scan inline in-request; larger files
 * enqueue a durable FileScan job that the worker drains, so the API never holds
 * a request open on a big scan and availability is finalized only after a CLEAN
 * result.
 *
 * State transitions:
 *   CLEAN       → AVAILABLE (becomes current version, client notified)
 *   INFECTED    → QUARANTINED (object retained for forensics, security-audited,
 *                 staff-notified; never downloadable, never auto-restored)
 *   UNSUPPORTED → REJECTED (can't be scanned → fail closed)
 *   ERROR/TIMEOUT → retry with backoff; DEAD after maxAttempts (stays unavailable)
 */
import crypto from 'node:crypto';
import type { PrismaClient, ProjectFile, TicketAttachment } from '@prisma/client';
import { config } from '../config';
import { storage } from '../storage';
import { scanner, isRetryable, type ScanOutcome } from './scanner';
import { notifyClientOrg, notifyStaff } from '../notifications/service';
import { writeProjectActivity, systemActor } from '../lib/portal-activity';
import { alert } from '../observability';
import { incr } from '../observability/metrics';

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 60 * 60 * 1000;
const backoffMs = (attempts: number) => Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1), BACKOFF_CAP_MS);

export function computeHash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ── Shared scan state-machine (Slice 5) ──────────────────────────────────────
// The ONE malware-security decision tree, parameterised by owner-specific hooks so ProjectFile and
// TicketAttachment scanning cannot diverge (CLEAN→available, INFECTED→quarantine, UNSUPPORTED/SKIPPED→reject
// fail-closed, ERROR/TIMEOUT→backoff→DEAD). The scan-row status writes + evidence are identical for both
// (the two scan tables share the same columns); only finalize/quarantine/reject/dead are owner-specific.
type ScanHooks = {
  scanId: string;
  attempts: number;
  maxAttempts: number;
  metric: string;
  updateScan: (data: Record<string, unknown>) => Promise<unknown>;
  finalizeClean: () => Promise<void>;
  quarantine: (outcome: ScanOutcome) => Promise<void>;
  reject: (outcome: ScanOutcome) => Promise<void>;
  onDead: (outcome: ScanOutcome) => Promise<void>;
};

async function applyScanOutcome(h: ScanHooks, outcome: ScanOutcome): Promise<void> {
  const evidence = {
    result: outcome.result, threatName: outcome.threatName ?? null, provider: outcome.provider,
    engine: outcome.engine ?? null, engineVersion: outcome.engineVersion ?? null, signatureVersion: outcome.signatureVersion ?? null,
    errorCode: outcome.errorCode ?? null, completedAt: new Date(),
  };
  incr(h.metric, { result: outcome.result });
  if (outcome.result === 'CLEAN') {
    await h.updateScan({ ...evidence, status: 'SUCCEEDED', lastError: null });
    await h.finalizeClean();
    return;
  }
  if (outcome.result === 'INFECTED') {
    await h.updateScan({ ...evidence, status: 'SUCCEEDED' });
    await h.quarantine(outcome);
    return;
  }
  if (outcome.result === 'UNSUPPORTED' || outcome.result === 'SKIPPED') {
    // Can't (or won't) scan → fail closed. Never becomes available.
    await h.updateScan({ ...evidence, status: 'FAILED', lastError: outcome.errorCode ?? outcome.result });
    await h.reject(outcome);
    return;
  }
  // ERROR / TIMEOUT — retryable. Stay unavailable; back off or dead-letter.
  if (isRetryable(outcome.result)) {
    if (h.attempts >= h.maxAttempts) {
      await h.updateScan({ ...evidence, status: 'DEAD', lastError: outcome.errorCode ?? outcome.result });
      await h.onDead(outcome);
    } else {
      await h.updateScan({ ...evidence, status: 'PENDING', retryCount: { increment: 1 }, lastError: outcome.errorCode ?? outcome.result, nextAttemptAt: new Date(Date.now() + backoffMs(h.attempts)) });
    }
  }
}

/** Create (idempotently) the durable scan record for a file. */
async function ensureScan(prisma: PrismaClient, file: ProjectFile, hash: string, size: number) {
  const idempotencyKey = `scan:${file.id}`;
  try {
    return await prisma.fileScan.create({ data: { tenantId: file.tenantId, fileId: file.id, idempotencyKey, fileHash: hash, fileSizeBytes: size, provider: config.MALWARE_SCANNER_PROVIDER } });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return prisma.fileScan.findUniqueOrThrow({ where: { idempotencyKey } }); // idempotent
    throw e;
  }
}

/** Decide inline vs. enqueue, then either finalize now or leave it to the worker. */
export async function scanUploadedFile(prisma: PrismaClient, file: ProjectFile, data: Buffer): Promise<{ state: string; result?: ScanOutcome['result'] }> {
  const hash = computeHash(data);
  await prisma.projectFile.update({ where: { id: file.id }, data: { fileHash: hash } });
  const scan = await ensureScan(prisma, file, hash, data.length);

  const inline = config.MALWARE_SCANNER_PROVIDER === 'stub' || data.length <= config.SCAN_INLINE_MAX_BYTES;
  if (!inline) {
    return { state: 'SCANNING' }; // worker will finalize
  }
  const outcome = await runOne(prisma, scan.id, file, data);
  const fresh = await prisma.projectFile.findUniqueOrThrow({ where: { id: file.id } });
  return { state: fresh.state, result: outcome.result };
}

/** Execute one scan attempt against in-memory bytes and apply the outcome. */
async function runOne(prisma: PrismaClient, scanId: string, file: ProjectFile, data: Buffer): Promise<ScanOutcome> {
  await prisma.fileScan.update({ where: { id: scanId }, data: { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } } });
  let outcome: ScanOutcome;
  try {
    outcome = await scanner().scan(data);
  } catch (err) {
    outcome = { result: 'ERROR', provider: config.MALWARE_SCANNER_PROVIDER, errorCode: err instanceof Error ? err.message.slice(0, 80) : 'SCAN_EXCEPTION' };
  }
  await applyOutcome(prisma, scanId, file, outcome);
  return outcome;
}

async function applyOutcome(prisma: PrismaClient, scanId: string, file: ProjectFile, outcome: ScanOutcome): Promise<void> {
  const scan = await prisma.fileScan.findUniqueOrThrow({ where: { id: scanId } });
  await applyScanOutcome({
    scanId, attempts: scan.attempts, maxAttempts: scan.maxAttempts, metric: 'file_scans_total',
    updateScan: (data) => prisma.fileScan.update({ where: { id: scanId }, data }),
    finalizeClean: () => finalizeAvailable(prisma, file),
    quarantine: async (o) => {
      await quarantine(prisma, file, o);
      alert({ kind: 'scan.quarantined', level: 'warning', message: `Malware quarantined: ${o.threatName ?? 'threat'}`, tenantId: file.tenantId, data: { fileId: file.id, threat: o.threatName } });
    },
    // ProjectFile stays SCANNING (unavailable) on retry; REJECTED (fail-closed) on unscannable.
    reject: () => prisma.projectFile.update({ where: { id: file.id }, data: { state: 'REJECTED', scanStatus: 'pending' } }).then(() => undefined),
    onDead: async (o) => {
      alert({ kind: 'scan.failed', level: 'critical', message: `Malware scan dead-lettered after ${scan.attempts} attempts (${o.errorCode ?? o.result}) — file stays unavailable`, tenantId: file.tenantId, data: { fileId: file.id, scanId } });
      await notifyStaff(prisma, file.tenantId, { type: 'FILE_UPLOADED', title: `Malware scan failed permanently for a file`, body: `Scan gave up after ${scan.attempts} attempts (${o.errorCode ?? o.result}). The file remains unavailable.`, projectId: file.projectId, linkPath: `/admin/projects/${file.projectId}`, email: false }).catch(() => undefined);
    },
  }, outcome);
}

async function finalizeAvailable(prisma: PrismaClient, file: ProjectFile): Promise<void> {
  const root = file.rootId ?? file.id;
  await prisma.$transaction([
    prisma.projectFile.update({ where: { id: file.id }, data: { state: 'AVAILABLE', scanStatus: 'clean', isCurrent: true, ...(file.rootId ? {} : { rootId: file.id }) } }),
    prisma.projectFile.updateMany({ where: { tenantId: file.tenantId, rootId: root, id: { not: file.id }, deletedAt: null }, data: { isCurrent: false } }),
  ]);
  const project = await prisma.project.findUnique({ where: { id: file.projectId }, select: { clientOrgId: true } });
  await prisma.auditEvent.create({ data: { tenantId: file.tenantId, entityType: 'ProjectFile', entityId: file.id, action: file.version > 1 ? 'FILE_VERSIONED' : 'FILE_UPLOADED', actorType: 'SYSTEM', data: { version: file.version } } }).catch(() => undefined);
  if (file.clientVisible && project) {
    await writeProjectActivity(prisma, { id: file.projectId, tenantId: file.tenantId, clientOrgId: project.clientOrgId }, { type: 'FILE', message: file.version > 1 ? `File updated: ${file.name} (v${file.version})` : `File uploaded: ${file.name}`, actor: systemActor() }).catch(() => undefined);
    await notifyClientOrg(prisma, file.tenantId, project.clientOrgId, { type: 'FILE_UPLOADED', title: file.version > 1 ? `Updated file: ${file.name} (v${file.version})` : `New file: ${file.name}`, projectId: file.projectId, linkPath: '/projects?tab=files', email: true }).catch(() => undefined);
  }
}

async function quarantine(prisma: PrismaClient, file: ProjectFile, outcome: ScanOutcome): Promise<void> {
  // Object is RETAINED (not deleted) per quarantine policy for forensics; state
  // gates all access. Never auto-restore.
  await prisma.projectFile.update({ where: { id: file.id }, data: { state: 'QUARANTINED', scanStatus: 'infected', isCurrent: false } });
  await prisma.auditEvent.create({ data: { tenantId: file.tenantId, entityType: 'ProjectFile', entityId: file.id, action: 'FILE_QUARANTINED', actorType: 'SYSTEM', data: { threatName: outcome.threatName ?? 'unknown', engine: outcome.engine, signatureVersion: outcome.signatureVersion } } }).catch(() => undefined);
  // Staff alerted with the threat name; the uploader is NOT sent malware details.
  await notifyStaff(prisma, file.tenantId, { type: 'FILE_UPLOADED', title: `⚠ Malware quarantined: ${file.name}`, body: `A scanned upload was flagged (${outcome.threatName ?? 'threat detected'}) and quarantined.`, projectId: file.projectId, linkPath: `/admin/projects/${file.projectId}`, email: false }).catch(() => undefined);
}

// ── Durable worker ───────────────────────────────────────────────────────────
export type ScanSummary = { processed: number; clean: number; infected: number; failed: number; dead: number };

async function claimNextScan(prisma: PrismaClient, now: Date) {
  const candidate = await prisma.fileScan.findFirst({ where: { status: 'PENDING', nextAttemptAt: { lte: now } }, orderBy: { nextAttemptAt: 'asc' } });
  if (!candidate) return null;
  const claimed = await prisma.fileScan.updateMany({ where: { id: candidate.id, status: 'PENDING' }, data: { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } } });
  if (claimed.count === 0) return null; // lost the race
  return prisma.fileScan.findUnique({ where: { id: candidate.id } });
}

/** Drain due scan jobs: read the stored object, scan, and finalize file state. */
export async function processScanJobs(prisma: PrismaClient, now: Date = new Date()): Promise<ScanSummary> {
  const s: ScanSummary = { processed: 0, clean: 0, infected: 0, failed: 0, dead: 0 };
  for (;;) {
    const scan = await claimNextScan(prisma, now);
    if (!scan) break;
    s.processed++;
    const file = await prisma.projectFile.findUnique({ where: { id: scan.fileId } });
    // Tenant-ownership guard: the scan job and its file MUST be the same tenant.
    // A mismatch means data integrity was violated — refuse to act, never scan
    // (and thus never make available) a file across the tenant boundary.
    if (file && file.tenantId !== scan.tenantId) {
      await prisma.fileScan.update({ where: { id: scan.id }, data: { status: 'DEAD', result: 'ERROR', errorCode: 'TENANT_MISMATCH', completedAt: new Date() } }).catch(() => undefined);
      s.failed++; continue;
    }
    if (!file || !file.storageKey) { await applyOutcomeById(prisma, scan.id, null, { result: 'ERROR', provider: scan.provider ?? 'unknown', errorCode: 'OBJECT_MISSING' }); s.failed++; continue; }
    let outcome: ScanOutcome;
    try {
      const bytes = await storage().getBytes(file.storageKey);
      outcome = bytes ? await scanner().scan(bytes) : { result: 'ERROR', provider: config.MALWARE_SCANNER_PROVIDER, errorCode: 'OBJECT_MISSING' };
    } catch (err) {
      outcome = { result: 'ERROR', provider: config.MALWARE_SCANNER_PROVIDER, errorCode: err instanceof Error ? err.message.slice(0, 80) : 'READ_ERROR' };
    }
    await applyOutcome(prisma, scan.id, file, outcome);
    if (outcome.result === 'CLEAN') s.clean++;
    else if (outcome.result === 'INFECTED') s.infected++;
    else {
      const after = await prisma.fileScan.findUnique({ where: { id: scan.id } });
      if (after?.status === 'DEAD') s.dead++; else s.failed++;
    }
  }
  return s;
}

/** Apply an outcome when the file row can't be loaded (missing object). */
async function applyOutcomeById(prisma: PrismaClient, scanId: string, file: ProjectFile | null, outcome: ScanOutcome): Promise<void> {
  if (file) return applyOutcome(prisma, scanId, file, outcome);
  const scan = await prisma.fileScan.findUniqueOrThrow({ where: { id: scanId } });
  if (scan.attempts >= scan.maxAttempts) await prisma.fileScan.update({ where: { id: scanId }, data: { status: 'DEAD', result: 'ERROR', errorCode: outcome.errorCode, completedAt: new Date() } });
  else await prisma.fileScan.update({ where: { id: scanId }, data: { status: 'PENDING', retryCount: { increment: 1 }, errorCode: outcome.errorCode, nextAttemptAt: new Date(Date.now() + backoffMs(scan.attempts)) } });
}

// ── Ticket attachments (Slice 5) ─────────────────────────────────────────────
// Same extracted state-machine (applyScanOutcome), but a TIMELINE-FREE finalize: CLEAN → AVAILABLE only.
// No finalizeAvailable, no writeProjectActivity, no notifyClientOrg — a ticket attachment never emits a
// project/relationship FILE activity or a "New file" client email. INFECTED quarantines (object retained,
// staff-alerted, client never told the threat). Ownership is the attachment's own tenant/org — no project.

/** Create (idempotently) the durable scan record for a ticket attachment. */
async function ensureAttachmentScan(prisma: PrismaClient, att: TicketAttachment, hash: string, size: number) {
  const idempotencyKey = `ticket-attachment-scan:${att.id}`;
  try {
    return await prisma.ticketAttachmentScan.create({ data: { tenantId: att.tenantId, attachmentId: att.id, idempotencyKey, fileHash: hash, fileSizeBytes: size, provider: config.MALWARE_SCANNER_PROVIDER } });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return prisma.ticketAttachmentScan.findUniqueOrThrow({ where: { idempotencyKey } }); // idempotent
    throw e;
  }
}

/** Decide inline vs. enqueue for a ticket attachment; either finalize now or leave it to the worker. */
export async function scanTicketAttachment(prisma: PrismaClient, att: TicketAttachment, data: Buffer): Promise<{ state: string; result?: ScanOutcome['result'] }> {
  const hash = computeHash(data);
  await prisma.ticketAttachment.update({ where: { id: att.id }, data: { fileHash: hash } });
  const scan = await ensureAttachmentScan(prisma, att, hash, data.length);
  const inline = config.MALWARE_SCANNER_PROVIDER === 'stub' || data.length <= config.SCAN_INLINE_MAX_BYTES;
  if (!inline) return { state: 'SCANNING' }; // worker will finalize
  const outcome = await runOneAttachment(prisma, scan.id, att, data);
  const fresh = await prisma.ticketAttachment.findUniqueOrThrow({ where: { id: att.id } });
  return { state: fresh.state, result: outcome.result };
}

async function runOneAttachment(prisma: PrismaClient, scanId: string, att: TicketAttachment, data: Buffer): Promise<ScanOutcome> {
  await prisma.ticketAttachmentScan.update({ where: { id: scanId }, data: { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } } });
  let outcome: ScanOutcome;
  try {
    outcome = await scanner().scan(data);
  } catch (err) {
    outcome = { result: 'ERROR', provider: config.MALWARE_SCANNER_PROVIDER, errorCode: err instanceof Error ? err.message.slice(0, 80) : 'SCAN_EXCEPTION' };
  }
  await applyAttachmentOutcome(prisma, scanId, att, outcome);
  return outcome;
}

async function applyAttachmentOutcome(prisma: PrismaClient, scanId: string, att: TicketAttachment, outcome: ScanOutcome): Promise<void> {
  const scan = await prisma.ticketAttachmentScan.findUniqueOrThrow({ where: { id: scanId } });
  await applyScanOutcome({
    scanId, attempts: scan.attempts, maxAttempts: scan.maxAttempts, metric: 'ticket_attachment_scans_total',
    updateScan: (data) => prisma.ticketAttachmentScan.update({ where: { id: scanId }, data }),
    finalizeClean: () => finalizeTicketAttachment(prisma, att),
    quarantine: (o) => quarantineTicketAttachment(prisma, att, o),
    reject: () => prisma.ticketAttachment.update({ where: { id: att.id }, data: { state: 'REJECTED' } }).then(() => undefined),
    onDead: async (o) => {
      alert({ kind: 'scan.failed', level: 'critical', message: `Ticket attachment scan dead-lettered after ${scan.attempts} attempts (${o.errorCode ?? o.result}) — attachment stays unavailable`, tenantId: att.tenantId, data: { attachmentId: att.id, scanId } });
      await notifyStaff(prisma, att.tenantId, { type: 'TICKET_MESSAGE', title: `Attachment scan failed permanently`, body: `A ticket attachment scan gave up after ${scan.attempts} attempts. The file remains unavailable.`, linkPath: `/admin/tickets/${att.ticketId}`, email: false }).catch(() => undefined);
    },
  }, outcome);
}

/** CLEAN → AVAILABLE only. NO version chain, NO PortalActivity, NO client notification/email. */
async function finalizeTicketAttachment(prisma: PrismaClient, att: TicketAttachment): Promise<void> {
  await prisma.ticketAttachment.update({ where: { id: att.id }, data: { state: 'AVAILABLE' } });
  await prisma.auditEvent.create({ data: { tenantId: att.tenantId, entityType: 'TicketAttachment', entityId: att.id, action: 'FILE_UPLOADED', actorType: 'SYSTEM', data: { ticketId: att.ticketId } } }).catch(() => undefined);
}

async function quarantineTicketAttachment(prisma: PrismaClient, att: TicketAttachment, outcome: ScanOutcome): Promise<void> {
  // Object RETAINED for forensics; state gates all access; never auto-restore.
  await prisma.ticketAttachment.update({ where: { id: att.id }, data: { state: 'QUARANTINED' } });
  await prisma.auditEvent.create({ data: { tenantId: att.tenantId, entityType: 'TicketAttachment', entityId: att.id, action: 'FILE_QUARANTINED', actorType: 'SYSTEM', data: { threatName: outcome.threatName ?? 'unknown', engine: outcome.engine } } }).catch(() => undefined);
  alert({ kind: 'scan.quarantined', level: 'warning', message: `Malware quarantined (ticket attachment): ${outcome.threatName ?? 'threat'}`, tenantId: att.tenantId, data: { attachmentId: att.id, threat: outcome.threatName } });
  // Staff alerted; the client is NEVER sent malware details (and gets no notification at all).
  await notifyStaff(prisma, att.tenantId, { type: 'TICKET_MESSAGE', title: `⚠ Malware quarantined in a ticket attachment`, body: `A ticket attachment was flagged (${outcome.threatName ?? 'threat detected'}) and quarantined.`, linkPath: `/admin/tickets/${att.ticketId}`, email: false }).catch(() => undefined);
}

async function claimNextAttachmentScan(prisma: PrismaClient, now: Date) {
  const candidate = await prisma.ticketAttachmentScan.findFirst({ where: { status: 'PENDING', nextAttemptAt: { lte: now } }, orderBy: { nextAttemptAt: 'asc' } });
  if (!candidate) return null;
  const claimed = await prisma.ticketAttachmentScan.updateMany({ where: { id: candidate.id, status: 'PENDING' }, data: { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } } });
  if (claimed.count === 0) return null; // lost the race
  return prisma.ticketAttachmentScan.findUnique({ where: { id: candidate.id } });
}

/** Drain due ticket-attachment scan jobs. Same tenant-mismatch fail-closed guard as processScanJobs. */
export async function processTicketAttachmentScanJobs(prisma: PrismaClient, now: Date = new Date()): Promise<ScanSummary> {
  const s: ScanSummary = { processed: 0, clean: 0, infected: 0, failed: 0, dead: 0 };
  for (;;) {
    const scan = await claimNextAttachmentScan(prisma, now);
    if (!scan) break;
    s.processed++;
    const att = await prisma.ticketAttachment.findUnique({ where: { id: scan.attachmentId } });
    // Tenant-ownership guard (mirrors processScanJobs): a scan job and its attachment MUST share a tenant.
    if (att && att.tenantId !== scan.tenantId) {
      await prisma.ticketAttachmentScan.update({ where: { id: scan.id }, data: { status: 'DEAD', result: 'ERROR', errorCode: 'TENANT_MISMATCH', completedAt: new Date() } }).catch(() => undefined);
      s.failed++; continue;
    }
    if (!att || !att.storageKey) { await applyAttachmentOutcomeById(prisma, scan.id, null, { result: 'ERROR', provider: scan.provider ?? 'unknown', errorCode: 'OBJECT_MISSING' }); s.failed++; continue; }
    let outcome: ScanOutcome;
    try {
      const bytes = await storage().getBytes(att.storageKey);
      outcome = bytes ? await scanner().scan(bytes) : { result: 'ERROR', provider: config.MALWARE_SCANNER_PROVIDER, errorCode: 'OBJECT_MISSING' };
    } catch (err) {
      outcome = { result: 'ERROR', provider: config.MALWARE_SCANNER_PROVIDER, errorCode: err instanceof Error ? err.message.slice(0, 80) : 'READ_ERROR' };
    }
    await applyAttachmentOutcome(prisma, scan.id, att, outcome);
    if (outcome.result === 'CLEAN') s.clean++;
    else if (outcome.result === 'INFECTED') s.infected++;
    else {
      const after = await prisma.ticketAttachmentScan.findUnique({ where: { id: scan.id } });
      if (after?.status === 'DEAD') s.dead++; else s.failed++;
    }
  }
  return s;
}

async function applyAttachmentOutcomeById(prisma: PrismaClient, scanId: string, att: TicketAttachment | null, outcome: ScanOutcome): Promise<void> {
  if (att) return applyAttachmentOutcome(prisma, scanId, att, outcome);
  const scan = await prisma.ticketAttachmentScan.findUniqueOrThrow({ where: { id: scanId } });
  if (scan.attempts >= scan.maxAttempts) await prisma.ticketAttachmentScan.update({ where: { id: scanId }, data: { status: 'DEAD', result: 'ERROR', errorCode: outcome.errorCode, completedAt: new Date() } });
  else await prisma.ticketAttachmentScan.update({ where: { id: scanId }, data: { status: 'PENDING', retryCount: { increment: 1 }, errorCode: outcome.errorCode, nextAttemptAt: new Date(Date.now() + backoffMs(scan.attempts)) } });
}
