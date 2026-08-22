import { describe, expect, it } from "vitest";

import { computeOpenState, SLOT_SECONDS } from "./business-hours";

/** Build a contiguous run of slots covering [openEpoch, closeEpoch). */
function run(openEpoch: number, closeEpoch: number): number[] {
  const first = Math.floor(openEpoch / SLOT_SECONDS);
  const last = Math.ceil(closeEpoch / SLOT_SECONDS); // exclusive
  return Array.from({ length: last - first }, (_, i) => first + i);
}

describe("computeOpenState", () => {
  // A fixed reference "now" — 2026-01-05 12:00:00 UTC.
  const now = new Date("2026-01-05T12:00:00Z");
  const nowSec = Math.floor(now.getTime() / 1000);

  it("is open, with the close time, when now falls inside a run", () => {
    const slots = run(nowSec - 3 * 3600, nowSec + 3 * 3600); // 09:00–15:00
    const state = computeOpenState(slots, now);
    expect(state.status).toBe("open");
    expect(state.changeAt).toBe(nowSec + 3 * 3600);
  });

  it("is closing_soon when the close is within the soon window", () => {
    const slots = run(nowSec - 3 * 3600, nowSec + 30 * 60); // closes in 30 min
    expect(computeOpenState(slots, now).status).toBe("closing_soon");
  });

  it("is opening_soon when the next open is within the soon window", () => {
    const slots = run(nowSec + 20 * 60, nowSec + 3 * 3600); // opens in 20 min
    const state = computeOpenState(slots, now);
    expect(state.status).toBe("opening_soon");
    expect(state.changeAt).toBe(
      Math.floor((nowSec + 20 * 60) / SLOT_SECONDS) * SLOT_SECONDS,
    );
  });

  it("is closed, pointing at the next opening, when that is far off", () => {
    const slots = run(nowSec + 6 * 3600, nowSec + 9 * 3600); // opens in 6h
    const state = computeOpenState(slots, now);
    expect(state.status).toBe("closed");
    expect(state.changeAt).toBe(
      Math.floor((nowSec + 6 * 3600) / SLOT_SECONDS) * SLOT_SECONDS,
    );
  });

  it("is closed with no changeAt when nothing remains in the window", () => {
    const slots = run(nowSec - 6 * 3600, nowSec - 3 * 3600); // all in the past
    expect(computeOpenState(slots, now)).toEqual({
      status: "closed",
      changeAt: null,
    });
  });

  it("closes at the end of the CURRENT run, not a later split run", () => {
    const morning = run(nowSec - 3 * 3600, nowSec + 2 * 3600); // 09:00–14:00 (now inside)
    const evening = run(nowSec + 5 * 3600, nowSec + 8 * 3600); // 17:00–20:00 (later)
    const state = computeOpenState([...morning, ...evening], now);
    expect(state.status).toBe("open");
    expect(state.changeAt).toBe(nowSec + 2 * 3600);
  });

  it("treats an empty slot set as closed", () => {
    expect(computeOpenState([], now)).toEqual({
      status: "closed",
      changeAt: null,
    });
  });
});
