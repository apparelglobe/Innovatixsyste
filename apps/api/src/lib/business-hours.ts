/**
 * Business-hours-aware SLA due-date calculation. Adds N minutes of business time
 * (Mon–Fri, 09:00–17:00) in the given IANA timezone. The tz offset is sampled at
 * the start instant and held constant across the window — fine for a few-hour SLA
 * (a full tz library would be needed for DST-boundary precision).
 */
const OPEN_MIN = 9 * 60; // 09:00
const CLOSE_MIN = 17 * 60; // 17:00
const DAY_MIN = 24 * 60;

function wallParts(instantMs: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(instantMs)).map((x) => [x.type, x.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  // Build a "wall clock" ms value (local time treated as if UTC).
  const wallMs = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === '24' ? '0' : p.hour),
    Number(p.minute),
  );
  return { wallMs, weekday: weekdayMap[p.weekday as string] };
}

export function computeSlaDueAt(start: Date, targetMinutes: number, tz: string): Date {
  const startMs = start.getTime();
  const { wallMs: startWall } = wallParts(startMs, tz);
  const offsetMs = startWall - startMs; // tz offset, held constant across the window

  let cursor = startWall; // operate in wall-clock ms
  let remaining = Math.max(0, targetMinutes);

  const dayStart = (ms: number) => Math.floor(ms / (DAY_MIN * 60_000)) * (DAY_MIN * 60_000);
  const weekdayOf = (ms: number) => new Date(ms).getUTCDay(); // wall-clock day-of-week
  const minuteOfDay = (ms: number) => (ms - dayStart(ms)) / 60_000;

  // Guard against infinite loops.
  for (let guard = 0; guard < 1000 && remaining > 0; guard++) {
    const wd = weekdayOf(cursor);
    const mod = minuteOfDay(cursor);

    if (wd === 0 || wd === 6) {
      // weekend → jump to next day 09:00
      cursor = dayStart(cursor) + DAY_MIN * 60_000 + OPEN_MIN * 60_000;
      continue;
    }
    if (mod < OPEN_MIN) {
      cursor = dayStart(cursor) + OPEN_MIN * 60_000;
      continue;
    }
    if (mod >= CLOSE_MIN) {
      cursor = dayStart(cursor) + DAY_MIN * 60_000 + OPEN_MIN * 60_000;
      continue;
    }
    const minsLeftToday = CLOSE_MIN - mod;
    const take = Math.min(remaining, minsLeftToday);
    cursor += take * 60_000;
    remaining -= take;
  }

  // Convert wall-clock back to real UTC.
  return new Date(cursor - offsetMs);
}
