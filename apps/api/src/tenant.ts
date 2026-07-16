/**
 * Central tenant-resolution abstraction.
 *
 * The public website is single-tenant today, but tenantId is a first-class
 * column on every business record and all queries are tenant-scoped. Nothing in
 * the app hardcodes a tenant constant — code calls resolveDefaultTenant() (or,
 * later, resolveTenantFromRequest()). Swapping to true multi-tenant / PostgreSQL
 * RLS later requires no record redesign.
 */
import type { PrismaClient, Tenant } from '@prisma/client';
import { config } from './config';

let cached: Tenant | null = null;

/** Ensure the configured default tenant exists and return it (cached).
 *
 * Race-safe: on a cold start, concurrent callers can both try to create the
 * tenant; the loser hits a unique-constraint violation (P2002). We treat that
 * as "already created by a peer" and re-read, so the function never throws on a
 * benign create race. */
export async function resolveDefaultTenant(prisma: PrismaClient): Promise<Tenant> {
  if (cached) return cached;
  const slug = config.INNOVATIX_DEFAULT_TENANT_SLUG;
  try {
    cached = await prisma.tenant.upsert({
      where: { slug },
      update: {},
      create: { slug, name: 'Innovatix Systems' },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      cached = await prisma.tenant.findUniqueOrThrow({ where: { slug } });
    } else {
      throw err;
    }
  }
  return cached;
}

/**
 * Future hook: resolve tenant from the request (host header, path, API key…).
 * For now every public request maps to the default tenant.
 */
export async function resolveTenantFromRequest(prisma: PrismaClient, _host?: string): Promise<Tenant> {
  return resolveDefaultTenant(prisma);
}

/** Test/reset helper. */
export function __clearTenantCache(): void {
  cached = null;
}
