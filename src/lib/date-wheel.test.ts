import { describe, expect, it } from "vitest";

import {
  clampDay,
  daysInMonth,
  fieldOrder,
  fromISO,
  monthLabels,
  toISO,
  yearBounds,
} from "@/lib/date-wheel";

describe("fieldOrder", () => {
  it("puts month before day for US English", () => {
    expect(fieldOrder("en")).toEqual(["month", "day", "year"]);
  });

  it("puts day before month for day-first locales", () => {
    expect(fieldOrder("pt-BR")).toEqual(["day", "month", "year"]);
    expect(fieldOrder("fr-CA")).toEqual(["year", "month", "day"]);
    expect(fieldOrder("es")).toEqual(["day", "month", "year"]);
  });
});

describe("monthLabels", () => {
  it("returns 12 localized month names", () => {
    const en = monthLabels("en");
    expect(en).toHaveLength(12);
    expect(en[0]).toBe("January");
    expect(en[11]).toBe("December");
    expect(monthLabels("pt-BR")[0]).toBe("janeiro");
  });
});

describe("daysInMonth", () => {
  it("is leap-aware", () => {
    expect(daysInMonth(2000, 2)).toBe(29); // leap century
    expect(daysInMonth(2001, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 1)).toBe(31);
    expect(daysInMonth(2023, 4)).toBe(30);
  });
});

describe("clampDay", () => {
  it("caps the day to the target month's length", () => {
    expect(clampDay(31, 2023, 2)).toBe(28);
    expect(clampDay(31, 2024, 2)).toBe(29);
    expect(clampDay(15, 2023, 6)).toBe(15);
  });
});

describe("yearBounds", () => {
  it("caps the newest year at the minimum age and floors at 120", () => {
    expect(yearBounds(13, 2026)).toEqual({ min: 1906, max: 2013 });
    expect(yearBounds(16, 2026)).toEqual({ min: 1906, max: 2010 });
  });
});

describe("toISO / fromISO", () => {
  it("round-trips a valid date", () => {
    const parts = { year: 1990, month: 5, day: 15 };
    expect(toISO(parts)).toBe("1990-05-15");
    expect(fromISO("1990-05-15")).toEqual(parts);
  });

  it("pads single digits", () => {
    expect(toISO({ year: 2001, month: 1, day: 3 })).toBe("2001-01-03");
  });

  it("rejects malformed or impossible dates", () => {
    expect(fromISO("05/15/1990")).toBeNull();
    expect(fromISO("1990-13-01")).toBeNull();
    expect(fromISO("2023-02-29")).toBeNull(); // not a leap year
    expect(fromISO("1990-00-10")).toBeNull();
  });
});
