// Slice 6 — the ONE invoice status/label source, shared by the billing list AND the invoice detail so the
// two can never drift. Extracted verbatim from the previously-duplicated STATUS maps.
import { fmtDate } from './fmt';

export type StatusBadge = { label: string; cls: string };

export const INVOICE_STATUS: Record<string, StatusBadge> = {
  PAID: { label: 'Paid', cls: 'bg-emerald-400/15 text-emerald-300' },
  SENT: { label: 'Due', cls: 'bg-amber-400/15 text-amber-300' },
  OVERDUE: { label: 'Overdue', cls: 'bg-red-500/15 text-red-300' },
  DRAFT: { label: 'Draft', cls: 'bg-white/10 text-neutral-300' },
  VOIDED: { label: 'Void', cls: 'bg-white/5 text-neutral-500 line-through' },
};

/** Badge for an invoice: a derived-overdue row shows the Overdue badge regardless of stored status. */
export function statusBadge(inv: { status: string; overdue?: boolean }): StatusBadge {
  return INVOICE_STATUS[inv.overdue ? 'OVERDUE' : inv.status] ?? { label: inv.status, cls: 'bg-white/10 text-neutral-300' };
}

export const isRetainer = (inv: { kind?: string }): boolean => inv.kind === 'RETAINER';

/** The Care Plan billing-period label for a RETAINER invoice, else null. */
export function carePlanPeriod(inv: { kind?: string; billingPeriodStart?: string | null; billingPeriodEnd?: string | null }): string | null {
  return isRetainer(inv) && inv.billingPeriodStart
    ? `${fmtDate(inv.billingPeriodStart)}${inv.billingPeriodEnd ? ` – ${fmtDate(inv.billingPeriodEnd)}` : ''}`
    : null;
}
