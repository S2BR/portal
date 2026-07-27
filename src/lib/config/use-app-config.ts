"use client";

import { useEffect, useState } from "react";

import type { AppConfig } from "@/lib/api/types";

let cached: AppConfig | null = null;
let inflight: Promise<AppConfig> | null = null;

function loadConfig(): Promise<AppConfig> {
  if (cached) {
    return Promise.resolve(cached);
  }
  inflight ??= fetch("/api/app/config")
    .then((response) => response.json() as Promise<AppConfig>)
    .then((config) => {
      cached = config;
      return config;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });
  return inflight;
}

/**
 * The portal's public app config, loaded once and shared across the session
 * (through the BFF `/api/app/config`). Returns `null` until it resolves.
 */
export function useAppConfig(): AppConfig | null {
  const [config, setConfig] = useState<AppConfig | null>(cached);

  useEffect(() => {
    if (config) {
      return;
    }
    let active = true;
    // Load once on mount; setState only runs after the async response resolves.
    loadConfig()
      .then((loaded) => {
        if (active) {
          setConfig(loaded);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [config]);

  return config;
}

/** Convenience: the emailed-OTP digit count, defaulting to 6 while config loads. */
export function useOtpLength(): number {
  return useAppConfig()?.otp.length ?? 6;
}
