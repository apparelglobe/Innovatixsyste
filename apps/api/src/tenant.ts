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

/**
 * The public website's tenant. Public routes (leads, invitation accept, webhooks)
 * NEVER take a tenant id from the request body/headers — they resolve this
 * trusted tenant from configuration. Today that is the single default tenant;
 * multi-tenant/custom-domain resolution slots in here later (host → tenant map).
 */
export async function resolvePublicSiteTenant(prisma: PrismaClient): Promise<Tenant> {
  return resolveDefaultTenant(prisma);
}

/**
 * Accept a tenant id carried in a session/JWT (or a trusted job payload) ONLY if
 * it matches the trusted, server-resolved tenant. A forged or foreign tenant id
 * resolves to null so the caller fails closed (401/refuse). This is the single
 * place that decides whether a client-presented tenant id is authoritative — the
 * answer is "only if it equals what the server independently resolved".
 */
export async function resolveTrustedTenant(prisma: PrismaClient, presentedTenantId: string | undefined | null): Promise<Tenant | null> {
  if (!presentedTenantId) return null;
  const t = await resolveDefaultTenant(prisma);
  return presentedTenantId === t.id ? t : null;
}

/** Test/reset helper. */
export function __clearTenantCache(): void {
  cached = null;
}
