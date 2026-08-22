/**
 * Standalone side-effect worker. Polls the durable job table on an interval and
 * drains due jobs. Runs as its own process (npm run worker) so the API stays
 * responsive; multiple instances are safe (claims are atomic).
 */
import { prisma, assertDbReachable } from './db';
import { processDueJobs } from './jobs/processor';
import { processScanJobs } from './scanning/service';
import { sweepDueCarePlans } from './billing/retainer';
import { purgeExpiredRateLimits } from './lib/ratelimit';
import { config } from './config';

let stopping = false;

async function loop() {
  await assertDbReachable();
  // eslint-disable-next-line no-console
  console.log(`[worker] draining side-effect jobs every ${config.OUTBOX_POLL_MS}ms`);
  let ticks = 0;
  while (!stopping) {
    try {
      // Phase 3: enqueue recurring Care Plan invoice jobs BEFORE draining, so a due plan bills the
      // same tick. Idempotent — safe to run every poll (the job key dedupes per period). Isolated in
      // its own try/catch so a sweep failure can NEVER gate the pre-existing job/scan drains below.
      try {
        const swept = await sweepDueCarePlans(prisma, new Date());
        if (swept > 0) {
          // eslint-disable-next-line no-console
          console.log(`[worker] enqueued/revived ${swept} retainer-invoice job(s)`);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[worker] retainer sweep error:', err instanceof Error ? err.message : err);
      }
      const summary = await processDueJobs(prisma, new Date());
      if (summary.processed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[worker] ${JSON.stringify(summary)}`);
      }
      const scans = await processScanJobs(prisma, new Date());
      if (scans.processed > 0) {
        // eslint-disable-next-line no-console
        console.log(`[worker] scans ${JSON.stringify(scans)}`);
      }
      // opportunistic retention purge every ~5 min
      if (++ticks % 150 === 0) await purgeExpiredRateLimits(prisma);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[worker] tick error:', err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, config.OUTBOX_POLL_MS));
  }
}

async function shutdown() {
  stopping = true;
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

loop().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[worker] fatal:', err);
  process.exit(1);
});
