-- Phase 3 (P3.1) — retainers / Care Plans. Additive only: nothing about existing
-- deposit/milestone/standard/final invoicing changes. Adds the relationship-level CarePlan
-- model, a RETAINER InvoiceKind, and the invoice↔plan/billing-period link whose UNIQUE
-- constraint is the DB-level guarantee that a billing period can never be double-invoiced.

-- New Care Plan status enum.
CREATE TYPE "CarePlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED', 'COMPLETED', 'PAST_DUE');

-- New invoice kind for worker-generated recurring invoices (PG12+ allows ADD VALUE in a tx;
-- the value is not USED in this migration, so it commits cleanly).
ALTER TYPE "InvoiceKind" ADD VALUE 'RETAINER';

-- The Care Plan (retainer) — relationship-level (client_orgs).
CREATE TABLE "care_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CarePlanStatus" NOT NULL DEFAULT 'DRAFT',
    "monthlyAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "includedSummary" TEXT,
    "billingAnchorDay" INTEGER NOT NULL DEFAULT 1,
    "nextInvoiceAt" TIMESTAMP(3),
    "nextReportAt" TIMESTAMP(3),
    "nextReportNote" TEXT,
    "autoPay" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "care_plans_pkey" PRIMARY KEY ("id")
);

-- Invoice ↔ Care Plan link + billing period (NULL for every non-retainer invoice).
ALTER TABLE "invoices" ADD COLUMN "carePlanId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "billingPeriodStart" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN "billingPeriodEnd" TIMESTAMP(3);

CREATE INDEX "care_plans_tenantId_clientOrgId_idx" ON "care_plans"("tenantId", "clientOrgId");
CREATE INDEX "care_plans_status_nextInvoiceAt_idx" ON "care_plans"("status", "nextInvoiceAt");

-- Billing-grade invariant: at most ONE live (non-terminal) Care Plan per relationship, enforced at
-- the DB regardless of code path — so a retainer relationship can never be double-billed by two active
-- plans. (Prisma's @@unique can't express a partial/WHERE index, so this is raw SQL and intentionally
-- NOT mirrored in schema.prisma; see the CarePlan model note.)
CREATE UNIQUE INDEX "care_plans_one_live_per_org" ON "care_plans"("clientOrgId") WHERE "status" IN ('DRAFT', 'ACTIVE', 'PAUSED', 'PAST_DUE');

-- The no-double-billing guarantee: one retainer invoice per (plan, period). NULLs are distinct in
-- Postgres, so all the existing non-retainer invoices (carePlanId IS NULL) are unaffected.
CREATE UNIQUE INDEX "invoices_carePlanId_billingPeriodStart_key" ON "invoices"("carePlanId", "billingPeriodStart");

ALTER TABLE "care_plans" ADD CONSTRAINT "care_plans_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "client_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_carePlanId_fkey" FOREIGN KEY ("carePlanId") REFERENCES "care_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
