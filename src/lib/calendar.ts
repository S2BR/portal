/**
 * Pure helpers for the month-grid calendar and for closed-date (closure) math. Dates are date-only
 * `YYYY-MM-DD` strings compared as plain strings to avoid timezone drift. Month numbers are
 * 1-indexed (matching {@link daysInMonth}/{@link toISO} in date-wheel).
 */

import { daysInMonth, fromISO, monthLabels, toISO } from "@/lib/date-wheel";

export type YearMonth = { year: number; month: number };

/** Today as `YYYY-MM-DD` in local time. */
export function todayISO(): string {
  const now = new Date();
  return toISO({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}

/** The {@link YearMonth} an ISO date falls in, or the current month when it can't be parsed. */
export function monthOf(iso: string | null): YearMonth {
  const parts = iso ? fromISO(iso) : null;
  if (parts) {
    return { year: parts.year, month: parts.month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Step a {@link YearMonth} by ±N months, rolling the year over. */
export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

/** Shift an ISO date by ±N days. */
export function addDays(iso: string, delta: number): string {
  const parts = fromISO(iso);
  if (!parts) {
    return iso;
  }
  const date = new Date(parts.year, parts.month - 1, parts.day + delta);
  return toISO({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

/** Sunday-first short weekday labels for the locale (2023-01-01 is a Sunday). */
export function weekdayLabels(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(2023, 0, 1 + index)),
  );
}

/** The localized month title, e.g. "December 2026". */
export function monthTitle(locale: string, { year, month }: YearMonth): string {
  return `${monthLabels(locale)[month - 1]} ${year}`;
}

/**
 * The calendar grid for a month as full Sunday-first weeks. Each cell is an ISO date string, or
 * null for the leading/trailing padding days.
 */
export function monthGrid({ year, month }: YearMonth): (string | null)[][] {
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const count = daysInMonth(year, month);
  const cells: (string | null)[] = [];
  for (let pad = 0; pad < firstWeekday; pad += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push(toISO({ year, month, day }));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

/** A full localized label for an ISO date, e.g. "Friday, December 25, 2026" — for aria-labels. */
export function fullDateLabel(locale: string, iso: string): string {
  const parts = fromISO(iso);
  if (!parts) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(parts.year, parts.month - 1, parts.day));
}

export type ClosurePeriod = {
  startDate: string;
  endDate: string;
  isRecurring: boolean;
};

/**
 * Whether an ISO date falls within a closure. A one-off matches the plain [start, end] range; a
 * recurring closure matches by month + day, ignoring the year (same-year ranges only — a recurring
 * range spanning year-end is out of scope).
 */
export function dateInClosure(iso: string, closure: ClosurePeriod): boolean {
  if (!closure.isRecurring) {
    return iso >= closure.startDate && iso <= closure.endDate;
  }
  const monthDay = iso.slice(5);
  return (
    monthDay >= closure.startDate.slice(5) && monthDay <= closure.endDate.slice(5)
  );
}

/** A localized display of a closure's date(s): a single date, or "start – end". Recurring drops the year. */
export function formatClosureDate(
  locale: string,
  startISO: string,
  endISO: string,
  recurring: boolean,
): string {
  const options: Intl.DateTimeFormatOptions = recurring
    ? { day: "numeric", month: "short" }
    : { day: "numeric", month: "short", year: "numeric" };
  const format = new Intl.DateTimeFormat(locale, options);
  const start = fromISO(startISO);
  const end = fromISO(endISO);
  if (!start || !end) {
    return startISO;
  }
  const startDate = format.format(new Date(start.year, start.month - 1, start.day));
  if (startISO === endISO) {
    return startDate;
  }
  const endDate = format.format(new Date(end.year, end.month - 1, end.day));
  return `${startDate} – ${endDate}`;
}
