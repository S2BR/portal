import { useEffect, useRef, useState } from "react";

/**
 * Ticks a countdown from `seconds` down to 0 (one timeout re-armed each second, the pattern used for
 * the sign-in resend cooldown). Restarts if `seconds` changes, and calls `onElapsed` exactly once when
 * it reaches 0. The callback is held in a ref, so an unstable identity (e.g. an inline closure that the
 * parent recreates every render) neither restarts the timer nor double-fires the elapsed callback.
 * Shared by the rate-limit countdown and the service-unavailable backoff.
 */
export function useCooldown(seconds: number, onElapsed?: () => void): number {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);
  const onElapsedRef = useRef(onElapsed);

  // Keep the latest callback without letting its identity drive the countdown effect below. Otherwise a
  // parent that recreates the callback on the re-render triggered by the elapse would re-run that effect
  // while `remaining` is still 0 and fire it a second time.
  useEffect(() => {
    onElapsedRef.current = onElapsed;
  });

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
        onElapsedRef.current?.();
      }
      return;
    }
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return remaining;
}
