-- Slice 7 — Past-Project Archive. PURELY ADDITIVE: a nullable archive timestamp on Project + a
-- partition index for the active-vs-past surfaces. No backfill (existing rows, including COMPLETE
-- ones, stay NULL = current). archivedAt is a VIEW/lifecycle state, independent of Project.status,
-- and never an authorization filter. No destructive change; existing columns/tables untouched.

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "projects_tenantId_archivedAt_idx" ON "projects"("tenantId", "archivedAt");
