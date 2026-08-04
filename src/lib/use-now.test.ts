import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useNow } from "./use-now";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useNow", () => {
  it("advances the returned date on each interval", () => {
    const { result } = renderHook(() => useNow(30_000));
    const first = result.current.getTime();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.getTime()).toBeGreaterThan(first);
  });

  it("stops ticking when the tab is hidden and resumes when visible", () => {
    const { result } = renderHook(() => useNow(30_000));

    // Hide the tab → the timer is cleared, so the value stops moving.
    act(() => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const whileHidden = result.current.getTime();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.getTime()).toBe(whileHidden);

    // Become visible again → it catches up immediately.
    act(() => {
      vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      vi.advanceTimersByTime(1); // let the clock move so "now" is strictly later
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.getTime()).toBeGreaterThan(whileHidden);
  });

  it("cleans up its timer on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
