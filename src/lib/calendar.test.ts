import { describe, expect, it } from "vitest";

import { dateInClosure, overlappingClosure } from "./calendar";

describe("dateInClosure", () => {
  const oneOff = {
    startDate: "2026-09-22",
    endDate: "2026-09-24",
    isRecurring: false,
  };
  const recurring = {
    startDate: "2026-12-25",
    endDate: "2026-12-25",
    isRecurring: true,
  };
  const wraps = {
    startDate: "2026-12-31",
    endDate: "2027-01-01",
    isRecurring: true,
  };

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

describe("overlappingClosure (keeps two closures off the same date)", () => {
  const existing = {
    key: "a",
    startDate: "2026-08-24",
    endDate: "2026-08-24",
    isRecurring: false,
  };
  const entries = [existing];

  it("flags a new draft on a date another closure already covers (the duplicate bug)", () => {
    const draft = {
      key: "b",
      startDate: "2026-08-24",
      endDate: "2026-08-24",
      isRecurring: true,
    };
    expect(overlappingClosure(draft, entries, "b")).toBe(existing);
  });

  it("does not flag the closure being edited against itself", () => {
    // Editing `a` in place — its own date must not read as a collision.
    expect(overlappingClosure(existing, entries, "a")).toBeUndefined();
  });

  it("allows a draft on a free date", () => {
    const draft = {
      key: "b",
      startDate: "2026-08-25",
      endDate: "2026-08-25",
      isRecurring: false,
    };
    expect(overlappingClosure(draft, entries, "b")).toBeUndefined();
  });

  it("flags a range that straddles an existing single date", () => {
    const draft = {
      key: "b",
      startDate: "2026-08-23",
      endDate: "2026-08-25",
      isRecurring: false,
    };
    expect(overlappingClosure(draft, entries, "b")).toBe(existing);
  });
});
