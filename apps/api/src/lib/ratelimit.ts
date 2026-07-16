/**
 * DB-backed fixed-window rate limiter keyed by a SALTED HASH of the abuse
 * identifier (never the raw IP). Durable across restarts and tenant-scoped.
 * Rows carry an expiresAt for retention/purging.
 */
import type { PrismaClient } from '@prisma/client';
import { config } from '../config';

export type RateLimitResult = { limited: boolean; remaining: number; retryAfterMs: number };

export async function checkRateLimit(
  prisma: PrismaClient,
  tenantId: string,
  hashedId: string,
  now: Date = new Date(),
  maxOverride?: number,
): Promise<RateLimitResult> {
  const windowMs = config.LEADS_RATE_LIMIT_WINDOW_MS;
  const max = maxOverride ?? config.LEADS_RATE_LIMIT_MAX;
  const bucket = Math.floor(now.getTime() / windowMs) * windowMs;
  const windowStart = new Date(bucket);
  const expiresAt = new Date(bucket + windowMs * 2); // keep one extra window for retention

  // Atomic upsert-increment. The unique (tenantId, hashedId, windowStart) makes
  // concurrent increments serialize on the row.
  const row = await prisma.rateLimitCounter.upsert({
    where: { tenantId_hashedId_windowStart: { tenantId, hashedId, windowStart } },
    update: { count: { increment: 1 } },
    create: { tenantId, hashedId, windowStart, count: 1, expiresAt },
  });

  const limited = row.count > max;
  const remaining = Math.max(0, max - row.count);
  const retryAfterMs = limited ? bucket + windowMs - now.getTime() : 0;
  return { limited, remaining, retryAfterMs };
}

/** Retention purge (called opportunistically / by a scheduled task). */
export async function purgeExpiredRateLimits(prisma: PrismaClient, now: Date = new Date()): Promise<number> {
  const res = await prisma.rateLimitCounter.deleteMany({ where: { expiresAt: { lt: now } } });
  return res.count;
}
