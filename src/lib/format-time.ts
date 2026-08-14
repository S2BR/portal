/**
 * Pure time-of-day helpers, framework-free so they can be called from both Server and Client
 * Components. (The interactive time pickers live in `components/business/time-ranges.tsx`, a
 * `"use client"` module — a Server Component can render client components but can't *call* a function
 * exported from one, so these formatters must live outside that boundary.)
 */

/** "HH:MM" → the viewer's localized time label (e.g. "9:00 AM" or "09:00"). */
export function formatTime(value: string, locale: string): string {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour ?? 0, minute ?? 0));
}

/** One hour after "HH:MM", wrapping at midnight — the default end for a freshly added range. */
export function oneHourLater(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  const next = ((hour ?? 0) + 1) % 24;
  return `${String(next).padStart(2, "0")}:${String(minute ?? 0).padStart(2, "0")}`;
}
