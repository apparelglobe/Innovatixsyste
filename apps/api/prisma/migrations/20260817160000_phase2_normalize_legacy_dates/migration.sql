-- Phase 2 (S2.4): normalize LEGACY date-only values that were stored at UTC midnight (which render
-- a day early in ET) to NOON UTC — matching parseDateInput() for all new writes.
--
-- Safety: only rows whose value is EXACTLY 00:00:00.000 UTC are shifted. These columns are
-- `timestamp(3)` (no time zone), so date_trunc('day', x) compares the stored wall-time directly
-- (no session-tz surprises). A genuine event timestamp (e.g. a SENT invoice's issuedAt = new Date())
-- has sub-second precision and is essentially never exactly midnight, so real instants are untouched.
-- Idempotent: after the shift a value sits at 12:00:00, so a re-run matches nothing.

UPDATE "projects"        SET "dueDate"     = "dueDate"     + interval '12 hours' WHERE "dueDate"     IS NOT NULL AND "dueDate"     = date_trunc('day', "dueDate");
UPDATE "milestones"      SET "dueDate"     = "dueDate"     + interval '12 hours' WHERE "dueDate"     IS NOT NULL AND "dueDate"     = date_trunc('day', "dueDate");
UPDATE "project_reports" SET "periodStart" = "periodStart" + interval '12 hours' WHERE "periodStart" IS NOT NULL AND "periodStart" = date_trunc('day', "periodStart");
UPDATE "project_reports" SET "periodEnd"   = "periodEnd"   + interval '12 hours' WHERE "periodEnd"   IS NOT NULL AND "periodEnd"   = date_trunc('day', "periodEnd");
UPDATE "invoices"        SET "dueAt"       = "dueAt"       + interval '12 hours' WHERE "dueAt"       IS NOT NULL AND "dueAt"       = date_trunc('day', "dueAt");
UPDATE "invoices"        SET "issuedAt"    = "issuedAt"    + interval '12 hours' WHERE "issuedAt"    IS NOT NULL AND "issuedAt"    = date_trunc('day', "issuedAt");
