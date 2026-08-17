/**
 * Parse a staff-entered date into an instant.
 *
 * A date-only value (YYYY-MM-DD, as an <input type="date"> yields) is pinned to NOON UTC so it
 * renders as the chosen calendar day in ET (America/New_York) rather than slipping to the day
 * before at midnight. Full timestamps pass through unchanged.
 *
 * Single source for EVERY staff-entered date (invoice due, milestone due, project due, report
 * period, next-update) so no field silently reintroduces the off-by-one.
 */
export function parseDateInput(s: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00Z` : s);
}
