/**
 * Prisma client singleton + a startup connectivity check so the API fails
 * clearly (rather than on the first request) when the database is unavailable.
 */
import { PrismaClient } from '@prisma/client';
import { config } from './config';

export const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function assertDbReachable(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[db] Database is unavailable. Is Postgres running?\n` +
        `     Local (no Docker): scripts/dev-db.sh start\n` +
        `     Docker:            docker compose up -d\n` +
        `     Cause: ${msg}`,
    );
  }
}
