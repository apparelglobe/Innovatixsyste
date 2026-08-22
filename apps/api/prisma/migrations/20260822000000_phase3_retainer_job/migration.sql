-- Phase 3 (P3.2) — the recurring Care Plan invoice generator rides the existing durable job queue.
-- Add its job type. Additive: PG12+ allows ADD VALUE in a transaction; the value is not USED in this
-- migration (the worker enqueues it later, in a separate transaction after this commits).
ALTER TYPE "JobType" ADD VALUE 'GENERATE_RETAINER_INVOICE';
