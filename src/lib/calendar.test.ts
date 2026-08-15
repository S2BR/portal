import { describe, expect, it } from "vitest";

import { dateInClosure } from "./calendar";

describe("dateInClosure", () => {
  const oneOff = { startDate: "2026-09-22", endDate: "2026-09-24", isRecurring: false };
  const recurring = { startDate: "2026-12-25", endDate: "2026-12-25", isRecurring: true };
  const wraps = { startDate: "2026-12-31", endDate: "2027-01-01", isRecurring: true };

  it("matches a one-off range by full date", () => {
    expect(dateInClosure("2026-09-23", oneOff)).toBe(true);
    expect(dateInClosure("2026-09-25", oneOff)).toBe(false);
  });

  it("matches a recurring closure by month + day, any year", () => {
    expect(dateInClosure("2030-12-25", recurring)).toBe(true);
    expect(dateInClosure("2030-12-24", recurring)).toBe(false);
  });

  it("matches a recurring range that WRAPS year-end (Dec 31 – Jan 1)", () => {
    // Both ends of the wrap are inside…
    expect(dateInClosure("2028-12-31", wraps)).toBe(true);
    expect(dateInClosure("2028-01-01", wraps)).toBe(true);
    // …and a date in the middle of the year is not.
    expect(dateInClosure("2028-06-15", wraps)).toBe(false);
    expect(dateInClosure("2028-12-30", wraps)).toBe(false);
  });
});
