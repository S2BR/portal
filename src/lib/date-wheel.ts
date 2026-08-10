/**
 * Pure helpers for a date-of-birth wheel picker — locale-aware column order and month names, plus
 * day-count and range math. No DOM, so they're unit-tested directly.
 */

export type DateField = "year" | "month" | "day";
export type DateParts = { year: number; month: number; day: number };

/** The order the three wheels should appear in, following the locale's own date format. */
export function fieldOrder(locale: string): DateField[] {
  const parts = new Intl.DateTimeFormat(locale).formatToParts(
    new Date(2000, 0, 2),
  );
  const order = parts
    .map((part) => part.type)
    .filter(
      (type): type is DateField =>
        type === "year" || type === "month" || type === "day",
    );
  // Fall back to Y-M-D if a locale ever yields something unexpected.
  return order.length === 3 ? order : ["year", "month", "day"];
}

/** Localized full month names, index 0 = January. */
export function monthLabels(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, index) =>
    format.format(new Date(2000, index, 1)),
  );
}

/** Days in a 1-indexed month of a given year (leap-aware). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Keep a day valid when the month/year changes (e.g. Jan 31 → Feb clamps to 28/29). */
export function clampDay(day: number, year: number, month: number): number {
  return Math.min(day, daysInMonth(year, month));
}

/**
 * Inclusive [min, max] birth years for a minimum age, with a 120-year floor. `max` is the newest
 * year someone `minAge` old could have been born in.
 */
export function yearBounds(
  minAge: number,
  referenceYear: number,
): { min: number; max: number } {
  return { min: referenceYear - 120, max: referenceYear - minAge };
}

/** Format parts as `YYYY-MM-DD`. */
export function toISO({ year, month, day }: DateParts): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Parse `YYYY-MM-DD` into parts, or null if it isn't a real calendar date. */
export function fromISO(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}
