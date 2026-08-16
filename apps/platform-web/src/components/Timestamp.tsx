import { fmtDate, fmtDateTime, fmtDateTimeFull, isoTitle, DISPLAY_TZ_LABEL } from '@/lib/fmt';

/**
 * A rendered business-event date. Displays the canonical ET date (via fmt.ts) while exposing
 * the precise instant two ways: as a hover `title` and as a machine-readable `<time dateTime>`.
 *
 *  - `withTime`  → date + time instead of date only.
 *  - `withYear`  → include the year (only affects the `withTime` form, which is otherwise terse).
 *                  Use on the signed agreement, where an undated year is the ambiguity to avoid.
 *  - `withZone`  → append the "(ET)" label. Use on legally-meaningful, client-facing surfaces
 *                  (a signed agreement, an accepted proposal) where an unlabeled date is the one
 *                  place ambiguity actually costs you.
 *
 * Renders an em dash for null/empty so callers don't each repeat the guard.
 */
export function Timestamp({
  value,
  withTime = false,
  withYear = false,
  withZone = false,
  className,
}: {
  value?: string | null;
  withTime?: boolean;
  withYear?: boolean;
  withZone?: boolean;
  className?: string;
}) {
  if (!value) return <span className={className}>—</span>;
  const iso = isoTitle(value);
  const display = withTime ? (withYear ? fmtDateTimeFull(value) : fmtDateTime(value)) : fmtDate(value);
  return (
    <time dateTime={iso || undefined} title={iso || undefined} className={className}>
      {display}
      {withZone ? ` (${DISPLAY_TZ_LABEL})` : ''}
    </time>
  );
}
