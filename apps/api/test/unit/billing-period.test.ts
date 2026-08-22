import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodLabel, etDayNoonUTC, nextCycleStart, periodEndFor, safeAnchorDay } from '../../src/lib/billing-period';

test('periodLabel + etDayNoonUTC pin to the ET calendar day (noon UTC)', () => {
  // Late-evening UTC is still the same ET day; early-morning UTC (00:30) is the PREVIOUS ET day.
  assert.equal(periodLabel(new Date('2026-01-15T18:00:00Z')), '2026-01-15');
  assert.equal(periodLabel(new Date('2026-01-15T04:59:00Z')), '2026-01-14'); // 23:59 ET on the 14th
  assert.equal(etDayNoonUTC(new Date('2026-01-15T18:00:00Z')).toISOString(), '2026-01-15T12:00:00.000Z');
});

test('safeAnchorDay clamps to 1..28', () => {
  assert.equal(safeAnchorDay(31), 28);
  assert.equal(safeAnchorDay(0), 1);
  assert.equal(safeAnchorDay(15), 15);
  assert.equal(safeAnchorDay(NaN), 1);
});

test('nextCycleStart bills the anchor day of the next month — never an invalid month-end date', () => {
  // Activated on the 31st, anchor capped to 28 → next cycle is the 28th, and stays valid every month.
  const jan31 = etDayNoonUTC(new Date('2026-01-31T18:00:00Z'));
  assert.equal(periodLabel(nextCycleStart(jan31, 28)), '2026-02-28'); // NOT Feb 31
  assert.equal(periodLabel(nextCycleStart(nextCycleStart(jan31, 28), 28)), '2026-03-28');
  // February (short month) → March, still valid.
  assert.equal(periodLabel(nextCycleStart(etDayNoonUTC(new Date('2026-02-28T12:00:00Z')), 28)), '2026-03-28');
  // Leap-year February exists but anchor 28 is unaffected.
  assert.equal(periodLabel(nextCycleStart(etDayNoonUTC(new Date('2028-01-28T12:00:00Z')), 28)), '2028-02-28');
  // Year rollover Dec → Jan.
  assert.equal(periodLabel(nextCycleStart(etDayNoonUTC(new Date('2026-12-15T12:00:00Z')), 15)), '2027-01-15');
});

test('periodEndFor is the inclusive day BEFORE the next cycle', () => {
  const jan15 = etDayNoonUTC(new Date('2026-01-15T12:00:00Z'));
  assert.equal(periodLabel(periodEndFor(jan15, 15)), '2026-02-14');
  const jan31 = etDayNoonUTC(new Date('2026-01-31T12:00:00Z'));
  assert.equal(periodLabel(periodEndFor(jan31, 28)), '2026-02-27');
});
