-- Phase 2 (S4 D3): finish the legacy date-only normalization. The prior migration covered the six
-- staff-date-input columns; this covers the three remaining date-RENDERED columns that still hold
-- legacy/seed values stored at UTC midnight (which render a day early in ET): invoices.paidAt,
-- milestones.completedAt, projects.startDate.
--
-- Same exactly-00:00:00.000 guard as before, so genuine event timestamps (sub-second precision,
-- e.g. a real markInvoicePaid paidAt) are NEVER touched — only date-only/seed midnight values shift.
-- Idempotent: after the shift a value sits at 12:00:00, so a re-run matches nothing.
-- Audited row counts on prod at authoring time: paidAt 1, completedAt 2, startDate 1 (4 rows total).

UPDATE "invoices"   SET "paidAt"      = "paidAt"      + interval '12 hours' WHERE "paidAt"      IS NOT NULL AND "paidAt"      = date_trunc('day', "paidAt");
UPDATE "milestones" SET "completedAt" = "completedAt" + interval '12 hours' WHERE "completedAt" IS NOT NULL AND "completedAt" = date_trunc('day', "completedAt");
UPDATE "projects"   SET "startDate"   = "startDate"   + interval '12 hours' WHERE "startDate"   IS NOT NULL AND "startDate"   = date_trunc('day', "startDate");
