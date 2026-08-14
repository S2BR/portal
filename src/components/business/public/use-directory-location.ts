"use client";

import { useCallback, useEffect, useState } from "react";

import type { EdgeLocation } from "@/lib/edge-location";

export type LocationSource = "gps" | "ip";
export type LocationStatus =
  | "idle"
  | "locating"
  | "located"
  | "denied"
  | "unavailable";

export interface DirectoryLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
}

/**
 * Resolve the visitor's location for the directory's "near me" sort. Asks the browser for precise
 * location (the permission prompt / a user-gesture retry); if that's denied, errors, or times out, it
 * falls back to the approximate IP location the server passed in — and when there's no fallback either
 * (e.g. localhost), it reports a `denied`/`unavailable` status so the UI can explain instead of
 * silently doing nothing. Turning near-me off stops it until the visitor asks again.
 */
export function useDirectoryLocation(ipLocation: EdgeLocation | null) {
  const [location, setLocation] = useState<DirectoryLocation | null>(null);
  // Starts "locating" because the first attempt runs on mount; the async callbacks below resolve it.
  const [status, setStatus] = useState<LocationStatus>("locating");
  // Bumped to (re)run the resolve; starts at 1 so it runs once on mount.
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    if (attempt === 0) {
      return;
    }
    let active = true;

    // On a geolocation failure: use the IP location if we have one, otherwise surface why it failed.
    const onFailure = (reason: "denied" | "unavailable") => {
      if (!active) {
        return;
      }
      if (ipLocation) {
        setLocation({ ...ipLocation, source: "ip" });
        setStatus("located");
      } else {
        setStatus(reason);
      }
    };

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onFailure("unavailable");
      return;
    }

    const onPosition = (position: GeolocationPosition) => {
      if (active) {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "gps",
        });
        setStatus("located");
      }
    };

    const onError = (error: GeolocationPositionError, allowRetry: boolean) => {
      if (!active) {
        return;
      }
      // Surface the exact reason — "denied" means the permission was refused, "unavailable" means the
      // browser accepted the permission but couldn't get a fix (on macOS, usually system Location
      // Services being off, or a slow Wi-Fi position). Logged so we can diagnose real-device failures.
      console.warn(
        `[near-me] geolocation error code=${error.code} message=${error.message}`,
      );
      // A timeout/position-unavailable can be transient (desktop Wi-Fi fixes are slow) — retry once
      // with a longer, low-accuracy attempt before giving up.
      if (allowRetry && error.code !== error.PERMISSION_DENIED) {
        navigator.geolocation.getCurrentPosition(
          onPosition,
          (retryError) => onError(retryError, false),
          { timeout: 20000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false },
        );
        return;
      }
      onFailure(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
    };

    navigator.geolocation.getCurrentPosition(
      onPosition,
      (error) => onError(error, true),
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );

    return () => {
      active = false;
    };
  }, [ipLocation, attempt]);

  const turnOff = useCallback(() => {
    setAttempt(0);
    setLocation(null);
    setStatus("idle");
  }, []);

  const enable = useCallback(() => {
    setStatus("locating");
    setAttempt((value) => value + 1);
  }, []);

  return { location, status, turnOff, enable };
}
