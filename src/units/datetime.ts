/**
 * Calendar helpers for date values. Dates are held as an integer **day number**
 * (days since the Unix epoch, 1970-01-01 = 0), computed in UTC so there are no
 * time-zone or daylight-saving effects — dates never carry a time of day.
 */

const MS_PER_DAY = 86400000;

/** Seconds in the average month/year used by the fixed `month`/`year` units. */
export const MONTH_SECONDS = 2629800;

interface YMD {
  readonly y: number;
  readonly m: number; // 1-12
  readonly d: number;
}

function ymdToDay(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function dayToYMD(day: number): YMD {
  const dt = new Date(Math.floor(day) * MS_PER_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function pad(n: number, width: number): string {
  return String(Math.abs(n)).padStart(width, '0');
}

/** Render a day number as an ISO date, e.g. `2026-12-25`. */
export function formatDay(day: number): string {
  const { y, m, d } = dayToYMD(day);
  return `${y < 0 ? '-' : ''}${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

/** Parse an ISO `YYYY-MM-DD` date to a day number, or null if it isn't valid. */
export function parseISODate(s: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const day = ymdToDay(y, m, d);
  // Reject overflow like 2026-02-31 (which JS would roll into March).
  const back = dayToYMD(day);
  if (back.y !== y || back.m !== m || back.d !== d) return null;
  return day;
}

/** Add whole months to a date, clamping the day to the target month's length. */
export function addMonths(day: number, months: number): number {
  const { y, m, d } = dayToYMD(day);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12; // 0-based month
  const clampedDay = Math.min(d, daysInMonth(ny, nm));
  return ymdToDay(ny, nm + 1, clampedDay);
}

function daysInMonth(year: number, monthZeroBased: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

/** Today's date (in the local calendar) as a day number, from a clock in ms. */
export function todayDay(nowMs: number): number {
  const dt = new Date(nowMs);
  return ymdToDay(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}
