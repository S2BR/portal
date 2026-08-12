import { useEffect, useRef, useState } from "react";

/**
 * Ticks a countdown from `seconds` down to 0 (one timeout re-armed each second, the pattern used for
 * the sign-in resend cooldown). Restarts if `seconds` changes, and calls `onElapsed` exactly once when
 * it reaches 0 — pass a STABLE callback (e.g. a `useCallback`) so it isn't restarted on every render.
 * Shared by the rate-limit countdown and the service-unavailable backoff.
 */
export function useCooldown(seconds: number, onElapsed?: () => void): number {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  // A new wait resets the countdown and re-arms the one-shot elapsed callback.
  useEffect(() => {
    firedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting the timer for a new duration
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onElapsed?.();
      }
      return;
    }
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining, onElapsed]);

  return remaining;
}
