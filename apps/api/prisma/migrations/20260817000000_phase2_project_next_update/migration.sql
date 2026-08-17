-- Phase 2 · S3 — the "Our Turn — next update by <date>" commitment (staff-set, client-facing).
-- Additive + nullable: existing rows read as "no committed date" and the workspace card degrades
-- gracefully (never an empty/broken Our-Turn state).
-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "nextUpdateAt" TIMESTAMP(3),
ADD COLUMN     "nextUpdateNote" TEXT;
