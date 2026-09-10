"use client";

import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type {
  BusinessClosure,
  BusinessOpeningHour,
} from "@/app/api/businesses/route";
import { DAYS } from "@/components/business/business-constants";
import { OpenStatusBadge } from "@/components/business/public/open-status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

/** How many days ahead (including today) to surface upcoming special dates for. */
const SPECIAL_LOOKAHEAD_DAYS = 7;

/** An upcoming special date, resolved to a concrete calendar day in the business's zone. */
type SpecialDay = {
  iso: string;
  /** Relative or short-date label ("Today", "Tomorrow", "Wed, Sep 16"). */
  label: string;
  name: string | null;
  /** Formatted open windows; empty ⇒ closed all day. */
  windows: string[];
  isToday: boolean;
};

/**
 * The open-status "time" as a trigger: shows the live "Open · Closes 5:00 PM" badge below the name,
 * and opens the full weekly hours in a dialog when tapped (over a light blur scrim, like the locale
 * menu). Today's row is highlighted, the dialog header repeats the live status, and any special dates
 * in the coming week (holiday hours, one-off late nights) surface in their own section below.
 */
export function HoursDisclosure({
  openSlots,
  timezone,
  openingHours,
  closures,
}: {
  openSlots: number[];
  timezone: string | null;
  openingHours: BusinessOpeningHour[];
  closures: BusinessClosure[];
}) {
  const t = useTranslations("businesses.public");
  const days = useTranslations("businesses.detail.days");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  // Today's weekday + upcoming special dates, resolved in the BUSINESS's zone (client-only, to avoid
  // an SSR/now mismatch). `today` is the lowercased weekday; `special` is the coming week's overrides.
  const [today, setToday] = useState<string | null>(null);
  const [special, setSpecial] = useState<SpecialDay[]>([]);

  useEffect(() => {
    // Deferred (client-only) so there's no SSR/now hydration mismatch.
    const frame = requestAnimationFrame(() => {
      const zone = timezone ?? undefined;
      const now = new Date();

      setToday(
        new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long" })
          .format(now)
          .toLowerCase(),
      );

      // The calendar day "keys" (YYYY-MM-DD, in the business's zone) for today and tomorrow, so a
      // special date can read "Today"/"Tomorrow" instead of a bare weekday.
      const dayKey = new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const todayIso = dayKey.format(now);
      // Anchor at noon UTC so adding whole days never trips over a DST hour and slips a date.
      const anchor = new Date(`${todayIso}T12:00:00Z`);

      // Current minutes-since-midnight in the business's zone, to tell whether today's special hours
      // are still ahead/ongoing or already over.
      const [hour = 0, minute = 0] = new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      })
        .format(now)
        .split(":")
        .map(Number);
      const nowMinutes = (hour % 24) * 60 + minute;

      const upcoming: SpecialDay[] = [];
      for (let offset = 0; offset < SPECIAL_LOOKAHEAD_DAYS; offset++) {
        const date = new Date(anchor.getTime() + offset * 86_400_000);
        const iso = date.toISOString().slice(0, 10);
        const closure = closures.find((entry) => closureCovers(entry, iso));
        if (!closure) {
          continue;
        }
        // Today with special OPEN hours all in the past is no longer "today's special" — drop it so the
        // badge falls back to the normal "opens tomorrow". A closed-all-day today stays (still relevant).
        if (
          offset === 0 &&
          closure.hours.length > 0 &&
          !closure.hours.some((window) => windowEndMinutes(window) > nowMinutes)
        ) {
          continue;
        }
        upcoming.push({
          iso,
          label:
            offset === 0
              ? t("today")
              : offset === 1
                ? t("tomorrow")
                : new Intl.DateTimeFormat(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  }).format(date),
          name: closure.name,
          windows: closure.hours.map(
            (window) =>
              `${formatTime(window.open, locale)} – ${formatTime(window.close, locale)}`,
          ),
          isToday: offset === 0,
        });
      }
      setSpecial(upcoming);
    });
    return () => cancelAnimationFrame(frame);
  }, [timezone, closures, locale, t]);

  const todayIsSpecial = special.some((entry) => entry.isToday);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openingHours")}
        className="hover:bg-muted/60 focus-visible:ring-ring -mx-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-1.5 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <OpenStatusBadge slots={openSlots} timezone={timezone} />
        {todayIsSpecial ? (
          <span className="text-brand-green-deep dark:text-brand-green inline-flex items-center gap-1 text-sm font-medium">
            <Sparkles className="size-3.5" aria-hidden />
            {t("specialToday")}
          </span>
        ) : null}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          overlayClassName="bg-black/10 backdrop-blur-[3px]"
          className="shadow-xl ring-0 sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{t("openingHours")}</DialogTitle>
            {/* Repeat the live status under the title as the dialog's description. */}
            <DialogDescription asChild>
              <span>
                <OpenStatusBadge slots={openSlots} timezone={timezone} />
              </span>
            </DialogDescription>
          </DialogHeader>
          <ul className="mt-1 text-sm tabular-nums">
            {DAYS.map((day) => {
              // A day can have several windows (e.g. a split for a late opening) — show them all,
              // ordered, each on its own line; not just the first.
              const windows = openingHours
                .filter((hour) => hour.day_of_week === day)
                .slice()
                .sort((a, b) =>
                  (a.open_time ?? "").localeCompare(b.open_time ?? ""),
                )
                .flatMap((hour) =>
                  !hour.closed_all_day && hour.open_time && hour.close_time
                    ? [
                        `${formatTime(hour.open_time, locale)} – ${formatTime(hour.close_time, locale)}`,
                      ]
                    : [],
                );
              const isToday = day === today;
              return (
                <li
                  key={day}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "-mx-2 flex items-center justify-between gap-8 rounded-md px-3 py-2",
                    isToday && "bg-muted text-foreground font-semibold",
                  )}
                >
                  <span className={cn(!isToday && "text-muted-foreground")}>
                    {days(day)}
                  </span>
                  {windows.length > 0 ? (
                    <span className="flex flex-col items-end gap-0.5 text-right">
                      {windows.map((window) => (
                        <span key={window}>{window}</span>
                      ))}
                    </span>
                  ) : (
                    <span className="opacity-60">{t("closed")}</span>
                  )}
                </li>
              );
            })}
          </ul>

          {special.length > 0 ? (
            <div className="border-border/60 mt-1 border-t pt-4">
              <p className="text-brand-green-deep dark:text-brand-green mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="size-3.5" aria-hidden />
                {t("specialThisWeek")}
              </p>
              <ul className="space-y-1.5 text-sm tabular-nums">
                {special.map((entry) => (
                  <li
                    key={entry.iso}
                    className="border-brand-green/70 bg-brand-green/5 flex items-center justify-between gap-8 rounded-md border-s-2 px-3 py-2"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{entry.label}</span>
                      {entry.name ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {entry.name}
                        </span>
                      ) : null}
                    </span>
                    {entry.windows.length > 0 ? (
                      <span className="flex flex-col items-end gap-0.5 text-right">
                        {entry.windows.map((window) => (
                          <span key={window}>{window}</span>
                        ))}
                      </span>
                    ) : (
                      <span className="opacity-60">{t("closed")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A window's closing time as minutes since midnight, extended past 1440 for an overnight span. */
function windowEndMinutes(window: { open: string; close: string }): number {
  const toMinutes = (time: string) => {
    const [hour = 0, minute = 0] = time.split(":").map(Number);
    return hour * 60 + minute;
  };
  const start = toMinutes(window.open);
  const end = toMinutes(window.close);
  return end <= start ? end + 1440 : end; // runs past midnight into the next day
}

/**
 * Whether a special date covers the given local calendar day (YYYY-MM-DD). Non-recurring ones match
 * the inclusive [start, end] range; recurring ones match by month+day (ignoring year), including a
 * range that wraps the year end (e.g. Dec 30 → Jan 2). Mirrors the API's `OpenNow::closureCovers`.
 */
function closureCovers(closure: BusinessClosure, iso: string): boolean {
  if (!closure.is_recurring) {
    return iso >= closure.start_date && iso <= closure.end_date;
  }
  const monthDay = (value: string) => value.slice(5); // "MM-DD"
  const day = monthDay(iso);
  const start = monthDay(closure.start_date);
  const end = monthDay(closure.end_date);
  return start <= end ? day >= start && day <= end : day >= start || day <= end; // wraps the year end
}
