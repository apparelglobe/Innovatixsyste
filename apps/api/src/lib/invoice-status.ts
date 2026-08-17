/**
 * Single source of truth for "is this invoice overdue".
 *
 * OVERDUE is NOT swept into the stored status server-side (there's no cron flipping SENT→OVERDUE
 * when a due date passes). So the workspace status card and the client invoice screens must all
 * derive it the SAME way — here — instead of each trusting the raw stored status (which produced
 * "overdue on Home / Due on the invoices list" for the same past-due invoice).
 *
 * PAID / VOIDED / DRAFT are never overdue.
 */
export function isInvoiceOverdue(inv: { status: string; dueAt: Date | string | null }, now: number = Date.now()): boolean {
  if (inv.status === 'OVERDUE') return true;
  if (inv.status !== 'SENT') return false; // PAID, VOIDED, DRAFT
  return inv.dueAt != null && new Date(inv.dueAt).getTime() < now;
}
