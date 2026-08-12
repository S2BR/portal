import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The Toaster mounts outside the intl provider in the app; here we just stub translations to keys.
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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

describe("ServiceUnavailable", () => {
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

  it("fires the first retry only after the first backoff step (10s)", () => {
    const onRetry = vi.fn();
    render(<ServiceUnavailable onRetry={onRetry} />);

    tick(9);
    expect(onRetry).not.toHaveBeenCalled();
    tick(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("auto-retries over time, then a manual retry restarts the cycle", () => {
    const onRetry = vi.fn();
    render(<ServiceUnavailable onRetry={onRetry} />);

    // Through the first three steps: retries fire, but the schedule isn't exhausted → no manual button.
    tick(BACKOFF_SECONDS[0]! + BACKOFF_SECONDS[1]! + BACKOFF_SECONDS[2]!);
    expect(onRetry.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByRole("button", { name: "retry" })).toBeNull();

    // Walk the remaining steps to exhaust the schedule → a manual "Try again" appears.
    for (const step of BACKOFF_SECONDS.slice(3)) {
      tick(step);
    }
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
