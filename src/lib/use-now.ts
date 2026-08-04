"use client";

import { useEffect, useState } from "react";

/**
 * A `Date` that advances on an interval so relative-time labels ("2 minutes ago") tick live.
 * One timer no matter how many values read it, and it pauses while the tab is hidden so a
 * backgrounded tab does zero work (re-syncing the moment it becomes visible again).
 *
 * `intervalMs` defaults to 30s — ample for minute-granularity labels; a per-second timer is
 * never needed for things like session activity.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(new Date());
    const start = () => {
      timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tick(); // catch up on the time missed while hidden
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") {
      start();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [intervalMs]);

  return now;
}
