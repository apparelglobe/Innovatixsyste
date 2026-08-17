-- Phase 2 (S2.1): a VOIDED invoice state so staff can cancel/correct an invoice WITHOUT
-- fabricating a payment. VOIDED is excluded from the payable set and never shows a Pay action.
-- Adding an enum value is additive and safe (PG12+ allows it inside the migration transaction).
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'VOIDED';
