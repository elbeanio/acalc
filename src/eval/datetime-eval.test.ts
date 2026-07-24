import { describe, it, expect } from 'vitest';
import { parse } from '../lang/index.ts';
import { evaluate } from './evaluate.ts';

// A fixed clock so `today` is deterministic: 2026-07-24, local.
const NOW = new Date(2026, 6, 24, 12, 0, 0).getTime();
const run = (src: string) =>
  evaluate(parse(src), () => {
    throw new Error('no references in these tests');
  }, undefined, NOW).toDisplay();

describe('dates', () => {
  it('date literals and today', () => {
    expect(run('2026-12-25')).toBe('2026-12-25');
    expect(run('today')).toBe('2026-07-24');
  });

  it('date − date is a duration in days', () => {
    expect(run('2026-12-25 - 2026-12-20')).toBe('5day');
    expect(run('2026-12-25 - today')).toBe('154day');
  });

  it('date ± a fixed duration shifts the date', () => {
    expect(run('today + 3 weeks')).toBe('2026-08-14');
    expect(run('today + 10 days')).toBe('2026-08-03');
    expect(run('2026-03-01 - 1 day')).toBe('2026-02-28');
  });

  it('months and years use calendar arithmetic with clamping', () => {
    expect(run('2026-01-31 + 1 month')).toBe('2026-02-28');
    expect(run('2026-12-25 + 1 month')).toBe('2027-01-25');
    expect(run('today + 2 years')).toBe('2028-07-24');
    expect(run('2024-02-29 + 1 year')).toBe('2025-02-28');
  });

  it('a date difference converts to other units', () => {
    expect(run('(2026-12-25 - today) in weeks')).toBe('22week');
  });

  it('rejects nonsense', () => {
    expect(() => run('today + 5')).toThrow(); // needs a unit
    expect(() => run('2026-12-25 + 2026-12-20')).toThrow(/add two dates/);
    expect(() => run('2026-02-31')).toThrow(/not a valid date/);
    expect(() => run('2026-13-01')).toThrow(/not a valid date/);
  });
});
