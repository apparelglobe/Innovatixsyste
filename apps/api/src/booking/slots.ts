/**
 * Timezone-aware slot generation for the native scheduler — no external date
 * library. Availability is expressed in a business timezone (e.g. America/
 * New_York); we convert wall-clock business hours to precise UTC instants so
 * slots are correct across DST changes.
 */

export type SlotConfig = {
  timeZone: string;
  weekdays: number[]; // 0=Sun .. 6=Sat
  startHour: number;
  endHour: number;
  slotMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
};

export type Slot = { start: string; label: string }; // start = ISO UTC, label = local time

/** UTC offset (minutes) that `timeZone` has at a given instant. EDT = -240, EST = -300. */
export function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value);
  // Interpret the wall-clock reading as if it were UTC, then diff against the instant.
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour === 24 ? 0 : map.hour, map.minute, map.second);
  return Math.round((asUTC - instant.getTime()) / 60000);
}

/** UTC Date for a wall-clock time (y, m[1-12], d, hh, mm) in `timeZone`. DST-safe. */
export function zonedWallTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  // Adjust twice so DST-transition days resolve to the correct instant.
  let utc = new Date(guess.getTime() - tzOffsetMinutes(guess, timeZone) * 60000);
  utc = new Date(guess.getTime() - tzOffsetMinutes(utc, timeZone) * 60000);
  return utc;
}

/** Format a UTC instant as a local time label, e.g. "9:30 AM", in `timeZone`. */
export function localTimeLabel(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(instant);
}

/** Weekday (0=Sun..6=Sat) of a calendar date `YYYY-MM-DD` — noon avoids tz edge shifts. */
function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

/** True when the date string is a well-formed YYYY-MM-DD. */
export function isValidDateStr(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2020 && y <= 2100;
}

/**
 * Free slots for one business date. `bookedMillis` is the set of already-taken
 * slot-start times (ms). Slots in the past or inside the minimum-notice window
 * are excluded. `now` is injected for testability.
 */
export function generateSlots(dateStr: string, cfg: SlotConfig, bookedMillis: Set<number>, now: Date): Slot[] {
  if (!isValidDateStr(dateStr)) return [];
  if (!cfg.weekdays.includes(weekdayOf(dateStr))) return [];

  const [y, m, d] = dateStr.split('-').map(Number);
  const earliest = now.getTime() + cfg.minNoticeHours * 3600_000;
  const horizon = now.getTime() + cfg.maxDaysAhead * 86_400_000;
  const out: Slot[] = [];

  for (let mins = cfg.startHour * 60; mins + cfg.slotMinutes <= cfg.endHour * 60; mins += cfg.slotMinutes) {
    const start = zonedWallTimeToUtc(y, m, d, Math.floor(mins / 60), mins % 60, cfg.timeZone);
    const t = start.getTime();
    if (t < earliest || t > horizon) continue;
    if (bookedMillis.has(t)) continue;
    out.push({ start: start.toISOString(), label: localTimeLabel(start, cfg.timeZone) });
  }
  return out;
}

/** Parse the config strings/numbers into a SlotConfig. */
export function slotConfigFrom(env: {
  BOOKING_TIMEZONE: string;
  BOOKING_WEEKDAYS: string;
  BOOKING_START_HOUR: number;
  BOOKING_END_HOUR: number;
  BOOKING_SLOT_MINUTES: number;
  BOOKING_MIN_NOTICE_HOURS: number;
  BOOKING_MAX_DAYS_AHEAD: number;
}): SlotConfig {
  return {
    timeZone: env.BOOKING_TIMEZONE,
    weekdays: env.BOOKING_WEEKDAYS.split(',').map((s) => Number(s.trim())).filter((n) => n >= 0 && n <= 6),
    startHour: env.BOOKING_START_HOUR,
    endHour: env.BOOKING_END_HOUR,
    slotMinutes: env.BOOKING_SLOT_MINUTES,
    minNoticeHours: env.BOOKING_MIN_NOTICE_HOURS,
    maxDaysAhead: env.BOOKING_MAX_DAYS_AHEAD,
  };
}
