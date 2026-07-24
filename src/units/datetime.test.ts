import { describe, it, expect } from 'vitest';
import { addMonths, formatDay, parseISODate, todayDay } from './datetime.ts';

describe('datetime helpers', () => {
  it('round-trips ISO dates', () => {
    expect(formatDay(parseISODate('2026-12-25')!)).toBe('2026-12-25');
    expect(formatDay(parseISODate('1970-01-01')!)).toBe('1970-01-01');
  });

  it('rejects invalid dates', () => {
    expect(parseISODate('2026-02-31')).toBeNull(); // Feb has 28 days
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('2026-00-10')).toBeNull();
    expect(parseISODate('nonsense')).toBeNull();
  });

  it('adds months with end-of-month clamping', () => {
    const jan31 = parseISODate('2026-01-31')!;
    expect(formatDay(addMonths(jan31, 1))).toBe('2026-02-28');
    expect(formatDay(addMonths(jan31, 13))).toBe('2027-02-28');
    expect(formatDay(addMonths(jan31, -1))).toBe('2025-12-31');
    const leap = parseISODate('2024-02-29')!;
    expect(formatDay(addMonths(leap, 12))).toBe('2025-02-28');
  });

  it('todayDay reflects the local calendar date of a clock', () => {
    expect(formatDay(todayDay(new Date(2026, 6, 24, 9, 30).getTime()))).toBe(
      '2026-07-24',
    );
  });
});
