/**
 * Slice 6 — relationship-wide client BILLING HISTORY (OWNER-only). The SINGLE source of truth for the
 * client's cross-project invoice list, shared by GET /portal/billing (paginated + aggregates) AND the legacy
 * GET /portal/project billing block (unpaginated), so the two surfaces cannot diverge.
 *
 * Isolation: the scope WHERE mirrors findClientOrgInvoice's OR predicate exactly — all of the org's
 * project-linked invoices UNION org-level (projectId:null) RETAINER/deposit invoices — with a MANDATORY
 * tenant/org guard (Prisma treats undefined as "no filter", so a blank org would collapse arm2 to
 * {projectId:null} and leak every org's retainers). DRAFT is always excluded.
 *
 * Overdue is DERIVED per row via isInvoiceOverdue (never trusted from stored status), and folded into the
 * unpaid/overdue tab predicates + aggregates the SAME way (stored OVERDUE OR SENT-past-due), so the tab,
 * the overdue count, and any per-row flag can never drift. Aggregates are per-currency (never summed
 * across currencies) and are relationship-wide (independent of the tab/project filter — D2).
 */
import type { PrismaClient, Prisma } from '@prisma/client';
import { isInvoiceOverdue } from './invoice-status';

export type BillingTab = 'all' | 'unpaid' | 'paid' | 'overdue';

export type BillingRow = {
  id: string; number: string; kind: string; status: string; overdue: boolean;
  amountCents: number; currency: string;
  issuedAt: Date | null; dueAt: Date | null; paidAt: Date | null;
  projectId: string | null; projectName: string | null;
  billingPeriodStart: Date | null; billingPeriodEnd: Date | null;
  createdAt: Date; // year-grouping anchor fallback (issuedAt ?? createdAt) + legacy sort
};

export type CurrencyAggregate = {
  lifetimePaidCents: number;   // Σ amountCents where status = PAID
  outstandingCents: number;    // Σ amountCents where status in (SENT, OVERDUE)
  overdueCount: number;        // count(status = OVERDUE OR (status = SENT AND dueAt < now))
  counts: { paid: number; unpaid: number; overdue: number; voided: number };
};
export type BillingAggregates = { byCurrency: Record<string, CurrencyAggregate> };

const PAGE_DEFAULT = 100;
const PAGE_MAX = 200;

/** The canonical org scope (mirrors findClientOrgInvoice), guarded, DRAFT-excluded. A projectId narrows to
 *  a single owned project (retainers dropped) via a relation-join, so a FOREIGN id resolves to empty. */
function scopeWhere(tenantId: string, clientOrgId: string, projectId?: string): Prisma.InvoiceWhereInput {
  return projectId
    ? { tenantId, status: { not: 'DRAFT' }, project: { id: projectId, clientOrgId } }
    : { tenantId, status: { not: 'DRAFT' }, OR: [{ project: { clientOrgId } }, { projectId: null, clientOrgId }] };
}

/** ONE definition of "overdue" as a DB predicate: explicit OVERDUE, OR a SENT invoice past its due date. */
const overduePredicate = (now: Date): Prisma.InvoiceWhereInput => ({ OR: [{ status: 'OVERDUE' }, { status: 'SENT', dueAt: { lt: now } }] });

/** DB-expressible tab filter (keyset-safe — no post-query filtering). */
function tabWhere(tab: BillingTab, now: Date): Prisma.InvoiceWhereInput {
  switch (tab) {
    case 'paid': return { status: 'PAID' };
    case 'unpaid': return { status: { in: ['SENT', 'OVERDUE'] } }; // unpaid-collectible; overdue is a subset
    case 'overdue': return overduePredicate(now);
    default: return {}; // 'all' — scope already excludes DRAFT
  }
}

export function encodeBillingCursor(r: { createdAt: Date; id: string }): string {
  return Buffer.from(`${r.createdAt.toISOString()}|${r.id}`).toString('base64url');
}
function decodeCursor(c: string): { createdAt: Date; id: string } | null {
  const raw = Buffer.from(c, 'base64url').toString('utf8');
  const sep = raw.lastIndexOf('|');
  if (sep < 0) return null;
  const createdAt = new Date(raw.slice(0, sep));
  const id = raw.slice(sep + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return null;
  return { createdAt, id };
}

type RawRow = {
  id: string; number: string; kind: string; status: string; amountCents: number; currency: string;
  issuedAt: Date | null; dueAt: Date | null; paidAt: Date | null; projectId: string | null;
  billingPeriodStart: Date | null; billingPeriodEnd: Date | null; createdAt: Date;
  project?: { id: string; name: string } | null;
};
const toRow = (i: RawRow): BillingRow => ({
  id: i.id, number: i.number, kind: i.kind, status: i.status, overdue: isInvoiceOverdue(i),
  amountCents: i.amountCents, currency: i.currency,
  issuedAt: i.issuedAt, dueAt: i.dueAt, paidAt: i.paidAt,
  projectId: i.projectId, projectName: i.project?.name ?? null,
  billingPeriodStart: i.billingPeriodStart, billingPeriodEnd: i.billingPeriodEnd, createdAt: i.createdAt,
});

const INCLUDE_PROJECT = { project: { select: { id: true, name: true } } } as const;
const ORDER: Prisma.InvoiceOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

/** Paginated relationship-wide history page for GET /portal/billing. */
export async function listClientBillingHistory(
  prisma: PrismaClient, tenantId: string, clientOrgId: string,
  opts: { tab?: BillingTab; projectId?: string; cursor?: string; limit?: number } = {},
): Promise<{ invoices: BillingRow[]; nextCursor: string | null }> {
  if (!tenantId || !clientOrgId) return { invoices: [], nextCursor: null }; // defence-in-depth (mirror scoped.ts)
  const now = new Date();
  const limit = Math.min(Math.max(opts.limit ?? PAGE_DEFAULT, 1), PAGE_MAX);
  const cur = opts.cursor ? decodeCursor(opts.cursor) : null;
  // CRITICAL: compose EVERY predicate under a single AND. The scope carries org isolation in an `OR` (the
  // project | projectId-null retainer arms), the overdue tab is ALSO an `OR`, and the keyset is an `OR` too.
  // A shallow spread of two objects that both define `OR` keeps only the last — silently dropping the org
  // isolation and leaking every org's invoices. Separate AND arms keep each `OR` intact.
  const and: Prisma.InvoiceWhereInput[] = [scopeWhere(tenantId, clientOrgId, opts.projectId), tabWhere(opts.tab ?? 'all', now)];
  if (cur) and.push({ OR: [{ createdAt: { lt: cur.createdAt } }, { createdAt: cur.createdAt, id: { lt: cur.id } }] });
  const where: Prisma.InvoiceWhereInput = { AND: and };
  const rows = await prisma.invoice.findMany({ where, orderBy: ORDER, take: limit + 1, include: INCLUDE_PROJECT });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { invoices: page.map(toRow), nextCursor: hasMore ? encodeBillingCursor(page[page.length - 1]) : null };
}

/** Per-currency aggregates over the FULL relationship scope (no tab, no project filter, no pagination — D2). */
export async function clientBillingAggregates(prisma: PrismaClient, tenantId: string, clientOrgId: string): Promise<BillingAggregates> {
  if (!tenantId || !clientOrgId) return { byCurrency: {} };
  const now = new Date();
  const scope = scopeWhere(tenantId, clientOrgId);
  const [byStatus, overdueByCur] = await Promise.all([
    prisma.invoice.groupBy({ by: ['currency', 'status'], where: scope, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.invoice.groupBy({ by: ['currency'], where: { AND: [scope, overduePredicate(now)] }, _count: { _all: true } }),
  ]);
  const byCurrency: Record<string, CurrencyAggregate> = {};
  const ensure = (c: string): CurrencyAggregate => (byCurrency[c] ??= { lifetimePaidCents: 0, outstandingCents: 0, overdueCount: 0, counts: { paid: 0, unpaid: 0, overdue: 0, voided: 0 } });
  for (const g of byStatus) {
    const a = ensure(g.currency);
    const sum = g._sum.amountCents ?? 0;
    const n = g._count._all;
    if (g.status === 'PAID') { a.lifetimePaidCents += sum; a.counts.paid += n; }
    else if (g.status === 'SENT' || g.status === 'OVERDUE') { a.outstandingCents += sum; a.counts.unpaid += n; }
    else if (g.status === 'VOIDED') { a.counts.voided += n; } // VOIDED shown but $0 to both totals
    // DRAFT is excluded by the scope, so it never reaches here.
  }
  for (const g of overdueByCur) { const a = ensure(g.currency); a.overdueCount = g._count._all; a.counts.overdue = g._count._all; }
  return { byCurrency };
}

/** Legacy /portal/project convergence: the FULL all-projects, DRAFT-excluded, overdue-derived list
 *  (unpaginated), shaped identically to what that block returned before (a superset of ClientInvoice). */
export async function listAllClientBillingRows(prisma: PrismaClient, tenantId: string, clientOrgId: string): Promise<BillingRow[]> {
  if (!tenantId || !clientOrgId) return [];
  const rows = await prisma.invoice.findMany({ where: scopeWhere(tenantId, clientOrgId), orderBy: ORDER, include: INCLUDE_PROJECT });
  return rows.map(toRow);
}
