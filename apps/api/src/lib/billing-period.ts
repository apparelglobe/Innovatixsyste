/**
 * Billing-period math for recurring Care Plan (retainer) invoices (Phase 3 / P3.2).
 *
 * Everything is anchored to the business timezone (America/New_York) and pinned to NOON UTC — the
 * same convention as parseDateInput — so a period boundary renders as the intended ET calendar day
 * and never slips a day at a midnight/offset boundary. Because billingAnchorDay is always ≤ 28
 * (capped at activation in P3.1), the anchor day exists in EVERY month, so no month-end (29/30/31)
 * date can ever be produced — month-end capping is handled at the anchor, not here.
 */
const BILLING_TZ = 'America/New_York';

/** The ET calendar Y/M/D of an instant. */
function etYMD(d: Date): { y: number; m: number; day: number } {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: BILLING_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const [y, m, day] = s.split('-').map(Number);
  return { y, m, day };
}

/** 'YYYY-MM-DD' ET calendar-day label — the canonical period key (idempotency + display). */
export function periodLabel(d: Date): string {
  const { y, m, day } = etYMD(d);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Pin an instant to NOON UTC of its ET calendar day — a stable, offset-proof period boundary. */
export function etDayNoonUTC(d: Date): Date {
  return new Date(`${periodLabel(d)}T12:00:00Z`);
}

/** Clamp a raw anchor day into the safe 1–28 range (defence-in-depth; P3.1 already caps at 28). */
export function safeAnchorDay(anchorDay: number): number {
  return Math.min(28, Math.max(1, Math.floor(anchorDay) || 1));
}

/** The next cycle's start: the anchorDay-th day of the month AFTER `periodStart`'s ET month, noon UTC.
 *  anchorDay ≤ 28 always exists, so this never overflows a short month. */
export function nextCycleStart(periodStart: Date, anchorDay: number): Date {
  const { y, m } = etYMD(periodStart);
  const day = safeAnchorDay(anchorDay);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return new Date(`${ny}-${String(nm).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`);
}

/** The inclusive last day of a period — the ET day before the next cycle starts, noon UTC. */
export function periodEndFor(periodStart: Date, anchorDay: number): Date {
  const next = nextCycleStart(periodStart, anchorDay);
  return etDayNoonUTC(new Date(next.getTime() - 24 * 60 * 60 * 1000));
}
