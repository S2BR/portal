import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Toaster mounts outside the intl provider in the app; here we just stub translations to keys.
// Interpolation params are appended so the test can read the live "attempt X of Y" values.
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>): string =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

import {
  BACKOFF_SECONDS,
  ServiceUnavailable,
  formatDuration,
} from "./service-unavailable";

describe("formatDuration", () => {
  it("renders compact durations", () => {
    expect(formatDuration(10)).toBe("10s");
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(150)).toBe("2m 30s");
    expect(formatDuration(2700)).toBe("45m");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(7200)).toBe("2h");
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("BACKOFF_SECONDS", () => {
  it("is a strictly increasing 12-step schedule starting at 10s", () => {
    expect(BACKOFF_SECONDS).toHaveLength(12);
    expect(BACKOFF_SECONDS[0]).toBe(10);
    for (let i = 1; i < BACKOFF_SECONDS.length; i += 1) {
      expect(BACKOFF_SECONDS[i]!).toBeGreaterThan(BACKOFF_SECONDS[i - 1]!);
    }
  });
});

describe("ServiceUnavailable", () => {
  // A short schedule so the state machine is exercised in a handful of ticks — the real durations
  // (BACKOFF_SECONDS) are data, asserted above; here we only care about the step/exhaust/reset logic.
  // Walking the real 18,000s schedule second-by-second was slow enough to flake under load.
  const SCHEDULE = [2, 3, 4, 5] as const;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * Advance fake time in 1s steps. Each step must flush React effects (via `act`) because the
   * cooldown arms its *next* 1s timeout from an effect — a single big `advanceTimersByTime` would
   * only fire one tick.
   */
  function tick(seconds: number) {
    for (let i = 0; i < seconds; i += 1) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
  }

  it("fires the first retry only after the first backoff step", () => {
    const onRetry = vi.fn();
    render(<ServiceUnavailable onRetry={onRetry} schedule={SCHEDULE} />);

    tick(SCHEDULE[0] - 1);
    expect(onRetry).not.toHaveBeenCalled();
    tick(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("advances exactly one attempt per step, even with an unstable onRetry", () => {
    // The real parent (business-workspace) passes a fresh onRetry identity every render AND re-renders
    // when it fires. A stale useCooldown double-fired the elapsed callback under those conditions, so
    // the counter skipped even attempts: 1 of N → 3 of N → 5 of N. It must step 1 → 2 → 3.
    const onRetry = vi.fn();

    function Harness() {
      const [, force] = useState(0);
      return (
        <ServiceUnavailable
          schedule={SCHEDULE}
          onRetry={() => {
            onRetry();
            force((value) => value + 1);
          }}
        />
      );
    }

    render(<Harness />);
    expect(screen.getByText(/attempt:.*"current":1,/)).toBeInTheDocument();

    tick(SCHEDULE[0]);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/attempt:.*"current":2,/)).toBeInTheDocument();

    tick(SCHEDULE[1]);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/attempt:.*"current":3,/)).toBeInTheDocument();

    tick(SCHEDULE[2]);
    expect(onRetry).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/attempt:.*"current":4,/)).toBeInTheDocument();
  });

  it("auto-retries over time, then a manual retry restarts the cycle", () => {
    const onRetry = vi.fn();
    render(<ServiceUnavailable onRetry={onRetry} schedule={SCHEDULE} />);

    // Through all but the last step: retries fire, but the schedule isn't exhausted → no manual button.
    for (const step of SCHEDULE.slice(0, -1)) {
      tick(step);
    }
    expect(onRetry.mock.calls.length).toBe(SCHEDULE.length - 1);
    expect(screen.queryByRole("button", { name: "retry" })).toBeNull();

    // Walk the final step to exhaust the schedule → a manual "Try again" appears.
    tick(SCHEDULE[SCHEDULE.length - 1]!);
    const button = screen.getByRole("button", { name: "retry" });
    const before = onRetry.mock.calls.length;

    // Tapping it retries and restarts the cycle (exhausted state cleared → button gone).
    act(() => {
      button.click();
    });
    expect(onRetry.mock.calls.length).toBeGreaterThan(before);
    expect(screen.queryByRole("button", { name: "retry" })).toBeNull();
  });
});
