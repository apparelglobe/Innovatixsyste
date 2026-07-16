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
import type { PrismaClient, ProjectFile } from '@prisma/client';
import { config } from '../config';
import { storage } from '../storage';
import { scanner, isRetryable, type ScanOutcome } from './scanner';
import { notifyClientOrg, notifyStaff } from '../notifications/service';

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_CAP_MS = 60 * 60 * 1000;
const backoffMs = (attempts: number) => Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1), BACKOFF_CAP_MS);

export function computeHash(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
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
  const evidence = {
    result: outcome.result, threatName: outcome.threatName ?? null, provider: outcome.provider,
    engine: outcome.engine ?? null, engineVersion: outcome.engineVersion ?? null, signatureVersion: outcome.signatureVersion ?? null,
    errorCode: outcome.errorCode ?? null, completedAt: new Date(),
  };

  if (outcome.result === 'CLEAN') {
    await prisma.fileScan.update({ where: { id: scanId }, data: { ...evidence, status: 'SUCCEEDED', lastError: null } });
    await finalizeAvailable(prisma, file);
    return;
  }
  if (outcome.result === 'INFECTED') {
    await prisma.fileScan.update({ where: { id: scanId }, data: { ...evidence, status: 'SUCCEEDED' } });
    await quarantine(prisma, file, outcome);
    return;
  }
  if (outcome.result === 'UNSUPPORTED' || outcome.result === 'SKIPPED') {
    // Can't (or won't) scan → fail closed. Never becomes available.
    await prisma.fileScan.update({ where: { id: scanId }, data: { ...evidence, status: 'FAILED', lastError: outcome.errorCode ?? outcome.result } });
    await prisma.projectFile.update({ where: { id: file.id }, data: { state: 'REJECTED', scanStatus: 'pending' } });
    return;
  }
  // ERROR / TIMEOUT — retryable. Stay unavailable; back off or dead-letter.
  if (isRetryable(outcome.result)) {
    if (scan.attempts >= scan.maxAttempts) {
      await prisma.fileScan.update({ where: { id: scanId }, data: { ...evidence, status: 'DEAD', lastError: outcome.errorCode ?? outcome.result } });
      await notifyStaff(prisma, file.tenantId, { type: 'FILE_UPLOADED', title: `Malware scan failed permanently for a file`, body: `Scan gave up after ${scan.attempts} attempts (${outcome.errorCode ?? outcome.result}). The file remains unavailable.`, projectId: file.projectId, linkPath: `/admin/projects/${file.projectId}`, email: false }).catch(() => undefined);
    } else {
      await prisma.fileScan.update({ where: { id: scanId }, data: { ...evidence, status: 'PENDING', retryCount: { increment: 1 }, lastError: outcome.errorCode ?? outcome.result, nextAttemptAt: new Date(Date.now() + backoffMs(scan.attempts)) } });
    }
    // ProjectFile stays SCANNING (unavailable) either way.
  }
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
    await prisma.portalActivity.create({ data: { tenantId: file.tenantId, projectId: file.projectId, type: 'FILE', message: file.version > 1 ? `File updated: ${file.name} (v${file.version})` : `File uploaded: ${file.name}` } }).catch(() => undefined);
    await notifyClientOrg(prisma, file.tenantId, project.clientOrgId, { type: 'FILE_UPLOADED', title: file.version > 1 ? `Updated file: ${file.name} (v${file.version})` : `New file: ${file.name}`, projectId: file.projectId, linkPath: '/files', email: true }).catch(() => undefined);
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
