import { describe, expect, it } from "vitest";

import {
  closureHasInvalidWindow,
  closureIsElapsedHistory,
  closureIsPast,
  closureSaveError,
} from "./closure-time";

// 02:00 UTC on the 23rd is 22:00 on the 22nd in Toronto (UTC-4).
const now = new Date("2026-08-23T02:00:00Z");
const tz = "America/Toronto";

const closure = (over: Partial<Parameters<typeof closureIsPast>[0]> = {}) => ({
  startDate: "2026-08-22",
  endDate: "2026-08-22",
  isRecurring: false,
  hours: [] as { open: string; close: string }[],
  ...over,
});

describe("closureIsPast (business timezone)", () => {
  it("treats today's date as not-past even when UTC has rolled over", () => {
    expect(closureIsPast(closure(), tz, now)).toBe(false); // closed all day today
  });

  it("keeps a window still open right now (21:00–23:00 at 22:00)", () => {
    expect(
      closureIsPast(
        closure({ hours: [{ open: "21:00", close: "23:00" }] }),
        tz,
        now,
      ),
    ).toBe(false);
  });

  it("keeps an upcoming window later today (22:30–23:30 at 22:00)", () => {
    expect(
      closureIsPast(
        closure({ hours: [{ open: "22:30", close: "23:30" }] }),
        tz,
        now,
      ),
    ).toBe(false);
  });

  it("marks a fully-closed today window as past (09:00–12:00 at 22:00)", () => {
    expect(
      closureIsPast(
        closure({ hours: [{ open: "09:00", close: "12:00" }] }),
        tz,
        now,
      ),
    ).toBe(true);
  });

  it("keeps an overnight window (22:00–02:00) — runs into tomorrow", () => {
    expect(
      closureIsPast(
        closure({ hours: [{ open: "22:00", close: "02:00" }] }),
        tz,
        now,
      ),
    ).toBe(false);
  });

  it("marks yesterday as past and keeps a future date", () => {
    expect(
      closureIsPast(
        closure({ startDate: "2026-08-21", endDate: "2026-08-21" }),
        tz,
        now,
      ),
    ).toBe(true);
    expect(
      closureIsPast(
        closure({ startDate: "2026-09-01", endDate: "2026-09-01" }),
        tz,
        now,
      ),
    ).toBe(false);
  });

  it("keeps a multi-day range that reaches past today", () => {
    expect(
      closureIsPast(
        closure({
          startDate: "2026-08-22",
          endDate: "2026-08-25",
          hours: [{ open: "09:00", close: "12:00" }],
        }),
        tz,
        now,
      ),
    ).toBe(false);
  });

  it("never marks a recurring closure past", () => {
    expect(
      closureIsPast(
        closure({
          startDate: "2020-12-25",
          endDate: "2020-12-25",
          isRecurring: true,
        }),
        tz,
        now,
      ),
    ).toBe(false);
  });
});

describe("closureHasInvalidWindow", () => {
  const c = (hours: { open: string; close: string }[]) => ({ hours });

  it("flags a close at or before the open", () => {
    expect(
      closureHasInvalidWindow(c([{ open: "22:00", close: "20:00" }])),
    ).toBe(true);
    expect(
      closureHasInvalidWindow(c([{ open: "22:00", close: "22:00" }])),
    ).toBe(true);
  });

  it("accepts a close strictly after the open, and an empty set", () => {
    expect(
      closureHasInvalidWindow(c([{ open: "09:00", close: "17:00" }])),
    ).toBe(false);
    expect(closureHasInvalidWindow(c([]))).toBe(false);
  });
});

describe("closureIsElapsedHistory (end-based — what the editor hides)", () => {
  it("hides a today date whose windows have all closed (09:00–12:00 at 22:00)", () => {
    expect(
      closureIsElapsedHistory(
        closure({ hours: [{ open: "09:00", close: "12:00" }] }),
        tz,
        now,
      ),
    ).toBe(true);
  });

  it("keeps a today date still open or upcoming, and closed-all-day today", () => {
    expect(
      closureIsElapsedHistory(
        closure({ hours: [{ open: "21:00", close: "23:00" }] }),
        tz,
        now,
      ),
    ).toBe(false);
    expect(
      closureIsElapsedHistory(
        closure({ hours: [{ open: "22:30", close: "23:30" }] }),
        tz,
        now,
      ),
    ).toBe(false);
    expect(closureIsElapsedHistory(closure(), tz, now)).toBe(false); // closed all day today
  });

  it("hides a date that ended before today, keeps a future date", () => {
    expect(
      closureIsElapsedHistory(
        closure({ startDate: "2026-08-21", endDate: "2026-08-21" }),
        tz,
        now,
      ),
    ).toBe(true);
    expect(
      closureIsElapsedHistory(
        closure({ startDate: "2026-09-01", endDate: "2026-09-01" }),
        tz,
        now,
      ),
    ).toBe(false);
  });

  it("keeps an ongoing multi-day range whose end is still ahead (unlike closureIsPast)", () => {
    const ongoing = closure({ startDate: "2026-08-20", endDate: "2026-08-25" });
    // Start has gone by, so the start-based check calls it past...
    expect(closureIsPast(ongoing, tz, now)).toBe(true);
    // ...but it's still in effect, so it is NOT history and stays editable.
    expect(closureIsElapsedHistory(ongoing, tz, now)).toBe(false);
  });

  it("never treats a recurring closure as history", () => {
    expect(
      closureIsElapsedHistory(
        closure({
          startDate: "2020-01-01",
          endDate: "2020-01-01",
          isRecurring: true,
        }),
        tz,
        now,
      ),
    ).toBe(false);
  });
});

describe("closureSaveError (only validates the section being sent)", () => {
  // A closure whose date has fully elapsed — the exact kind left over from earlier testing that was
  // wrongly blocking unrelated saves.
  const pastClosure = closure({
    startDate: "2026-08-20",
    endDate: "2026-08-20",
  });
  const invalidClosure = closure({
    startDate: "2026-09-01",
    endDate: "2026-09-01",
    hours: [{ open: "22:00", close: "20:00" }],
  });

  it("does NOT block when closures are unchanged, even with a past one present", () => {
    // The regression: editing something else (suggestion, phone) must save while an elapsed special
    // date sits untouched in the editor — it never reaches the payload, so it can't block.
    expect(closureSaveError([pastClosure], tz, false, now)).toBeNull();
    expect(closureSaveError([invalidClosure], tz, false, now)).toBeNull();
  });

  it("blocks a past closure only when the closures section is being sent", () => {
    expect(closureSaveError([pastClosure], tz, true, now)).toBe("past");
  });

  it("blocks an invalid window when the closures section is being sent", () => {
    expect(closureSaveError([invalidClosure], tz, true, now)).toBe("hours");
  });

  it("passes valid, upcoming closures that are being sent", () => {
    const upcoming = closure({
      startDate: "2026-09-01",
      endDate: "2026-09-01",
      hours: [{ open: "09:00", close: "17:00" }],
    });
    expect(closureSaveError([upcoming], tz, true, now)).toBeNull();
  });
});
