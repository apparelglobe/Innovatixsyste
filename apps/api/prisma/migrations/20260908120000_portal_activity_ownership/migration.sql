-- Slice 2 — PortalActivity relationship ownership + snapshot actors.
--
-- Staged + FAIL-CLOSED: add nullable columns → backfill clientOrgId (tenant-matched) → four consistency
-- assertions that ABORT the migration if violated → projectId nullable → clientOrgId NOT NULL + FK RESTRICT
-- → replace the single-column project index with tenant-leading composites.
--
-- There is deliberately NO "ON DELETE SET NULL" anywhere:
--   • The existing "portal_activities_projectId_fkey" (ON DELETE RESTRICT) is left UNTOUCHED — dropping the
--     NOT NULL constraint on a column does not drop or alter its foreign key, so projectId keeps RESTRICT.
--   • The new clientOrg foreign key is RESTRICT.
-- A deleted project must never silently reclassify a project-scoped historical row into a relationship one.

-- (1) additive columns, nullable first (safe on a populated table)
ALTER TABLE "portal_activities" ADD COLUMN "clientOrgId" TEXT;
ALTER TABLE "portal_activities" ADD COLUMN "actorType" "ActorType";
ALTER TABLE "portal_activities" ADD COLUMN "actorId" TEXT;
ALTER TABLE "portal_activities" ADD COLUMN "actorName" TEXT;

-- (2) backfill clientOrgId from each activity's OWN project, matched on tenant so it can NEVER cross a
--     tenant boundary. Every pre-Slice-2 row has a non-null projectId in the same tenant, so all rows fill.
UPDATE "portal_activities" a
   SET "clientOrgId" = p."clientOrgId"
  FROM "projects" p
 WHERE a."projectId" = p."id" AND a."tenantId" = p."tenantId";

-- (3) FOUR fail-closed consistency assertions — the migration ABORTS (RAISE EXCEPTION, rolls back the whole
--     transaction) if any invariant is violated, BEFORE the NOT NULL constraint is trusted.
DO $$
DECLARE n BIGINT;
BEGIN
  -- (a) every row received an org
  SELECT count(*) INTO n FROM "portal_activities" WHERE "clientOrgId" IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION 'portal_activities backfill: % row(s) with NULL clientOrgId', n; END IF;

  -- (b) activity tenant == owning-org tenant
  SELECT count(*) INTO n
    FROM "portal_activities" a JOIN "client_orgs" o ON a."clientOrgId" = o."id"
   WHERE o."tenantId" <> a."tenantId";
  IF n <> 0 THEN RAISE EXCEPTION 'portal_activities backfill: % row(s) where activity.tenantId <> org.tenantId', n; END IF;

  -- (c) activity tenant == project tenant (only meaningful where projectId is set)
  SELECT count(*) INTO n
    FROM "portal_activities" a JOIN "projects" p ON a."projectId" = p."id"
   WHERE p."tenantId" <> a."tenantId";
  IF n <> 0 THEN RAISE EXCEPTION 'portal_activities backfill: % row(s) where activity.tenantId <> project.tenantId', n; END IF;

  -- (d) activity org == project org (only meaningful where projectId is set)
  SELECT count(*) INTO n
    FROM "portal_activities" a JOIN "projects" p ON a."projectId" = p."id"
   WHERE p."clientOrgId" <> a."clientOrgId";
  IF n <> 0 THEN RAISE EXCEPTION 'portal_activities backfill: % row(s) where activity.clientOrgId <> project.clientOrgId', n; END IF;
END $$;

-- (4) projectId → nullable. Does NOT drop "portal_activities_projectId_fkey"; it stays ON DELETE RESTRICT.
ALTER TABLE "portal_activities" ALTER COLUMN "projectId" DROP NOT NULL;

-- (5) finalize clientOrgId: NOT NULL + FK RESTRICT (matches Prisma `clientOrg ... onDelete: Restrict`)
ALTER TABLE "portal_activities" ALTER COLUMN "clientOrgId" SET NOT NULL;
ALTER TABLE "portal_activities"
  ADD CONSTRAINT "portal_activities_clientOrgId_fkey"
  FOREIGN KEY ("clientOrgId") REFERENCES "client_orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- (6) indexes: replace the single-column project index with tenant-leading composites (all reads are
--     tenant-scoped, so the old [projectId, createdAt] is redundant — replaced, not duplicated).
DROP INDEX "portal_activities_projectId_createdAt_idx";
CREATE INDEX "portal_activities_tenantId_clientOrgId_createdAt_idx" ON "portal_activities"("tenantId", "clientOrgId", "createdAt");
CREATE INDEX "portal_activities_tenantId_projectId_createdAt_idx" ON "portal_activities"("tenantId", "projectId", "createdAt");
